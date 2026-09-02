---
title: "The Day My Agent Lost Its Memory: A Pi Session-Loss Postmortem"
titleZh: "当 Agent 失忆的那天：Pi 会话丢失事故复盘"
date: 2026-09-02 18:30:00
tags: [ai, agent, pi, postmortem, ops, reliability]
---

<div class="lang-section" data-lang="en">

A few days ago my local coding agent `pi` stopped starting, and fixing that revealed something worse: the entire `~/.pi/agent/sessions/` directory was gone — every conversation, including one with nearly five million tokens of context. This post is the short version of what happened and what it taught me about local agents.

> **Update (2026-09-02): the real root cause was found — and it is worse than npm.** The morning after I published this, the exact same thing happened again. This time the dig went to the bottom: the deletion was **my own code**. An agent-written test-teardown in my `pi-my-web` wrapper recursively `rmSync`d `~/.pi/agent/sessions/` — and most of `~/.pi/agent` — while a live agent session was writing into it. The "npm update" story below was the smoke, not the fire. Details in the new section below.

## What happened

`pi update` broke the install: the npm dependency tree at `~/.pi/agent/npm` had been rewritten to contain only extensions, dropping the core package. Reinstalling fixed the CLI — and then the session was gone:

```
Extension "<runtime>" error: ENOENT: no such file or directory, open
'/Users/adl/.pi/agent/sessions/--Users-adl-pi-my-web--/2026-08-31T09-39-00-277Z_01a0572f-...jsonl'
```

At the time I blamed `npm install <extension> --prefix ~/.pi/agent/npm`: an in-place reify that removes everything not in the current manifest — including the `sessions/` directory, `auth.json`, and `models-store.json`, which share the parent directory with the npm prefix. A package manager cannot tell "extra package" from "unrelated data directory". *(This diagnosis was later overturned — see the update below.)*

The obvious recovery paths all failed. `/export` defaults to HTML and refuses to run when the JSONL file no longer exists on disk; `/import` needs a source JSONL; the hermes memory index predated the lost session. The only things I salvaged were a 1.6 GB hermes database and the pi-web log, recovered from file descriptors still held open by long-running processes (`lldb` attached to the live process, byte-for-byte copy — a macOS trick that works only because I did not kill anything). The session itself was "recovered" by manually copying visible terminal output into a new file and continuing in a fresh process. A workaround, not a recovery.

## Update (2026-09-02): the real root cause was my own test code

The morning after I published this post, it happened again: every session in the web UI came back `ENOENT: open '.../sessions/--Users-adl-pi-my-web--/<uuid>.jsonl'`, and `~/.pi/agent/sessions/` was empty for *every* project. This time I went after the cause instead of the symptoms, armed with the one surviving artifact — the terminal log of the session that died.

The log showed an agent (working inside my `pi-my-web` wrapper on a "don't create empty session files" feature) run `cd server && npm test` — all tests green — and then, on its very next write, hit `ENOENT` twice and spin forever. It had deleted **its own session file while it was still talking to me**.

The culprit was a teardown helper in a brand-new unit test, `server/src/sessions/create.test.ts`:

```ts
function cleanup(sessionPath: string | undefined, cwd: string): void {
  if (sessionPath && existsSync(sessionPath)) rmSync(sessionPath, { force: true });
  if (sessionPath) {
    let dir = dirname(sessionPath);
    for (let i = 0; i < 3 && existsSync(dir) && dir !== dirname(dir); i++) {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch {
        break;
      }
      dir = dirname(dir);
    }
  }
  rmSync(cwd, { recursive: true, force: true });
}
```

It is a "clean up after the test" function that walks **up** the tree three levels, recursively deleting each. Sessions live at `~/.pi/agent/sessions/<cwd-encoded>/`, and the test ran with a throwaway `tmpdir` cwd — so the SDK created its session directory inside the *real* sessions root. When `cleanup()` ran, level 0 removed the test's own folder, level 1 removed `~/.pi/agent/sessions/` — every project's history, including the live agent's file — and level 2 removed `~/.pi/agent` itself: the npm install, `auth.json`, `models-store.json`. Recursive delete, `force: true`, inside a `finally`, with no guard and no confirmation.

Everything in the original post now reads as **downstream damage of that one `rmSync`**:

- The "npm tree rewritten to contain only extensions" was pi's self-repair after the wipe — it re-created `~/.pi/agent/npm` and reinstalled only what was in the manifest. Two extensions had been saved with `--save`; the core package had been installed `--no-save`, so it was never restored. That is why the "core package was dropped", and why reinstalling it "fixed" the CLI while the real damage sat elsewhere.
- `auth.json` and `models-store.json` vanishing was not a package-manager quirk — they lived inside the directory that got recursively deleted.
- "The whole sessions directory was gone" was literal: `rmSync('~/.pi/agent/sessions', { recursive: true })`.

And here is the part that should scare anyone running a local agent: the code that did this was **written by an agent**, in the most innocent-looking place on earth — a unit test's teardown — and it was executed by another agent running `npm test` as a routine step of its own work. Nobody asked. Nobody previewed the `rm -rf`. And the victim was the agent itself, mid-conversation. Destructive cleanup code sat one bad edit away from my entire agent history, and nothing in the local toolchain treats a recursive delete inside a `finally` block as worth even a confirmation.

I fixed the teardown to delete only the single cwd-encoded directory, re-ran the suite, and the sessions survived. But the fix is not the lesson. The lesson is that **for local agents, destructive power lives where you least expect it** — in generated code, in test scaffolding, in a helper the model wrote to be tidy — and it runs with exactly the same privileges as the agent that trusts it. (The full forensic trail is preserved in qoder session `dbb63846-b4b6-4e1f-882e-d4f7e32942c7`.)

## The uncomfortable truth: local agents are unreliable by construction

The lesson is not about npm flags. It is that a local agent treats my work history as a local side effect: a directory that happens to share a parent with a package manager, auth in two files a reify can empty, a conversation with no durable copy anywhere else. Nothing about this is recoverable by design. Code is versioned because we learned it can be lost; agent sessions are not, and this incident is what that costs.

Periodic backups are the right habit — the minimum viable ops layer, and I now run one for `~/.pi/agent/sessions/`. But backups are a crutch: they lag behind the live session, miss the in-memory tail, and a restore is still an incident. Local development ends up requiring its own special ops, which is a sign the design is wrong, not that the operator should try harder.

## The durable answer: server-side session storage

If a conversation is valuable enough to miss when it vanishes, it should not live only on the machine that can lose it. The session log should be an event stream written to a service-side store as the conversation happens — messages, tool calls, file versions, branch points — with the local CLI as a thin client that reads and renders. Then `pi update` breaks the client, not the data; `rm -rf` cannot erase history; retrieval indexes can be rebuilt from the event stream instead of being the only surviving copy; and forking or resuming across machines becomes a read against a durable log.

This is a large design change for a local-first tool. But the direction is clear: **durability should be owned by the provider or the product, because the local machine has already proven it cannot be trusted with it.** A backup habit papers over the design; server-side storage is the design. My hope is that the next version of the agent makes this post's recovery story as obsolete as floppy-disk recovery guides.

</div>

<div class="lang-section" data-lang="zh">

前几天，我本地的编码 Agent `pi` 突然启动不了，而修好它之后发现了更糟的事：整个 `~/.pi/agent/sessions/` 目录都没了——所有会话一起消失，包括一个上下文接近 500 万 token 的会话。这篇是精简版复盘：发生了什么，以及它教会了我关于本机 Agent 的什么。

> **更新（2026-09-02）：真正的根因找到了——而且比 npm 更糟。** 文章发布的第二天早上，同样的事又发生了一次。这次一路挖到了底：删数据的**是我自己的代码**。我在 `pi-my-web` 包装层里由 agent 写的一个测试 teardown，在某个 agent 会话正往里面写盘时，递归 `rmSync` 掉了 `~/.pi/agent/sessions/`——顺带清掉了 `~/.pi/agent` 的大半。下面那个「npm update」的故事是烟，不是火。详见下方新章节。

## 发生了什么

`pi update` 把安装弄坏了：`~/.pi/agent/npm` 的依赖树被重写成只剩扩展，核心包被整个丢弃。重装之后 CLI 恢复正常——然后发现会话没了：

```
Extension "<runtime>" error: ENOENT: no such file or directory, open
'/Users/adl/.pi/agent/sessions/--Users-adl-pi-my-web--/2026-08-31T09-39-00-277Z_01a0572f-...jsonl'
```

当时我把根因归到 `npm install <扩展> --prefix ~/.pi/agent/npm`：原地 reify 会把「不在当前 manifest 里」的东西全部移除——包括与 npm prefix 共享父目录的 `sessions/`、`auth.json`、`models-store.json`。包管理器分不清「多余的包」和「无关的数据目录」。*（这个诊断后来被推翻了——见下方更新。）*

显而易见的恢复路径全部失败。`/export` 默认产出 HTML，且当 JSONL 文件已不存在时拒绝执行；`/import` 需要一份源 JSONL；hermes 记忆索引早于丢失的会话。唯一救回来的是 1.6 GB 的 hermes 库和 pi-web 日志——从仍被长驻进程打开着的文件描述符里拷出来的（`lldb` 挂到活进程上逐字节拷贝，这个 macOS 技巧之所以能用，只因为我们什么都没杀）。会话本身只能靠「手动复制终端可见输出到新文件，再起一个新进程继续」。那是 workaround，不是恢复。

## 更新（2026-09-02）：真正的根因是我自己的测试代码

文章发布后的第二天早上，同样的事又发生了：网页 UI 里每个会话都报 `ENOENT: open '.../sessions/--Users-adl-pi-my-web--/<uuid>.jsonl'`，`~/.pi/agent/sessions/` 里**所有项目**的会话目录都空了。这次我不再围着症状转，而是拿着唯一幸存的物证——那个死掉会话的终端日志——一路挖到根因。

日志显示：一个 agent（在我自己写的 `pi-my-web` 包装层里做「新建会话不再立即落盘」的功能）跑了 `cd server && npm test`——全部测试通过——然后在它下一次写盘时连续两次 ENOENT，转圈卡死。它删掉了**正在跟我对话的它自己的会话文件**。

凶手是新建单元测试 `server/src/sessions/create.test.ts` 里的清理函数（代码见英文版）：一个「测试完清理现场」的函数，却往上走三层、每层递归删除。会话存放在 `~/.pi/agent/sessions/<按 cwd 编码>/`，而测试用的是 `tmpdir` 临时目录——于是 SDK 把会话目录建在了**真实的** sessions 根目录里。`cleanup()` 一跑：第 0 层删掉测试自己的目录，第 1 层删掉 `~/.pi/agent/sessions/`——所有项目的历史、连同正在运行的那个 agent 的文件——第 2 层删掉 `~/.pi/agent` 本身：npm 安装、`auth.json`、`models-store.json`。递归删除、`force: true`、写在 `finally` 里、没有任何护栏、也没有任何确认。

原帖里的每个症状，现在看都是那一次 `rmSync` 的**下游损坏**：

- 「npm 依赖树只剩扩展」是 pi 被清空后的自我修复：它重建了 `~/.pi/agent/npm`，只装回 manifest 里的东西。两个扩展当初是 `--save` 装的；核心包是 `--no-save` 装的，从此再没被装回来——这就是「核心包被丢弃」、重装 CLI 就好、而真正的伤在别处的原因。
- `auth.json` 和 `models-store.json` 消失不是包管理器的怪癖——它们就在被递归删除的那个目录里。
- 「整个会话目录没了」是字面意义的：`rmSync('~/.pi/agent/sessions', { recursive: true })`。

而最该让所有本机 agent 用户后背发凉的部分：干这事的代码是 **agent 写的**，出现在全世界最人畜无害的地方——单元测试的 teardown——然后被另一个 agent 当作自己工作的例行步骤 `npm test` 执行了。没人问过、没人预览过这条 `rm -rf`，受害者就是 agent 自己，而且是对话进行到一半。危险的清理代码离「清空我全部 agent 历史」只差一次坏 edit，而本地工具链里没有任何东西会把 `finally` 里的递归删除当回事、值得一次确认。

我把 teardown 改成只删那一个按 cwd 编码的目录，重跑测试，会话安然无恙。但修复不是重点。重点是：**对本机 agent 来说，破坏力藏在最想不到的地方**——生成的代码里、测试脚手架里、模型随手写的「整洁一点」的辅助函数里——而且它和信任它的 agent 拥有完全相同的权限。（完整取证过程留存于 qoder 会话 `dbb63846-b4b6-4e1f-882e-d4f7e32942c7`。）

## 不争的事实：本机 Agent 天生不可靠

教训不在于 npm 的 flags，而在于：本机 Agent 把我的工作历史当成一个本地副作用——一个恰好和包管理器共享父目录的文件夹、两行 reify 就能清空的 auth 文件、一个没有任何异地副本的会话。这一切都不是「按设计可恢复」的。代码有版本管理，是因为我们吃过丢失的亏；Agent 会话没有，这次就是代价。

定期备份是正确的习惯——运维层的最低可行版本，我现在也确实给 `~/.pi/agent/sessions/` 加了一份。但备份是拐杖：它落后于活会话，抓不住内存里的尾巴，恢复仍然是一场事故。本地开发因此需要一套特殊的「运维」，这恰恰说明设计错了，而不是操作者应该更努力。

## 持久答案：服务端会话存储

如果一场对话珍贵到丢失时会心疼，它就不该只活在会弄丢它的那台机器上。会话日志应该作为事件流，在对话发生时实时写入服务端存储——消息、工具调用、文件版本、分支点——本地 CLI 退化成只负责读写渲染的瘦客户端。这样 `pi update` 弄坏的只是客户端，不是数据；`rm -rf` 抹不掉历史；检索索引可以从事件流重建，而不是成为唯一的幸存副本；跨机器 fork、resume 也只是对持久日志的读取。

对 local-first 工具来说这是个大设计变更。但方向很清楚：**持久性应该由提供商或产品来兜底，因为本机已经证明了它扛不住这个责任。** 备份习惯是在给设计打补丁；服务端存储才是设计本身。我希望下一代 Agent 能让这篇文章的恢复故事，变得像软盘恢复指南一样过时。

</div>

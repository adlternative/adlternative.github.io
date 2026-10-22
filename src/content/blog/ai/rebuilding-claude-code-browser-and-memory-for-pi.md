---
title: "I Rebuilt Claude Code's Browser and Memory for Pi"
titleZh: "被封号之后，我给 Pi 重新造了 Claude Code 的浏览器和记忆"
date: 2026-10-22 23:10:00
tags: [ai, agent, pi, chrome, memory, reverse-engineering]
---

<div class="lang-section" data-lang="en">

My Claude account got banned. [Anthropic](https://www.anthropic.com) did not explain, and I am not going to invent a reason on its behalf. But the enthusiasm with which it shuts out users in mainland China is genuinely hard to understand — it stopped looking like a business decision a while ago. What I can say is what happened next: the subscription stopped, and with it stopped the two parts of [Claude Code](https://github.com/anthropics/claude-code) I used every day.

Not the chat. The other two: the Chrome extension that lets the agent actually click around a page, and the auto memory that lets it remember a project between sessions.

Pi already has a healthy plugin ecosystem, and both of these areas are covered. There are several memory extensions, and several browser bridges built on [Playwright](https://playwright.dev) or [MCP](https://modelcontextprotocol.io). I tried a few of each, and none of them was quite what I wanted. The memory plugins mostly stop at store-and-recall, or reach for a database and an embedding pipeline to manage a folder of Markdown. The browser bridges tend to open a browser of their own instead of the Chrome window I am already logged into, and few offer the accessibility-tree plus stable `[ref_X]` workflow that made the original extension pleasant to use.

So I took both apart and rebuilt them for [Pi](https://github.com/earendil-works/pi-coding-agent). They are open source now:

- [`pi-in-chrome`](https://github.com/adlternative/pi-in-chrome) — the browser extension and its bridge
- [`pi-project-memory`](https://github.com/adlternative/pi-project-memory) — project-scoped Markdown memory

Both were reverse-engineered from Claude Code's own artifacts with [REA](https://github.com/morluto/rea).

There is a lens that makes the whole thing legible. Anthropic is an Apple company: a polished walled garden, a login wall, app-store logic, and a quiet confidence about who deserves to hold the device. In the taxonomy popularized by the Chinese streamer [户晨风](https://zh.wikipedia.org/wiki/%E6%88%B7%E6%99%A8%E9%A3%8E), I am an Android person — the kind who unpacks the extension, reimplements the protocol, keeps the files on his own disk, and expects the model endpoint to be his too. This post is what happened when the wall met the screwdriver: two rebuilt projects, and the four places where copying Claude Code does not work.

## Why these two capabilities

Everything in Claude Code looks like a feature. Only some of it is a capability you can lose.

A prompt template is a feature: you can rewrite it. A tool schema is a feature: you can re-declare it. But the Chrome extension and auto memory are **capabilities wired to an account**. The extension needs a `claude.ai` login and OAuth consent, it asks Anthropic's cloud whether a URL is allowed (`url_hash_check`), and its background jobs sit behind remote flags. Auto memory's extraction and its consolidation pass (`auto-dream`) are also flag-gated.

That is why the ban did not degrade my workflow, it amputated it. The code was still on disk. The gates were closed.

## REA: turn a product back into a protocol

Claude Code ships as a Bun-compiled binary. [REA](https://github.com/morluto/rea) (`rea-agents`) is a multi-agent reverse-engineering framework: it maps the artifact, extracts the embedded JavaScript, and runs several analysis agents over different slices, cross-checking each other.

For the memory work I kept the receipts, because "I decompiled it" is not an argument. The installed `claude.exe` was identified by hash, and the `__BUN/__bun` section at file offset `67993600` yielded NUL-delimited UTF-8 sources. That is extraction, not decompilation: no original source is recovered. Of the derived subset, 9 JS files parsed, 0 failed, and several semantic graphs were too large for the result budget. So the picture is **partial by construction**, and I wrote that down instead of pretending otherwise.

The single most important discipline came out of this: **presence is not activation.** A shipped branch can sit behind a remote flag forever. `auto-dream` is gated by `tengu_onyx_plover` before its own `autoDreamEnabled` check; extraction is gated by another flag with a false fallback. If you read the code and conclude "Claude Code does X for every user", you are usually wrong. You have to separate *what shipped* from *what runs for you*.

That distinction is also what makes the rebuild honest: I am not cloning a product, I am re-implementing a protocol and a data layout, then choosing my own defaults.

## pi-in-chrome

The extension turned out to have four layers, in increasing order of interest:

1. **A pairing tunnel.** Claude Code and Chromium talk over a Unix domain socket with AES-GCM encrypted frames.
2. **[A CDP driver](https://chromedevtools.github.io/devtools-protocol/).** Clicks, keys, scrolls and screenshots go through `chrome.debugger`, not synthetic DOM events.
3. **An accessibility index.** Pages are flattened into a screen-reader tree with stable `[ref_X]` identifiers, so the model can point at elements instead of guessing pixel coordinates.
4. **Artificial bottlenecks.** A cloud URL check, a 600×600 confirmation modal that aborts automation after 30 seconds, and a regex censor that rewrites anything matching `/author|auth|token|session/i` into `[BLOCKED]`.

The rebuild keeps 1–3 and deletes 4. `localhost`, intranet hosts and offline apps just work; there is no login, no API key, and no popup. Tool calls stay inside a dedicated `Pi` tab group so personal tabs are untouched, and a 3-second heartbeat plus `chrome.alarms` reconnects the native host instead of dying on the first disconnect.

Then I hit the interesting bug.

### Pitfall 1: `find` insists on calling Haiku

`find` is a natural-language element finder: "the submit button in the second card". Of the whole tool set, it is the only one that needs a model, because someone has to map a sentence onto an accessibility tree.

Claude Code hard-wires that call into the extension's own Anthropic client, using a small fast model ([`claude-3-5-haiku`](https://www.anthropic.com/claude/haiku)). No login or `anthropicApiKey` in `chrome.storage` meant every `find` failed with `Anthropic client not available`. The keyword fallback in the extension was dead code, because the MCP tool context always injects `createAnthropicMessage`.

My first port kept that shape, and it failed exactly the same way. The fix was to invert the ownership: **the host owns the model.**

- Pi advertises `relay_inference: true` when it executes a tool and has a model.
- The extension answers by emitting an `inference_request` notification instead of calling Anthropic.
- Pi runs `ctx.modelRegistry.complete()` with the current session model and returns the sample.
- The reply travels as `{method:"inference_response", params:{request_id, result}}` rather than a new top-level frame type, because the installed native host forwards frames only as `{type:"tool_request", method, params}`.

If Pi has no model, the tool falls back to `read_page` plus refs. The model is optional again.

The design point is not "Haiku is bad". Routing a cheap model for "pick one element" is a sensible cost optimization. The problem is that it also makes *"can I automate my own localhost"* depend on a vendor account. A browser extension should not own a model; the agent it is attached to already has one. Spending a few more tokens is a much better trade than a single point of failure.

### Pitfall 2: the bridge has an owner

The extension does not talk to the browser directly. It talks to a native messaging host, and Claude Code's host binary and extension ID are fixed. Rebuilding means owning the whole chain: a new extension ID, your own native host manifest, your own socket directory, and a packaging step that rebuilds the service worker without Vite's hashed chunks.

There is a subtle failure mode here. Once your extension and Claude Code's extension are both installed, a tool call can be routed back into Claude Code's bridge, and you get a confusing half-working session where some calls are answered by the thing you were trying to escape. The last commit on the project is literally `fix: never route tool calls into Claude Code's bridge by default`.

## pi-project-memory

Memory is a design argument, not a feature. Three agents, three answers:

| | Claude Code | Codex | This plugin |
|---|---|---|---|
| Store | `~/.claude/projects/<project>/memory/` | `~/.codex/memories/` + SQLite | `<agent-dir>/project-memory/<repo>__<hash>/` |
| Layout | `MEMORY.md` index + one file per topic | index, summary, raw memories, rollout summaries | same as Claude Code |
| Scope | Git repository; worktrees share | global rollout consolidation | Git common dir; worktrees share, submodules don't |
| Who writes | model (file tools) or background sub-agent | only the background pipeline | model (file tools) or background pass |
| Search | grep (plus a shipped BM25 index) | literal line matching | local BM25 + optional model pass |
| Consolidation | auto-dream | Phase 2 agent | none |

### Why I followed Claude Code

[Codex](https://github.com/openai/codex)'s pipeline is the more impressive engineering: two phases, SQLite job state, leases, a git baseline for diffs, an internal consolidation agent. It is also a system the model cannot write to, and which needs a database and a worker before a single note exists.

Claude Code's answer is almost embarrassingly simple: memory is Markdown. `MEMORY.md` is an index, every topic is one file, and the model reads and writes them with the `read`/`edit`/`write` tools it already has. No new API to learn, no schema, and a human can open the folder, grep it, or put it in git.

I chose that. It matches how an agent actually corrects itself: the moment it learns something, it edits a file. But I did implement the dedicated memory tools too, opt-in (`list`, `read`, `search`, `save`), because not every session has file tools and search is genuinely convenient. Default is files; tools are a convenience, not the interface.

### Pitfall 3: Pi's storage path is lossy, and so is Claude Code's

Claude Code stores memory at `~/.claude/projects/<slug>/memory/`, where `/Users/adl/foo` becomes `-Users-adl-foo`. Pi stores sessions at `~/.pi/agent/sessions/--<slug>--/`, using this sanitizer:

```ts
const safePath = `--${resolvedCwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
```

Both are **sanitizers, not encoders**. They guarantee a legal single path segment; neither promises uniqueness. So:

```text
/Users/adl/codex    → --Users-adl-codex--
/Users/adl-codex    → --Users-adl-codex--   ← identical
/Users/adl/a/b      → --Users-adl-a-b--
/Users/adl/a-b      → --Users-adl-a-b--     ← identical
```

For session lists this is cosmetic. For memory it is a correctness and privacy bug: two unrelated projects would share one notebook. Copying Claude Code's naming scheme would inherit the same defect.

So the plugin derives identity from the **canonical Git common directory** — `git rev-parse --git-common-dir`, realpath'd, with `GIT_DIR`, `GIT_WORK_TREE` and `GIT_COMMON_DIR` stripped from the environment first, because inherited values silently point at the wrong repo — and hashes it. A readable prefix is kept for humans:

```text
<agent-dir>/project-memory/codex__646b6ecb79c8/
├── MEMORY.md
├── package-manager.md
├── review-process.md
└── .state.json
```

Three entry points into one repository produce one store; a submodule gets its own; a non-Git directory is keyed by its canonical cwd. The known limitation is renaming or moving a repo: the key changes and old notes become orphans, still on disk but no longer found. The hash also dodges long paths, case-insensitive filesystems, Windows reserved characters, and leaking the full path into a directory name.

### Pitfall 4: Claude Code's memory is asynchronous, Pi's lifecycle is not

Claude Code's extraction is a background sub-agent with restricted tools, four or five turns, running every N messages and after idle time. It does not block the conversation, and if it fails you never notice.

My first version wrote synchronously in a lifecycle hook. That is wrong in a way that is easy to miss: Pi's `agent_end` is not necessarily final, because a retry or queued work can follow. Writing there can persist a memory from a turn that was later abandoned.

The implementation that survives real use:

- prepare the candidate at a **successful** `turn_end`, while the abort signal is still live;
- commit only at successful `agent_before_settle`;
- discard on cancellation, continuation, or shutdown;
- run detached, so the turn settles immediately;
- one pass at a time, coalescing overlapping requests, re-checking the store revision before writing;
- trigger every 5 prompts or after 120 seconds idle, and drain in-flight work for up to 15 seconds at shutdown.

Two modes: `call` sends one tool-free JSON request; `fork` runs a sub-agent for at most six turns with `read_memory` and `write_memory`, both confined to the project's memory directory, then applies its staged files atomically. Extraction uses a dedicated fast model (`qoder/fast`), not the session model.

None of this is prompt engineering. It is all lifecycle, and it is the part I would not have gotten right by copying the prompt.

### BM25: Claude Code's ranking, reimplemented

Claude Code ships a real [BM25](https://en.wikipedia.org/wiki/Okapi_BM25) index, and it is worth being precise about what it does, because it is the piece I borrowed. The index lives **inside the memory directory** as `.bm25-index.json`. Its job is **recall selection**: the agent has a pile of topic files and needs to decide which handful are worth reading for the current request, so the index scores every document and the top matches become the candidates. It is not part of writing, and it is not embedding search.

The parameters, from the 2.1.280 bundle:

- `k1 = 1.2`, `b = 0.75`
- field weights: filename 3, frontmatter 3, headings 2.5, body 1
- quoted phrases must match and get a 0.5 boost; every query term is required
- `MEMORY.md` is deliberately excluded: it is the entry point, read directly
- incremental sync with added/updated/removed counts, a content hash, and a re-verification loop for files that changed mid-read
- caps at 2,000 files / 1 MB per file / 64 MB index, keeping the newest by mtime

That is the ranking this plugin uses, reimplemented locally: title weight 3, description/body weight 1, English suffix folding, CJK indexed as characters and bigrams. My version drops the phrase boost and the separate frontmatter/heading weights, because with 128 small notes they buy nothing I can measure. No embeddings, no network, which is the point: a project with forty notes does not need a vector database.

### What I did not build: dreaming

Claude Code has `auto-dream`: a background pass that merges duplicates, rewrites stale notes, and cleans up, guarded by `.consolidate-lock` and live PID checks.

I did not build it, and I want to be explicit about why. Right now duplicates come from the same fact being saved under two IDs, and exact-content fingerprinting already catches those. The case that needs an LLM is "different words, same meaning" and "this fact expired", and I can observe that for free with a `/pmem doctor` similarity report before paying for a scheduler, a lock protocol, and a second model call. Adding that machinery now would double the failure surface to fix a problem I have not measured.

Also not built: team/organization sync, the `/memory` browser UI, per-subagent stores. Those are real gaps; they are just not the gaps I have.

## Try them

```bash
pi install git:github.com/adlternative/pi-in-chrome
pi install git:github.com/adlternative/pi-project-memory
```

`pi-in-chrome` needs one extra step to register the native messaging host (`npm run setup` in the repo) and an unpacked extension loaded from `chrome-extension/`. `pi-project-memory` works out of the box; turn on background extraction with `autoExtract` if you want it.

Both are macOS-tested against Pi 1.2.0. The Claude Code columns come from static analysis of version 2.1.280, so they will drift as Anthropic ships new gates. When they do, the interesting question will still be the same one: what actually runs, for whom, and who gets to decide.

One loose end: both packages should be on [npm](https://www.npmjs.com), so that `pi install pi-in-chrome` works without a Git clone. `npm publish` would not accept my 2FA for reasons I still do not understand, so I used a recovery code to get back into the account and left publishing for later. Until then, install from Git.

</div>

<div class="lang-section" data-lang="zh">

我的 Claude 账号被封了。[Anthropic](https://www.anthropic.com) 没有给理由，我也不打算替它编一个。但它对中国用户的那股恨意，我是真的难以理解——锁区锁得这么投入，早就不像商业决策了。我能说的是接下来发生了什么：订阅停了，然后 [Claude Code](https://github.com/anthropics/claude-code) 里我每天在用的两个能力也一起停了。

不是聊天。是另外两个：那个让 Agent 真的能在页面上点来点去的 Chrome 扩展，以及那个让它跨会话记住一个项目的 auto memory。

Pi 的插件生态其实并不缺这两块：memory 插件有好几个，浏览器桥也有基于 [Playwright](https://playwright.dev) 或 [MCP](https://modelcontextprotocol.io) 的若干实现。我试过其中几个，没有一个让我完全满意。memory 插件大多停在"存 + 召回"，或者为了管一个 Markdown 文件夹就上数据库和 embedding 流水线；浏览器桥则往往自己开一个浏览器，而不是接管我已经登录着的这个 Chrome，也很少提供原版扩展里那套无障碍树加稳定 `[ref_X]` 的用法。

所以我把这两块都拆了，在 [Pi](https://github.com/earendil-works/pi-coding-agent) 上重造了一遍，现在是开源的：

- [`pi-in-chrome`](https://github.com/adlternative/pi-in-chrome)——浏览器扩展和它的桥
- [`pi-project-memory`](https://github.com/adlternative/pi-project-memory)——按项目隔离的 Markdown 记忆

两个都是用 [REA](https://github.com/morluto/rea) 从 Claude Code 自己的产物里逆向出来的。

有一个视角能把整件事看明白。Anthropic 是一家"苹果公司"：精致的封闭花园、登录墙、应用商店式的审核，以及对"谁配拿这台设备"的笃定。按[户晨风](https://zh.wikipedia.org/wiki/%E6%88%B7%E6%99%A8%E9%A3%8E)那套分类，我就是个"安卓人"——拆扩展、重写协议、把文件留在自己硬盘上，还觉得模型端点也该归自己。这篇文章就是墙撞上螺丝刀的结果：两个重造的项目，以及我抄 Claude Code 时撞到的四个坑。

## 为什么偏偏是这两个能力

Claude Code 里看起来一切都是功能，但只有一部分是你真的会失去的能力。

Prompt 模板是功能，你可以重写；工具 schema 是功能，你可以重新声明。但 Chrome 扩展和 auto memory 是**挂在账号上的能力**。扩展需要 `claude.ai` 登录和 OAuth 授权，会问 Anthropic 的云端某个 URL 能不能访问（`url_hash_check`），后台任务还挂在远程开关后面。auto memory 的提炼和它的整理阶段（`auto-dream`）同样被 flag 门控。

所以封号不是让我的工作流退化，是把它截肢了。代码还在硬盘上，门关了。

## REA：把产品拆回协议

Claude Code 是 Bun 编译出来的二进制。[REA](https://github.com/morluto/rea)（`rea-agents`）是一个多智能体逆向框架：先测绘产物，抽出内嵌的 JavaScript，再让几个分析 agent 分别啃不同切片、互相校验。

做 memory 那部分时我特意留了证据，因为"我反编译过"不构成论据。被分析的是按哈希锁定的 `claude.exe`，文件偏移 `67993600` 处的 `__BUN/__bun` 段里是 NUL 分隔的 UTF-8 源码。这是**抽取**，不是反编译：没有恢复出原始源码。抽出来的子集里 9 个 JS 文件全部解析成功、0 失败，但有几个语义图超出了结果预算。所以这幅图**天然是部分的**，我把这一点写进文档，而不是假装完整。

这件事给我最重要的纪律是：**存在不等于启用。** 一条发布出去的分支可以永远躺在远程开关后面。`auto-dream` 在它自己的 `autoDreamEnabled` 检查之前还有一层 `tengu_onyx_plover`；提炼也有一个默认 false 的 flag。只读代码就得出"Claude Code 对每个用户都做了 X"，通常是错的。你必须把*发布了什么*和*你机器上跑的是什么*分开。

这个区分也是重建能诚实的原因：我不是在克隆一个产品，我是在重新实现一套协议和一种数据布局，然后自己决定默认值。

## pi-in-chrome

拆开之后，这个扩展有四层，越往下越有意思：

1. **配对隧道。** Claude Code 和 Chromium 通过 Unix domain socket 通信，帧用 AES-GCM 加密。
2. **[CDP 驱动](https://chromedevtools.github.io/devtools-protocol/)。** 点击、按键、滚动、截图都走 `chrome.debugger`，不是合成 DOM 事件。
3. **可访问性索引。** 页面被拍平成带稳定 `[ref_X]` 标识的无障碍树，模型可以指着元素说话，而不是猜坐标。
4. **人为瓶颈。** 云端 URL 校验、一个 600×600 的确认弹窗（30 秒不点就中止自动化）、以及一个把命中 `/author|auth|token|session/i` 的内容改写成 `[BLOCKED]` 的正则审查。

重建保留了 1–3，删掉了 4。`localhost`、内网地址、离线应用直接可用；不需要登录，不需要 API key，不弹窗。工具调用被限制在专属的 `Pi` tab 组里，不碰你个人的标签页；3 秒心跳加 `chrome.alarms` 会在 native host 断线后自动重连，而不是第一次断开就永久死掉。

然后就撞上了那个最有意思的 bug。

### 坑一：`find` 非要用 Haiku

`find` 是自然语言找元素："第二张卡片里的提交按钮"。整套工具里只有它真的需要一个模型，因为总得有人把一句话映射到一棵无障碍树上。

Claude Code 把这个调用硬编码进扩展自己的 Anthropic 客户端，用的是小快模型（[`claude-3-5-haiku`](https://www.anthropic.com/claude/haiku)）。没有登录、`chrome.storage` 里没有 `anthropicApiKey`，每次 `find` 就报 `Anthropic client not available`。扩展里那个关键字兜底是死代码，因为 MCP 工具上下文总会注入 `createAnthropicMessage`。

我第一版照抄了这个形状，然后以完全相同的方式失败。修法是**把模型的所有权倒过来：模型归宿主。**

- Pi 执行工具时如果手里有模型，就声明 `relay_inference: true`；
- 扩展不再调 Anthropic，而是发一条 `inference_request` 通知；
- Pi 用当前会话模型跑 `ctx.modelRegistry.complete()`，把结果回传；
- 回包走 `{method:"inference_response", params:{request_id, result}}`，而不是新的顶层帧类型，因为已安装的 native host 只按 `{type:"tool_request", method, params}` 转发帧。

Pi 没有模型时，工具退化成 `read_page` 加 ref。模型重新变成可选项。

这里的重点不是"Haiku 不好"。为"选一个元素"路由一个便宜模型，是合理的成本优化。问题是它同时让*"我能不能自动化我自己的 localhost"*取决于厂商账号。浏览器扩展不该拥有模型；它挂靠的 agent 本来就有。多花一点 token，换掉一个单点依赖，这笔交易划算得多。

### 坑二：这座桥是有主人的

扩展不直接跟浏览器说话，它跟一个 native messaging host 说话，而 Claude Code 的 host 二进制和扩展 ID 都是固定的。重建意味着你要拥有整条链路：新的扩展 ID、自己的 native host manifest、自己的 socket 目录，以及一个把 service worker 重新打包、不留下 Vite 哈希分块的构建步骤。

这里有个很隐蔽的故障模式：当你的扩展和 Claude Code 的扩展同时装着，工具调用可能被路由回 Claude Code 的桥，于是你得到一个诡异的半工作会话——一部分调用被你试图逃离的那个东西接管了。这个项目最后一个 commit 就叫 `fix: never route tool calls into Claude Code's bridge by default`。

## pi-project-memory

记忆是一个设计论点，不是一个功能。三个 agent，三种答案：

| | Claude Code | Codex | 这个插件 |
|---|---|---|---|
| 存储 | `~/.claude/projects/<project>/memory/` | `~/.codex/memories/` + SQLite | `<agent-dir>/project-memory/<repo>__<hash>/` |
| 布局 | `MEMORY.md` 索引 + 一主题一文件 | 索引、摘要、raw memories、rollout summaries | 同 Claude Code |
| 作用域 | Git 仓库，worktree 共享 | 全局汇总 rollout | git common dir；worktree 共享，submodule 独立 |
| 谁写 | 模型（文件工具）或后台子会话 | 只有后台流水线 | 模型（文件工具）或后台提炼 |
| 检索 | grep（另有一份 BM25 索引） | 字面行匹配 | 本地 BM25 + 可选模型辅助 |
| 整理 | auto-dream | Phase 2 agent | 无 |

### 为什么我 follow Claude Code

[Codex](https://github.com/openai/codex) 的流水线在工程上更漂亮：两个阶段、SQLite 记录 job 状态、lease、用 git baseline 做 diff、还有一个内部 consolidation agent。但它同时是一个模型写不进去的系统，而且一条笔记都还没有的时候，就得先有数据库和 worker。

Claude Code 的答案简单到有点不好意思：记忆就是 Markdown。`MEMORY.md` 是索引，每个主题一个文件，模型用它已经会的 `read`/`edit`/`write` 直接读写。不用学新 API，没有 schema，人也能打开这个目录、grep 它、或者塞进 git。

我选了这个。它符合 agent 纠正自己的实际方式：学到东西的那一刻，就去改文件。但我也把专用记忆工具实现了，可选开启（`list`、`read`、`search`、`save`），因为不是每个会话都有文件工具，而且搜索确实方便。默认是文件；工具只是便利，不是接口。

### 坑三：Pi 的存储路径有损，Claude Code 的也有

Claude Code 把记忆存在 `~/.claude/projects/<slug>/memory/`，`/Users/adl/foo` 变成 `-Users-adl-foo`。Pi 把会话存在 `~/.pi/agent/sessions/--<slug>--/`，用的是这个清洗函数：

```ts
const safePath = `--${resolvedCwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
```

两个都是**清洗器，不是编码器**。它们只保证结果是一个合法的单段路径；谁也不保证唯一。于是：

```text
/Users/adl/codex    → --Users-adl-codex--
/Users/adl-codex    → --Users-adl-codex--   ← 完全相同
/Users/adl/a/b      → --Users-adl-a-b--
/Users/adl/a-b      → --Users-adl-a-b--     ← 完全相同
```

对会话列表，这只是难看。对记忆，这是正确性和隐私问题：两个无关项目会共用一本笔记。照抄 Claude Code 的命名方式，等于继承同一个缺陷。

所以插件的身份键来自**规范化后的 Git common dir**——`git rev-parse --git-common-dir`，做 realpath，并且先从环境里删掉 `GIT_DIR`、`GIT_WORK_TREE`、`GIT_COMMON_DIR`，因为继承来的值会悄悄指向别的仓库——再哈希。同时保留一个可读前缀：

```text
<agent-dir>/project-memory/codex__646b6ecb79c8/
├── MEMORY.md
├── package-manager.md
├── review-process.md
└── .state.json
```

同一个仓库的三个入口会落到同一个 store；submodule 有自己的；非 Git 目录按规范化后的 cwd 取键。已知的限制是仓库改名或移动：键变了，旧笔记变成孤儿——还在磁盘上，但找不到了。哈希还顺带避开了超长路径、大小写不敏感文件系统、Windows 保留字符，以及把完整路径泄露到目录名里。

### 坑四：Claude Code 的记忆是异步的，Pi 的生命周期不是

Claude Code 的提炼是一个带受限工具的后台子会话，跑 4–5 轮，每 N 条消息触发一次，空闲时也补一次。它不阻塞对话；失败了你也看不见。

我第一版是在生命周期钩子里同步写。这错在一个很容易忽略的地方：Pi 的 `agent_end` 不一定是终点，因为后面可能还有重试或排队的工作。在那里写，可能把一次后来被放弃的轮次记成永久记忆。

真正能用的实现是这样的：

- 在**成功的** `turn_end` 里准备候选，此时 abort signal 还活着；
- 只在成功的 `agent_before_settle` 提交；
- 取消、续跑、退出都丢弃；
- 提炼独立运行，让这一轮立刻结束；
- 同一时刻只跑一份，合并重叠请求，写前再校验 store revision；
- 每 5 轮或空闲 120 秒触发；退出时最多再排空 15 秒。

两种模式：`call` 发一次无工具的 JSON 请求；`fork` 跑一个最多 6 轮的子 agent，只给它 `read_memory` 和 `write_memory`，两者都限制在当前项目的记忆目录内，最后把它暂存的文件原子地落盘。提炼用专门的快模型（`qoder/fast`），不用会话模型。

这些没有一条是 prompt 工程。全是生命周期，也正是照抄 prompt 抄不出来的部分。

### BM25：Claude Code 的排序，我照着重写了一遍

Claude Code 带一套真正的 [BM25](https://en.wikipedia.org/wiki/Okapi_BM25) 索引。这块正好是我拿走的部分，所以值得说清楚它到底在哪、干什么。索引就落在**记忆目录里面**，文件叫 `.bm25-index.json`。它的职责是**召回选择**：agent 手里有一堆主题文件，需要判断这次请求该读哪几篇，索引给每个文档打分，分数最高的一小撮成为候选。它不参与写入，也不是 embedding 语义搜索。

从 2.1.280 抽出来的参数：

- `k1 = 1.2`、`b = 0.75`
- 字段权重：文件名 3、frontmatter 3、标题 2.5、正文 1
- 引号短语必须命中，并且额外加 0.5；查询里的每个 term 都必需
- `MEMORY.md` 被刻意排除：它是入口，直接读，不参与索引
- 增量同步，带 added/updated/removed 计数、内容哈希，以及读到一半文件被改的重验证回路
- 上限 2000 文件 / 单文件 1 MB / 索引 64 MB，超了按 mtime 保留最新的

这套排序就是本插件用的排序，我在本地重写了一遍：标题权重 3，描述/正文权重 1，英文做后缀折叠，中文按单字和 bigram 建索引。我砍掉了短语加权和 frontmatter/标题的单独权重，因为在 128 条小笔记这个量级上，它们带来的收益我测不出来。不需要 embedding，不需要联网，这才是重点：一个只有四十条笔记的项目不需要向量数据库。

### 没做的东西：dreaming

Claude Code 有 `auto-dream`：一个后台 pass，合并重复、重写过期的笔记、做清理，靠 `.consolidate-lock` 和活进程 PID 检查保护。

我没做，而且想把原因说清楚。现在重复主要来自同一个事实存了两个 id，内容指纹已经能抓住。真正需要 LLM 的场景是"换了个说法但意思一样"和"这条已经过期"，而这我可以用 `/pmem doctor` 的相似度报告零成本观测，再决定要不要为它上调度器、锁协议和第二次模型调用。现在加这套机器，等于为了一个还没测量过的问题把故障面翻倍。

同样没做的：团队/组织同步、`/memory` 浏览 UI、per-subagent 独立 store。这些是真实的缺口，只是不是我现在的缺口。

## 试试

```bash
pi install git:github.com/adlternative/pi-in-chrome
pi install git:github.com/adlternative/pi-project-memory
```

`pi-in-chrome` 多一步：在仓库里跑 `npm run setup` 注册 native messaging host，再从 `chrome-extension/` 加载未打包扩展。`pi-project-memory` 开箱即用；想要后台提炼就把 `autoExtract` 打开。

两个都只在 macOS + Pi 1.2.0 上验证过。Claude Code 那几列来自 2.1.280 的静态分析，会随着 Anthropic 发布新的门而漂移。漂移之后，真正有意思的问题还是同一个：到底什么在跑，为谁跑，以及由谁决定。

还欠一件事：这两个包本来都该发到 [npm](https://www.npmjs.com)，这样 `pi install pi-in-chrome` 就不用从 Git 拉。但 `npm publish` 的 2FA 不知道为什么不认，我先用 recovery code 把账号恢复回来，发布往后放。在那之前，从 Git 装。

</div>

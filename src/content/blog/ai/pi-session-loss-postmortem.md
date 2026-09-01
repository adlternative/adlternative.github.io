---
title: "The Day My Agent Lost Its Memory: A Pi Session-Loss Postmortem"
titleZh: "当 Agent 失忆的那天：Pi 会话丢失事故复盘"
date: 2026-09-01 18:30:00
tags: [ai, agent, pi, postmortem, ops, reliability]
---

<div class="lang-section" data-lang="en">

A few days ago my local coding agent `pi` stopped starting, and fixing that revealed something worse: the entire `~/.pi/agent/sessions/` directory was gone — every conversation, including one with nearly five million tokens of context. This post is the short version of what happened and what it taught me about local agents.

## What happened

`pi update` broke the install: the npm dependency tree at `~/.pi/agent/npm` had been rewritten to contain only extensions, dropping the core package. Reinstalling fixed the CLI — and then the session was gone:

```
Extension "<runtime>" error: ENOENT: no such file or directory, open
'/Users/adl/.pi/agent/sessions/--Users-adl-pi-my-web--/2026-08-31T09-39-00-277Z_01a0572f-...jsonl'
```

Root cause: `npm install <extension> --prefix ~/.pi/agent/npm` ran an in-place reify that removed everything not in the current manifest — including the `sessions/` directory, `auth.json`, and `models-store.json`, which share the parent directory with the npm prefix. A package manager cannot tell "extra package" from "unrelated data directory".

The obvious recovery paths all failed. `/export` defaults to HTML and refuses to run when the JSONL file no longer exists on disk; `/import` needs a source JSONL; the hermes memory index predated the lost session. The only things I salvaged were a 1.6 GB hermes database and the pi-web log, recovered from file descriptors still held open by long-running processes (`lldb` attached to the live process, byte-for-byte copy — a macOS trick that works only because I did not kill anything). The session itself was "recovered" by manually copying visible terminal output into a new file and continuing in a fresh process. A workaround, not a recovery.

## The uncomfortable truth: local agents are unreliable by construction

The lesson is not about npm flags. It is that a local agent treats my work history as a local side effect: a directory that happens to share a parent with a package manager, auth in two files a reify can empty, a conversation with no durable copy anywhere else. Nothing about this is recoverable by design. Code is versioned because we learned it can be lost; agent sessions are not, and this incident is what that costs.

Periodic backups are the right habit — the minimum viable ops layer, and I now run one for `~/.pi/agent/sessions/`. But backups are a crutch: they lag behind the live session, miss the in-memory tail, and a restore is still an incident. Local development ends up requiring its own special ops, which is a sign the design is wrong, not that the operator should try harder.

## The durable answer: server-side session storage

If a conversation is valuable enough to miss when it vanishes, it should not live only on the machine that can lose it. The session log should be an event stream written to a service-side store as the conversation happens — messages, tool calls, file versions, branch points — with the local CLI as a thin client that reads and renders. Then `pi update` breaks the client, not the data; `rm -rf` cannot erase history; retrieval indexes can be rebuilt from the event stream instead of being the only surviving copy; and forking or resuming across machines becomes a read against a durable log.

This is a large design change for a local-first tool. But the direction is clear: **durability should be owned by the provider or the product, because the local machine has already proven it cannot be trusted with it.** A backup habit papers over the design; server-side storage is the design. My hope is that the next version of the agent makes this post's recovery story as obsolete as floppy-disk recovery guides.

</div>

<div class="lang-section" data-lang="zh">

前几天，我本地的编码 Agent `pi` 突然启动不了，而修好它之后发现了更糟的事：整个 `~/.pi/agent/sessions/` 目录都没了——所有会话一起消失，包括一个上下文接近 500 万 token 的会话。这篇是精简版复盘：发生了什么，以及它教会了我关于本机 Agent 的什么。

## 发生了什么

`pi update` 把安装弄坏了：`~/.pi/agent/npm` 的依赖树被重写成只剩扩展，核心包被整个丢弃。重装之后 CLI 恢复正常——然后发现会话没了：

```
Extension "<runtime>" error: ENOENT: no such file or directory, open
'/Users/adl/.pi/agent/sessions/--Users-adl-pi-my-web--/2026-08-31T09-39-00-277Z_01a0572f-...jsonl'
```

根因：`npm install <扩展> --prefix ~/.pi/agent/npm` 做了原地 reify，把「不在当前 manifest 里」的东西全部移除——包括与 npm prefix 共享父目录的 `sessions/`、`auth.json`、`models-store.json`。包管理器分不清「多余的包」和「无关的数据目录」。

显而易见的恢复路径全部失败。`/export` 默认产出 HTML，且当 JSONL 文件已不存在时拒绝执行；`/import` 需要一份源 JSONL；hermes 记忆索引早于丢失的会话。唯一救回来的是 1.6 GB 的 hermes 库和 pi-web 日志——从仍被长驻进程打开着的文件描述符里拷出来的（`lldb` 挂到活进程上逐字节拷贝，这个 macOS 技巧之所以能用，只因为我们什么都没杀）。会话本身只能靠「手动复制终端可见输出到新文件，再起一个新进程继续」。那是 workaround，不是恢复。

## 不争的事实：本机 Agent 天生不可靠

教训不在于 npm 的 flags，而在于：本机 Agent 把我的工作历史当成一个本地副作用——一个恰好和包管理器共享父目录的文件夹、两行 reify 就能清空的 auth 文件、一个没有任何异地副本的会话。这一切都不是「按设计可恢复」的。代码有版本管理，是因为我们吃过丢失的亏；Agent 会话没有，这次就是代价。

定期备份是正确的习惯——运维层的最低可行版本，我现在也确实给 `~/.pi/agent/sessions/` 加了一份。但备份是拐杖：它落后于活会话，抓不住内存里的尾巴，恢复仍然是一场事故。本地开发因此需要一套特殊的「运维」，这恰恰说明设计错了，而不是操作者应该更努力。

## 持久答案：服务端会话存储

如果一场对话珍贵到丢失时会心疼，它就不该只活在会弄丢它的那台机器上。会话日志应该作为事件流，在对话发生时实时写入服务端存储——消息、工具调用、文件版本、分支点——本地 CLI 退化成只负责读写渲染的瘦客户端。这样 `pi update` 弄坏的只是客户端，不是数据；`rm -rf` 抹不掉历史；检索索引可以从事件流重建，而不是成为唯一的幸存副本；跨机器 fork、resume 也只是对持久日志的读取。

对 local-first 工具来说这是个大设计变更。但方向很清楚：**持久性应该由提供商或产品来兜底，因为本机已经证明了它扛不住这个责任。** 备份习惯是在给设计打补丁；服务端存储才是设计本身。我希望下一代 Agent 能让这篇文章的恢复故事，变得像软盘恢复指南一样过时。

</div>

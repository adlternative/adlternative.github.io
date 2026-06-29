---
title: I Built agent-historian Because AI Agents Keep Repeating My Yesterday
titleZh: 我写了 agent-historian，因为 AI Agent 总在重复我的昨天
date: 2026-06-29 12:00:00
tags: [ai, agent, cli, tool]
---

<div class="lang-section" data-lang="en">

I spend most of my day talking to AI coding agents. OpenCode, Claude Code, Qoder, Codex CLI — I switch between them depending on the task. And they are good. But they all share one habit that drives me insane: **every new session starts from zero.**

Yesterday I spent forty minutes with Claude tracking down a `go.sum` merge conflict. We found the exact command to fix it. Today I opened a new session, mentioned the same conflict, and the agent promptly tried to hand-merge the file again — and got it wrong. It had forgotten the command we settled on less than twenty-four hours ago.

This is not a bug in one agent. It is the default shape of every agent I use. They are stateless across sessions. Their "memory" is whatever fits in the current context window plus whatever summary they decided to write down. If they did not think a detail was worth saving, it is gone.

## What I actually need

I do not need the agent to "remember" everything. I need it to **stop re-deriving conclusions it already reached**. Specifically, I need to ask:

- Have I solved this exact error before?
- What command did I run last time?
- Which file did we change, and why did we pick that approach?

The answers are not in a memory store. They are in the transcripts the agent already wrote to my disk. Every command, every error, every diff is sitting in `~/.claude/projects/*.jsonl`, `~/.qoder/projects/**/*.jsonl`, `~/.codex/sessions/**/rollout-*.jsonl`, OpenCode's SQLite db. The agent just has no good way to read them back.

## Why memory layers feel wrong

The obvious fix is a memory layer: mem0, OpenMemory, MemGPT, whatever. Teach the agent to summarize each session and recall the summary later.

I tried this. It misses the point. A memory layer only stores what the model *decides* is important. The `go.sum` fix was not a dramatic insight; it was a one-line command buried in a merge conflict. The model did not flag it as worth remembering. So the summary left it out, and the next session never saw it.

Worse, the filtering is irreversible. Anthropic makes this exact argument in their [Managed Agents](https://www.anthropic.com/engineering/managed-agents) post: compaction and memory tools make **irreversible decisions to selectively retain or discard context**, and *"it is difficult to know which tokens the future turns will need."* Once a detail is dropped from the summary, it is gone forever. You cannot rewind a summary.

## Why RAG feels like overkill

The next obvious fix is RAG: chunk the transcripts, embed them, put them in a vector database. Now you can do semantic search over everything.

This works for some questions, but it is absurdly heavy for what I am doing. I am not searching a million documents. I am asking "what command fixed this repo's `go.sum` conflict last week." I do not want to run an embedding model, maintain a vector index, and tune chunk sizes just for that.

RAG also has a fidelity problem. Vector search finds things that *look like* the query, not necessarily the exact command or the exact error message. For debugging, "close enough" is often wrong. And fixed-size chunks can slice a command away from its output, or an error away from the file that caused it. The agent then has to reconstruct a context that was already contiguous in the original transcript.

## The insight: treat history as a REPL data source

What I actually want is simpler. I want the agent to treat its session history the way I treat a database or a log file: a durable, read-only data source that it queries on demand, with the tools it already has.

Anthropic's Managed Agents post describes the same shape: keep the full interaction history as a **context object that lives outside the context window**. Raw activity stays "durably stored in the session log," and the model interrogates it via `getEvents()` — selecting positional slices, rewinding a few events before a specific moment, reading only what the current turn needs.

That is the design I wanted, but for the local transcripts that already exist across all my agents. So I built `agent-historian`.

## What agent-historian does differently

Instead of summarizing or embedding, `agent-historian` just reads the original transcripts. It exposes a small CLI called `ochist`:

```bash
ochist grep "authorized_keys" --limit 5   # find candidate sessions
ochist meta silent-star                    # confirm the session
ochist show silent-star | grep ssh-copy-id # locate the exact part
ochist part prt_xxxxx                      # read the full message
```

The agent composes these commands with `grep`, `head`, `wc`, `jq` — the same shell tools I use. It pages through history instead of dumping whole sessions into context. It pulls exact slices when it needs them.

Key properties:

- **Read-only.** It never writes to any agent's data store.
- **Multi-agent.** OpenCode, Claude Code, Qoder, Codex CLI out of the box.
- **No index, no embeddings, no background process.** Search is lexical and runs on demand.
- **Project-scoped by default.** It searches the current directory and sibling git worktrees; `--global` widens to everything.

The bundled Agent Skill teaches the agent *when* to do this — "check history before re-researching" — and *how* to page through results.

## The `go.sum` fix, revisited

With `agent-historian`, the second session goes differently. I tell the agent: "this repo had a `go.sum` conflict, we fixed it before." It runs:

```bash
ochist grep "go.sum" --limit 10 | grep "go mod tidy"
```

It finds the previous session, reads the command, and runs it. No hand-merging, no re-derivation, no forty minutes wasted.

## A note on the future

The cleanest end state is for every agent to ship this itself: an official `opencode session show`, a Claude Code read-history command, a Qoder transcript API. If that happens, `agent-historian` becomes unnecessary — and that would be a good outcome.

Until then, it is the uniform, read-only, cross-agent layer I wanted. Not a memory. Not a RAG pipeline. Just a way to ask yesterday's agent what it actually did.

If you want to try it:

```bash
npm install -g agent-historian
ochist sources
ochist sessions --limit 10
```

</div>

<div class="lang-section" data-lang="zh">

我大部分时间都在跟 AI 编码 Agent 打交道。OpenCode、Claude Code、Qoder、Codex CLI——按任务切换着用。它们都很好，但都有一个让我抓狂的习惯：**每开一个新会话都从零开始。**

昨天我和 Claude 花了四十分钟定位一个 `go.sum` 合并冲突，最后确定了那条修复命令。今天新开一个会话，我提到同一个冲突，Agent 立刻又去手动 merge——还解错了。它忘了不到二十四小时前我们定下来的那条命令。

这不是某个 Agent 的 bug，而是我用的所有 Agent 的默认形态。它们在会话之间是无状态的。它们的"记忆"就是当前上下文窗口里装得下什么，再加上它自己决定写下来的摘要。如果它没觉得某个细节值得保存，那个细节就消失了。

## 我真正需要什么

我不需要 Agent "记住"一切。我需要它**别再重新推导已经得出过的结论**。具体来说，我想问：

- 这个报错我之前解决过吗？
- 上次我跑的是什么命令？
- 我们改了哪个文件，为什么选那个方案？

答案不在某个记忆库里，而在 Agent 已经写到我磁盘上的 transcript 里。每条命令、每个报错、每个 diff 都躺在 `~/.claude/projects/*.jsonl`、`~/.qoder/projects/**/*.jsonl`、`~/.codex/sessions/**/rollout-*.jsonl`、OpenCode 的 SQLite db 里。Agent 只是没有一个好办法把它们读回来。

## 为什么记忆层感觉不对

显而易见的修复方案是加一层 memory：mem0、OpenMemory、MemGPT 之类。让模型总结每个会话，之后召回摘要。

我试过了，发现它没抓到重点。记忆层只保存模型*决定*重要的东西。那个 `go.sum` 修复不是什么深刻洞察，只是一条埋在合并冲突里的一行命令。模型没把它标记为值得记住，于是摘要里没它，下一个会话自然就看不到。

更糟的是，这种过滤是不可逆的。Anthropic 在 [Managed Agents](https://www.anthropic.com/engineering/managed-agents) 一文中正是这样论证的：compaction、memory 工具这类做法是在对"保留什么"做**不可逆决策**，而*"你很难预知未来的对话轮次会需要哪些 token"*。一旦某个细节被丢出摘要，它就永远没了。你不能对一个摘要做回退。

## 为什么 RAG 感觉像大炮打蚊子

下一个显而易见的方案是 RAG：把 transcript 切块、嵌入、放进向量库，然后做语义搜索。

对某些问题这确实有效，但对我来说太重了。我不是在搜一百万份文档，我只是想问"上周这个仓库的 `go.sum` 冲突是用什么命令修的"。我不想为此跑一个嵌入模型、维护向量索引、调切块大小。

RAG 还有保真度问题。向量搜索找到的是*看起来像*查询的内容，不一定是那条确切命令或具体报错。调试时，"差不多"往往是错的。而且固定长度的切块会把命令和它的输出切开，把报错和触发它的文件切开。Agent 不得不重新拼接那些原本在 transcript 里连续出现的上下文。

## 关键洞察：把历史当作 REPL 数据源

我真正想要的更简单。我希望 Agent 把会话历史当作数据库或日志文件一样对待：一个持久的、只读的数据源，按需查询，用它已经会的工具。

Anthropic 的 Managed Agents 一文描述的也是同一个形状：把完整交互历史作为**活在上下文窗口之外的对象**。原始活动"持久保存在 session log 中"，模型通过 `getEvents()` 按需检索：选择事件流的位置切片、回退几步看清前因、只读当前这轮需要的内容。

这正是我想要的设计，但作用域是已经落盘在我本地的、跨多个 Agent 的 transcript。于是我写了 `agent-historian`。

## agent-historian 有什么不同

它不总结、不嵌入，只读原始 transcript。它暴露一个小 CLI `ochist`：

```bash
ochist grep "authorized_keys" --limit 5   # 定位候选会话
ochist meta silent-star                    # 确认会话
ochist show silent-star | grep ssh-copy-id # 找到具体那一条
ochist part prt_xxxxx                      # 读完整消息
```

Agent 用 `grep`、`head`、`wc`、`jq` 自己拼命令——跟我用的 shell 工具一样。它分页浏览历史，而不是把整个会话倒进上下文；只在需要时拉取确切切片。

关键属性：

- **只读。** 绝不写入任何 Agent 的数据存储。
- **多 Agent。** 开箱即读 OpenCode、Claude Code、Qoder、Codex CLI。
- **无索引、无向量、无后台进程。** 搜索是按需运行的词法匹配。
- **默认项目级。** 搜索当前目录及同仓库的 git worktree；`--global` 扩展到全部。

内置的 Agent Skill 教 Agent*何时*查历史——"做新调研前先查历史"——以及*如何*分页浏览结果。

## 再回头看 `go.sum` 的例子

有了 `agent-historian`，第二个会话变得不同。我跟 Agent 说："这个仓库之前出过 `go.sum` 冲突，我们修过。"它跑：

```bash
ochist grep "go.sum" --limit 10 | grep "go mod tidy"
```

找到之前的会话，读到那条命令，直接执行。不用手解 merge，不用重新推导，不再浪费四十分钟。

## 关于未来的一点想法

最理想的终局是每个 Agent 官方都提供这个功能：一个官方的 `opencode session show`、Claude Code 的读历史命令、Qoder 的 transcript API。如果那一天到来，`agent-historian` 就变得多余了——而那会是件好事。

在那之前，它就是我想要的那个统一、只读、跨 Agent 的层。不是记忆，不是 RAG 流水线，只是一种向昨天的 Agent 询问它到底做了什么的方式。

如果你想试试：

```bash
npm install -g agent-historian
ochist sources
ochist sessions --limit 10
```

</div>

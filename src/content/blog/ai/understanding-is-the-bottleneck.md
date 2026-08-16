---
title: "Understanding Is the Bottleneck: Why Agent-Generated Code Needs Structured Summaries"
titleZh: "理解才是瓶颈：为什么 Agent 生成的代码需要结构化摘要"
date: 2026-08-16 18:00:00
tags: [ai, agent, code-review, tools]
---

<div class="lang-section" data-lang="en">

Geoffrey Litt recently gave a talk called *[Understanding Is the New Bottleneck](https://www.geoffreylitt.com/2026/07/02/understanding-is-the-new-bottleneck)*. His core point: AI makes writing code extremely cheap, but understanding code costs the same — or even more.

I deeply agree. And in the context of Agent-assisted development, this problem is far worse than he describes.

## The status quo

Agent writes code for you. You run tests. Green. Open MR. Reviewer sees 47 files changed, 3000 lines. Spends 5 minutes skimming. Approve.

Nobody actually understands what the code does.

This isn't hypothetical — it's daily reality. Tests become the only quality gate, and code review degrades into rubber-stamping.

## Why this is dangerous

Tests cover the scenarios you can think of. The problems Agent introduces are often where you can't: unreasonable abstractions, hidden state coupling, performance regressions, missed edge cases. Only a human who understands the code logic can catch these.

Put differently: tests tell you "it's not broken now," but not "will it break in the future."

## Where Geoffrey and I diverge

Geoffrey's answer is *educational*: he builds `/explain-diff` — rich HTML explainer docs with background context, literate diffs, interactive figures, and quizzes. His goal is to help humans *learn* the code deeply enough to participate in the creative process.

I love this direction. But I'm solving a slightly different problem: **what happens *before* a human decides to read?** When a reviewer opens an MR with 47 files, they need triage — which files matter, what's the shape of this change, where should I focus?

You don't start exploring a new city by reading every street sign. You look at a map first. Geoffrey's explainer is great for exploring — I want to give you the map.

## Why unstructured explanations aren't enough

I tried having Agent explain its changes in natural language. Problems:

- **Unreliable**: AI might miss files, or over-explain trivial changes
- **Unconsumable**: Natural language can't be processed by downstream tools (MR templates, impact analysis, change classification)
- **Unverifiable**: You can't assert "the explanation covers all changed files"

Fundamentally, an essay-style explanation is a *destination format*. What I need is an *intermediate data format* — something both humans and machines can consume.

## The structured output approach

So I built [/what-you-did](https://github.com/adlternative/what-you-did). Core design:

1. Use `git diff --name-status` as ground truth — build a skeleton containing every changed file first
2. Fill summaries per-file — entries can only be filled, never added or removed
3. Output JSON with a `file_count` field for completeness verification
4. Aggregate by directory — provide different granularity levels for understanding

```json
{
  "file_count": 5,
  "summary": "Refactored cache module into L1/L2 dual-layer architecture",
  "directories": [
    { "path": "src/cache", "file_count": 3, "summary": "Cache core logic split" }
  ],
  "files": [
    { "path": "src/cache/l1.ts", "status": "A", "category": "feature", "summary": "In-memory cache implementation" },
    { "path": "src/cache/l2.ts", "status": "A", "category": "feature", "summary": "Disk cache implementation" },
    { "path": "src/cache/index.ts", "status": "M", "category": "refactor", "summary": "Unified entry, routes to L1/L2" }
  ]
}
```

This isn't prose for humans to read — it's structured data for toolchains to consume. Humans can scan the summary at a glance; tools can auto-generate MR descriptions, trigger extra checks for specific modules, or compute change statistics by category.

## What this enables: MR review integration

Structured data can be rendered into any shape. Here's a concept for MR review — hover any file or directory to see its AI summary:

<iframe src="/articles/assets/what-you-did-mr-concept.html" style="width:100%;height:640px;border:1px dashed var(--fg, lime);border-radius:4px;margin:1em 0;" frameborder="0"></iframe>

The key insight: this data is available *at page load time*. No extra API calls. The JSON was generated when the branch was pushed — rendering is just a frontend component away.

## Key design decisions

**Skeleton first**: Get the complete file list from git before filling content. This guarantees no files are missed. "Let AI analyze then output" has no such guarantee — especially on large diffs where context windows get tight.

**JSON not Markdown**: Markdown is a rendering format. JSON is a data format. One JSON file can become an MR comment, a Slack notification, a weekly report entry, a changelog — each consuming what they need.

**Directory-level aggregation**: Nobody wants to review 47 files one by one. But "8 files changed under src/auth, overall adding OAuth2 support" gives instant judgment.

## The relationship to Geoffrey's work

I see our approaches as complementary layers:

1. **Structured summary** (what-you-did) → triage, orient, decide where to focus
2. **Rich explanation** (explain-diff) → deep understanding of the parts that matter
3. **Quiz/verification** → confirm you actually understood

The first layer is fast, mechanical, and verifiable. The second is rich, educational, and creative. You need both.

## Conclusion

The cost of writing code is approaching zero, but the cost of understanding code hasn't changed. We need tools at multiple levels to bridge this gap — structured data for the map, rich explanations for the territory.

*Project: [what-you-did on GitHub](https://github.com/adlternative/what-you-did)*

</div>

<div class="lang-section" data-lang="zh">

Geoffrey Litt 最近做了一个演讲叫 *[Understanding Is the New Bottleneck](https://www.geoffreylitt.com/2026/07/02/understanding-is-the-new-bottleneck)*，核心观点是：AI 让写代码变得极其廉价，但理解代码的成本没有变——甚至更高了。

我深有同感，而且在 Agent 辅助开发的场景下，这个问题比他描述的更严重。

## 现状

Agent 帮你写完代码，你跑测试，绿了，提 MR。评审人点开 diff，看到 47 个文件变更，3000 行代码。他花 5 分钟扫了一眼，approve。

没人真的理解这些代码做了什么。

这不是假设，这是我观察到的日常。测试通过成了唯一的质量门禁，代码评审退化成了形式审批。

## 为什么危险

测试覆盖的是你能想到的场景。Agent 引入的问题往往在你想不到的地方：不合理的抽象、隐含的状态耦合、性能退化、边界条件遗漏。这些只有人类理解代码逻辑后才能发现。

换句话说：测试告诉你"现在没坏"，但不告诉你"未来会不会坏"。

## 我和 Geoffrey 的分歧

Geoffrey 的答案是*教育导向*的：他做了 `/explain-diff`——生成包含背景知识、文学化 diff、交互图示和测验的 HTML 解释文档。目标是帮助人类*深入学习*代码，从而能参与创造性过程。

我很喜欢这个方向。但我在解决一个稍微不同的问题：**在人类决定深入阅读之前会发生什么？** 当评审者打开一个 47 文件的 MR，他首先需要分诊——哪些文件重要、变更的整体形状是什么、应该聚焦在哪里？

你不会到一个陌生城市就挨个读路牌，你会先看地图。Geoffrey 的解释器适合深入探索——我想先给你一张地图。

## 为什么非结构化的解释不够

我试过让 Agent 用自然语言解释它做了什么。问题是：

- **不可靠**：AI 可能漏掉文件，也可能过度解释无关紧要的改动
- **不可消费**：自然语言没法被下游工具处理（MR 模板、影响分析、变更分类）
- **不可验证**：你没法断言"解释覆盖了所有变更文件"

本质上，散文式解释是*终态格式*。我需要的是*中间数据格式*——人和机器都能消费的东西。

## 结构化输出的思路

所以我做了 [/what-you-did](https://github.com/adlternative/what-you-did)。核心设计：

1. 用 `git diff --name-status` 作为 ground truth，先建一个包含所有变更文件的骨架
2. 逐文件填充摘要，不允许增删条目
3. 输出 JSON，带 `file_count` 字段用于校验完整性
4. 按目录聚合，提供不同粒度的理解入口

```json
{
  "file_count": 5,
  "summary": "重构缓存模块为 L1/L2 双层架构",
  "directories": [
    { "path": "src/cache", "file_count": 3, "summary": "缓存核心逻辑拆分" }
  ],
  "files": [
    { "path": "src/cache/l1.ts", "status": "A", "category": "feature", "summary": "内存缓存实现" },
    { "path": "src/cache/l2.ts", "status": "A", "category": "feature", "summary": "磁盘缓存实现" },
    { "path": "src/cache/index.ts", "status": "M", "category": "refactor", "summary": "统一入口，路由到 L1/L2" }
  ]
}
```

这不是给人读的散文，是给工具链消费的结构化数据。人可以快速扫一眼 summary，工具可以自动生成 MR 描述、触发特定模块的额外检查、或者按 category 做变更统计。

## 下游怎么用：MR 评审界面集成

结构化数据可以被渲染成任何形态。这是一个 MR 评审的概念——hover 文件或目录查看 AI 摘要：

<iframe src="/articles/assets/what-you-did-mr-concept-zh.html" style="width:100%;height:640px;border:1px dashed var(--fg, lime);border-radius:4px;margin:1em 0;" frameborder="0"></iframe>

关键点：这些数据在页面加载时就已经有了。零额外 API 请求。JSON 在分支 push 时就生成了——渲染只是一个前端组件的事情。

## 关键设计决策

**骨架先行**：先从 git 拿到完整文件列表，再填充内容。保证不会漏文件。传统的"让 AI 分析 diff 然后输出"没有这个保证——尤其是大 diff 接近 context window 极限时。

**JSON 而非 Markdown**：Markdown 是渲染格式，JSON 是数据格式。一份 JSON 可以变成 MR 评论、Slack 通知、周报条目、变更日志——各取所需。

**目录级聚合**：47 个文件没人想逐个看。但"src/auth 下改了 8 个文件，整体是在做 OAuth2 支持"——立刻就有判断力。

## 和 Geoffrey 工作的关系

我认为我们的方案是互补的层次：

1. **结构化摘要**（what-you-did）→ 分诊、定向、决定聚焦点
2. **深度解释**（explain-diff）→ 对重要部分的深入理解
3. **测验/验证** → 确认你真的理解了

第一层快速、机械、可验证。第二层丰富、教育性、有创造力。两者都需要。

## 总结

写代码的成本在趋近于零，但理解代码的成本没变。我们需要多层次的工具来弥合这个差距——结构化数据做地图，深度解释做探索。

*项目地址：[what-you-did on GitHub](https://github.com/adlternative/what-you-did)*

</div>

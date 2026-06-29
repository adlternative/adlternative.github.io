---
title: 'GSOC, Git Blog 1'
titleZh: "GSOC，Git 博客 1"
date: 2021-05-23 18:42:52
tags: git
---

<div class="lang-section" data-lang="en">

## Week1: Git Adventure Begin

Use Git to submit Git patches to the Git community. Does it sound magical? I fell very lucky to be selected by the Git community this year and start my Git Adventure in GSoC.

I am no stranger to Git usage, and before the start of GSoC, I have learned some Git source code content, but I only saw the tip of the iceberg of Git source code, there are still many things that I need to explore.

### What happened this week
- In [[GSoC] Hello Git](https://lore.kernel.org/git/CAOLTT8SHE-ok3D+oLNSWFi7KPU==VQnTMDmC4YxUyNBJKmBD8A@mail.gmail.com/), Christian and JiangXin interacted with me.
- I checked Olga's patch at Christian's prompt and learned a way to make `cat-file --batch` use `ref-filter` logic: Use `format_ref_array_item()` in `batch_object_write()`, this is indeed a good entry point. But before implementing this function, we must make `ref-filter` support the function of printing the original data of the object (as `cat-file --batch` does). I decided to reuse the atom `%(content:raw)` in ref-filter to implement this function.

### The difficulties I met
In [[PATCH] [GSOC] ref-filter: add contents:raw atom](https://lore.kernel.org/git/pull.958.git.1621500593126.gitgitgadget@gmail.com/), I submitted a patch, which support atom `%(content:raw)` for `ref-filter`.

Unfortunately, this patch has a big problem: I ignored the breakage on the test. This led me to discover a bigger problem:

If our references points to a blob or a tree, and  these objects may be binary files, this means that we cannot use functions related to `strcmp()`,`strlen()` or `strbuf_addstr()`. The possible '\0' will cause the output to be truncated. We have to think of a way to make `ref-filter` can accept the output of these binary content.

So I searched for all the codes in `ref-filter.c` that buffer might be truncated by '\0' and use the appropriate method to replace them.

Just like replacing `strcmp()` with `memcmp()`, We can use `strbuf_add()` instead of `strbuf_addstr()`, At the same time I also wrote the equivalent `*._quote_buf_with_size()` to replace `*._quote_buf()`.

I just submit it to the mailing list right now: [[GSOC][RFC] ref-filter: add contents:raw atom](https://lore.kernel.org/git/pull.959.git.1621763612.gitgitgadget@gmail.com/)

I don’t know if this is the right approach at the moment, let us slowly wait for the suggestions of mentors and reviewers... `;-)`

Thanks!
--
ZheNing Hu

</div>

<div class="lang-section" data-lang="zh">

## 第一周：Git 冒险开始

用 Git 给 Git 社区提交补丁。听起来是不是很神奇？今年能被 Git 社区选中，开启我的 GSoC Git 冒险之旅，我感到很幸运。

我对 Git 的使用并不陌生，在 GSoC 开始之前，我也学习过一些 Git 源码的内容，但我看到的只是 Git 源码的冰山一角，仍有许多东西需要我去探索。

### 本周发生了什么
- 在 [[GSoC] Hello Git](https://lore.kernel.org/git/CAOLTT8SHE-ok3D+oLNSWFi7KPU==VQnTMDmC4YxUyNBJKmBD8A@mail.gmail.com/) 中，Christian 和 JiangXin 与我进行了交流。
- 在 Christian 的提示下，我查看了 Olga 的补丁，并了解到一种让 `cat-file --batch` 使用 `ref-filter` 逻辑的方法：在 `batch_object_write()` 中使用 `format_ref_array_item()`，这确实是一个很好的切入点。但在实现这一功能之前，我们必须让 `ref-filter` 支持打印对象原始数据的功能（就像 `cat-file --batch` 所做的那样）。我决定复用 ref-filter 中的 `%(content:raw)` 原子来实现这个功能。

### 我遇到的困难
在 [[PATCH] [GSOC] ref-filter: add contents:raw atom](https://lore.kernel.org/git/pull.958.git.1621500593126.gitgitgadget@gmail.com/) 中，我提交了一个补丁，为 `ref-filter` 增加了 `%(content:raw)` 原子的支持。

不幸的是，这个补丁有一个很大的问题：我忽略了测试的损坏。这让我发现了一个更大的问题：

如果我们的引用指向 blob 或 tree，而这些对象可能是二进制文件，这意味着我们不能使用与 `strcmp()`、`strlen()` 或 `strbuf_addstr()` 相关的函数。可能出现的 '\0' 会导致输出被截断。我们必须想办法让 `ref-filter` 能够接受这些二进制内容的输出。

因此，我查找了 `ref-filter.c` 中所有可能被 '\0' 截断的缓冲代码，并用合适的方法替换它们。

就像用 `memcmp()` 替换 `strcmp()` 一样，我们可以用 `strbuf_add()` 代替 `strbuf_addstr()`，同时我还写了等价的 `*._quote_buf_with_size()` 来替换 `*._quote_buf()`。

我刚刚把它提交到了邮件列表：[[GSOC][RFC] ref-filter: add contents:raw atom](https://lore.kernel.org/git/pull.959.git.1621763612.gitgitgadget@gmail.com/)

我目前不知道这是否是正确的方向，让我们慢慢等待导师和审阅者的建议……`;-)`

谢谢！
--
ZheNing Hu

</div>

---
title: 'GSOC, Git Blog 3'
titleZh: "GSOC，Git 博客 3"
date: 2021-06-06 23:14:59
tags: git
---

<div class="lang-section" data-lang="en">

## Week3: Meticulousness is very important

### What happened this week
- I found a `git cat-file` bug this week, see:

```bash
git cat-file --batch=batman --batch-all-objects batman
fatal: object 00345b5fe0aa8f45e9d1289ceb299f0489ea3fe1 changed type!?
```

It seems that Git died for a strange reason: the type of an object changed? Is my Git object damaged? (Just like a friend of mine, use `find . -type f -print0 | xargs -0 sed -i "s/\r//g"` remove all the '\r' of all files in a Git repository, this caused most of his Git commands to fail.) So I tested it under different linux platforms, they all have this same damage.

After a series of testing and debugging, I found that `oid_object_info_extended()` did not get the type of object.

So I submitted the patch for fix this bug to the Git mailing list in [[PATCH] [GSOC] cat-file: fix --batch report changed-type bug](https://lore.kernel.org/git/pull.965.git.1622363366722.gitgitgadget@gmail.com/), Peff tell us the essential reason for this bug:

In `845de33a5b (cat-file: avoid noop calls to sha1_object_info_extended, 2016-05-18)`, this patches
skips the call to `oid_object_info_extended()` entirely when `--batch-all-objects` is in use, and the custom format does
not include any placeholders that require calling it. The correct solution is to put checking if `object_info` is empty after setting `object_info.typep`.

Finally, thanks to the help of Jeff, I summit final patch in [[PATCH v2 1/2] [GSOC] cat-file: handle trivial --batch format with --batch-all-objects](https://lore.kernel.org/git/4af3b958dd056e2162fdc5d7f6600bcedde210b8.1622737766.git.gitgitgadget@gmail.com/).

Talk of experience as a story: Even experienced programmers make small mistakes, writing any code requires very careful thinking.
- The checkpoints for rejecting `%(raw)` and `--<lang>` are incorrect. At Junio's reminder, I changed the checkpoint from
`parse_ref_filter_atom()` to `verify_ref_format()`. My mentor Christian pointed out some grammatical errors in the cover letter.
- At the suggestion of Junio, I rebased `0efed94 ([GSOC] ref-filter: add %(raw) atom)` on `1197f1a (ref-filter: introduce
enum atom_type)`, they have a clash, after resolving the conflict, it's better for me to consider the code I implemented before and the code I wrote now at the same time, I can find more problems
and find better solutions.
- I submitted the patch about `%(rest)`, `%(raw:textconv)` and `%(raw:filters)` for `ref-filter`, they are used to simulate some functions of `git cat-file`, my mentor Hariom noticed one of the formatting issues, I am waiting for more reviews for the time being.

### What's the next step

As long as new atoms `%(rest)`, `%(raw:textconv)` and `%(raw:filters)` for `ref-filter` can be accepted by Git, We can start to let `cat-file` use `ref-filter` logic on a large scale! Exciting! But the performance of `ref-filter` is still not good. Perhaps I need to find a new breakthrough in the performance bottleneck of `ref-filter`.

Thanks!
--
ZheNing Hu

</div>

<div class="lang-section" data-lang="zh">

## 第三周：细致非常重要

### 本周发生了什么
- 我这周发现了一个 `git cat-file` 的 bug，如下：

```bash
git cat-file --batch=batman --batch-all-objects batman
fatal: object 00345b5fe0aa8f45e9d1289ceb299f0489ea3fe1 changed type!?
```

Git 似乎因为一个很奇怪的原因挂掉了：对象的类型改变了？我的 Git 对象损坏了吗？（就像我的一个朋友，用 `find . -type f -print0 | xargs -0 sed -i "s/\r//g"` 去掉了 Git 仓库中所有文件的 '\r'，这导致他大部分 Git 命令都失效了。）于是我在不同的 Linux 平台上做了测试，它们都存在同样的“损坏”。

经过一系列的测试和调试，我发现 `oid_object_info_extended()` 没有获取到对象的类型。

因此我在 [[PATCH] [GSOC] cat-file: fix --batch report changed-type bug](https://lore.kernel.org/git/pull.965.git.1622363366722.gitgitgadget@gmail.com/) 中向 Git 邮件列表提交了修复这个 bug 的补丁，Peff 告诉了我们这个 bug 的根本原因：

在 `845de33a5b (cat-file: avoid noop calls to sha1_object_info_extended, 2016-05-18)` 中，这个补丁在使用 `--batch-all-objects` 且自定义格式不包含任何需要调用它的占位符时，完全跳过了对 `oid_object_info_extended()` 的调用。正确的解决方案是在设置 `object_info.typep` 之后，再检查 `object_info` 是否为空。

最后，在 Jeff 的帮助下，我在 [[PATCH v2 1/2] [GSOC] cat-file: handle trivial --batch format with --batch-all-objects](https://lore.kernel.org/git/4af3b958dd056e2162fdc5d7f6600bcedde210b8.1622737766.git.gitgitgadget@gmail.com/) 中提交了最终补丁。

作为经验之谈：即使是经验丰富的程序员也会犯小错误，编写任何代码都需要非常仔细地思考。
- 拒绝 `%(raw)` 和 `--<lang>` 的检查点不正确。在 Junio 的提醒下，我把检查点从 `parse_ref_filter_atom()` 改到了 `verify_ref_format()`。我的导师 Christian 指出了附信中的一些语法错误。
- 在 Junio 的建议下，我将 `0efed94 ([GSOC] ref-filter: add %(raw) atom)` 变基到了 `1197f1a (ref-filter: introduce
enum atom_type)` 上，它们有冲突，解决冲突后，我可以同时考虑之前实现的代码和现在写的代码，这样能发现更多问题并找到更好的解决方案。
- 我提交了关于 `ref-filter` 的 `%(rest)`、`%(raw:textconv)` 和 `%(raw:filters)` 的补丁，它们用于模拟 `git cat-file` 的一些功能，我的导师 Hariom 注意到了一个格式问题，我暂时在等待更多审阅。

### 下一步计划

只要 `ref-filter` 的新原子 `%(rest)`、`%(raw:textconv)` 和 `%(raw:filters)` 能被 Git 接受，我们就可以开始大规模地让 `cat-file` 使用 `ref-filter` 逻辑了！令人兴奋！但 `ref-filter` 的性能仍然不够好。也许我需要在 `ref-filter` 的性能瓶颈上寻找新的突破。

谢谢！
--
ZheNing Hu

</div>
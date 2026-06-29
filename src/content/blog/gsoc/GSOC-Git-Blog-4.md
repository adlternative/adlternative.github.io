---
title: 'GSOC, Git Blog 4'
titleZh: "GSOC，Git 博客 4"
date: 2021-06-13 22:12:00
tags: git
---

<div class="lang-section" data-lang="en">

## Week4: Trouble is a friend

At the beginning of this week , since my previous code broke some Github CI tests , I tried to solve these bugs related to the atom `%(raw)` . The most confusing thing is that some bugs may pass the tests of your local machine, but fail to pass in the CI of GitHub .

E.g. I need to add the `GPG` prerequisites to the test like this:

```sh
test_expect_success GPG 'basic atom: refs/tags/signed-empty raw' '
git cat-file tag refs/tags/signed-empty >expected &&
git for-each-ref --format="%(raw)" refs/tags/signed-empty >actual &&
sanitize_pgp <expected >expected.clean &&
sanitize_pgp <actual >actual.clean &&
echo "" >>expected.clean &&
test_cmp expected.clean actual.clean
'
```

Otherwise, some operating systems that do not contain GnuPG may not be able to perform related tests.

In addition, some scripts like `printf "%b" "a\0b\0c" >blob1` will be truncated at the first NUL on a 32-bit machine, but it performs well on 64-bit machines, and NUL is normally stored in the file. This made me think that Git's file decompression had an error on a 32-bit machine before I used Ubuntu32's docker container to clone the git repository and In-depth analysis of bugs... In the end, I used `printf "a\0b\0c"` to make 32-bit machines not truncated in NUL. Is there a better way to write binary data onto a file than `printf` and `echo`?

Since I am a newbie to docker, I would like to know if there is any way to run the Git's Github CI program remotely or locally?

In the second half of this week, I tried to make `cat-file` reuse the logic of `ref-filter`. I have to say that this is a very difficult process. "rebase -i" again and again to repair the content of previous commits. Squeeze commits, split commits, modify commit messages... Finally, I submitted the patches to the Git mailing list in[[PATCH 0/8] [GSOC][RFC] cat-file: reuse `ref-filter` logic](https://lore.kernel.org/git/pull.980.git.1623496458.gitgitgadget@gmail.com/).
Now `cat-file` has learned most of the atoms in `ref-filter`. I am very happy to be able to make git support richer functions through my own code.

Regrettably, `git cat-file --batch --batch-all-objects` seems to take up a huge amount of memory on a large repo such as git.git, and it will be killed by Linux's oom. This is mainly because we will make a large number of copies of the object's raw data. The original `git cat-file` uses `read_object_file()` or `stream_blob()` to output the object's
raw data, but in `ref-filter`, we have to use `v->s` to copy the object's data, it is difficult to eliminate `v->s` and print the output directly to the final output buffer. Because we may have atoms like `%(if)`, `%(else)` that need to use buffers on the stack to build the final output string layer by layer, or the `cmp_ref_sorting()` needs to use `v->s` to
compare two refs. In short, it is very difficult for `ref-filter` to reduce copy overhead. I even thought about using the string pool API `memintern()` to replace `xmemdupz()`, but it seems that the effect is not obvious. A large number of objects' data will still reside in memory, so this may not be a good method.

Anyway, stay confident. I can solve these difficult problems with the help of mentors and reviewers. `:`)

</div>

<div class="lang-section" data-lang="zh">

## 第四周：麻烦是朋友

本周初，由于我之前的代码破坏了一些 Github CI 测试，我尝试解决这些与 `%(raw)` 原子相关的 bug。最令人困惑的是，有些 bug 可能在本地机器上能通过测试，但在 GitHub 的 CI 上却无法通过。

例如，我需要像这样为测试添加 `GPG` 前置条件：

```sh
test_expect_success GPG 'basic atom: refs/tags/signed-empty raw' '
git cat-file tag refs/tags/signed-empty >expected &&
git for-each-ref --format="%(raw)" refs/tags/signed-empty >actual &&
sanitize_pgp <expected >expected.clean &&
sanitize_pgp <actual >actual.clean &&
echo "" >>expected.clean &&
test_cmp expected.clean actual.clean
'
```

否则，一些不包含 GnuPG 的操作系统可能无法执行相关测试。

此外，一些像 `printf "%b" "a\0b\0c" >blob1` 这样的脚本在 32 位机器上会在第一个 NUL 处被截断，但在 64 位机器上表现良好，NUL 通常能被正常存入文件。这让我一度以为 Git 的文件解压在 32 位机器上存在错误，直到我用 Ubuntu32 的 docker 容器克隆 git 仓库并深入分析 bug……最后，我使用了 `printf "a\0b\0c"` 来让 32 位机器不会在 NUL 处截断。有没有比 `printf` 和 `echo` 更好的方法来将二进制数据写入文件？

由于我是 docker 新手，我想知道是否有办法远程或本地运行 Git 的 Github CI 程序？

在本周后半段，我尝试让 `cat-file` 复用 `ref-filter` 的逻辑。我不得不说这是一个非常艰难的过程。一次次 `rebase -i` 来修复之前提交的内容。压缩提交、拆分提交、修改提交信息……最终，我在 [[PATCH 0/8] [GSOC][RFC] cat-file: reuse `ref-filter` logic](https://lore.kernel.org/git/pull.980.git.1623496458.gitgitgadget@gmail.com/) 中将这些补丁提交到了 Git 邮件列表。
现在 `cat-file` 已经学会了 `ref-filter` 中的大部分原子。我很高兴能够通过自己的代码让 git 支持更丰富的功能。

遗憾的是，`git cat-file --batch --batch-all-objects` 在像 git.git 这样的大型仓库上似乎会占用大量内存，并会被 Linux 的 OOM 杀掉。这主要是因为我们会大量复制对象的原始数据。原来的 `git cat-file` 使用 `read_object_file()` 或 `stream_blob()` 来输出对象的原始数据，但在 `ref-filter` 中，我们不得不使用 `v->s` 来复制对象的数据，很难消除 `v->s` 并直接把输出打印到最终输出缓冲区。因为我们可能有像 `%(if)`、`%(else)` 这样的原子，需要使用栈上的缓冲区一层一层地构建最终输出字符串，或者 `cmp_ref_sorting()` 需要使用 `v->s` 来比较两个引用。总之，`ref-filter` 很难减少复制开销。我甚至想过用字符串池 API `memintern()` 来替代 `xmemdupz()`，但效果似乎不明显。大量对象的数据仍会驻留在内存中，所以这可能不是一个好方法。

不管怎样，保持信心。在导师和审阅者的帮助下，我能够解决这些困难的问题。`:)`

</div>
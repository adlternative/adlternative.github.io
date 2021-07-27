---
title: git ref-filter source code analyze (zh_CN)
date: 2021-07-20 20:43:18
tags: git
hidden: true
---

### 前言

今年参加 GSoC 为 Git 来重构 `git cat-file`, 目标是让 `cat-file --batch` 不再使用 `cat-file.c` 中那套旧的逻辑，而是要想方法去接入 `ref-filter.c` 中更为强大的功能。曲曲折折到现在可以说功能上是差不多实现好了，但是 `cat-file --batch` 恰好遭遇了性能瓶颈，我也差不多到了个人能力瓶颈，想改很多细小的地方，链式哈希表，radix树，页面缓存等等，但估计下来和测试下来却都是负优化，不得不静下心来思考：`ref-filter` 究竟做了些啥？

### git for-each-ref
可以说 `ref-filter` 中所有的逻辑都是给 `git for-each-ref` 使用的，这个命令的作用是遍历 git 仓库里所有的引用，并打印引用对象内容的格式化数据。这些引用一般以文件的形式存储在 `.git/refs/tags/`，`.git/refs/branch/`, `.git/refs/heads/` 等目录下。随便打开一个引用文件，

```sh
$ cat .git/refs/tags/cat-file-batch-refactor-temp
1f8c0f1d15a49acd6bb6276c6974d468c0093264
```

我们可以看到引用文件存储的是一个 git 对象的哈希值（一般是 SHA-1）。`git for-each-ref` 就通过这些哈希值去寻找 git 数据库中的所有 git 对象,并提取它们的数据。

```sh
$ git for-each-ref
e705873ee6f12b8375364f1131855644036d2a92 commit refs/heads/cat-file-batch-refactor
5903d02324f3275b3aa442bb3ca2602564c543dc commit refs/heads/cat-file-batch-refactor-2
16c9cdd4f1b6303ee7c350c620a20fdecbad521a commit refs/heads/cat-file-batch-refactor-rebase-version
7f0ab015921bbbb926f9803c095fdb797af9ef65 commit refs/heads/master
36c7071854a35e57a6688e68132c22c8e95d577f commit refs/remotes/ggg/ab/author-committer-ident-config
4045f659bdccb5108800bdc2ec96bc6f3945ff40 commit refs/remotes/ggg/ab/branch-sort
b9cc405612f6badded21cb526cdeaa627fecbb37 commit refs/remotes/ggg/ab/bsd-fixes
a36e4dfb78b1d83e74586389e947316513c46b16 commit refs/remotes/ggg/ab/bundle-doc
10b635b77311badcbb5045b7421e6826c4536613 commit refs/remotes/ggg/ab/bundle-updates
3338e9950e353ffd2033aae25952eb3f88c315e1 commit refs/remotes/ggg/ab/checkout-default-remote
...
```

分别打印了引用指向的对象的 "哈希值 对象类型 引用名"，在实现细节中对应的是 "%(objectname) %(objecttype) %(refname)" 三种格式原子。

我们还可以使用其他的格式原子来打印更加丰富的引用信息：

```sh
$ git for-each-ref --format="refname=%(refname)
author=%(authorname)
subject=%(subject)"
refname=refs/heads/cat-file-batch-refactor
author=ZheNing Hu
subject=[GSOC] ref-filter: remove grab_oid() function
refname=refs/heads/cat-file-batch-refactor-2
author=ZheNing Hu
subject=[GSOC] cat-file: use fast path when using default_format
refname=refs/heads/cat-file-batch-refactor-rebase-version
author=ZheNing Hu
subject=[GSOC] cat-file: use fast path when using default_format
refname=refs/heads/master
...
```

如 github, gitlab, vscode-git 扩展在需要帮你切换分支或者标签会使用到这个命令。

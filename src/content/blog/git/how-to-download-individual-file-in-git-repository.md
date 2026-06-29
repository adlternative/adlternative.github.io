---
title: How to Download Individual Files from a Git Repository
titleZh: 如何从 Git 仓库中只下载单个文件
date: 2021-01-02 14:53:52
tags: git
---

<div class="lang-section" data-lang="en">

When using Git to download resources such as e-books, network speed limits can make cloning a large repository very time-consuming. We often wonder: why can't we just download a single file or one or two directories?

I remember running into this problem while staying at home during the 2020 pandemic. At the time, I used an odd method I found online: downloading with SVN.

Only recently did I realize that Git itself supports a feature called sparse checkout for fetching a single file or directory.

Let's take [this repository](https://github.com/chenshuo/recipes/tree/master/sudoku) as an example.

I only want the README from chenshuo's recipes. What should we do?

```bash
adl@ADLADL ~/gitTest2 % git init
已初始化空的 Git 仓库于 /home/adl/gitTest2/.git/
adl@ADLADL ~/gitTest2 (git)-[master] % git remote add origin git@git.zhlh6.cn:chenshuo/recipes.git
adl@ADLADL ~/gitTest2 (git)-[master] % git config core.sparsecheckout true
adl@ADLADL ~/gitTest2 (git)-[master] % echo sudoku/README >> .git/info/sparse-checkout
adl@ADLADL ~/gitTest2 (git)-[master] % git fetch --depth 1 origin master
remote: Enumerating objects: 669, done.
remote: Counting objects: 100% (669/669), done.
remote: Compressing objects: 100% (574/574), done.
remote: Total 669 (delta 171), reused 374 (delta 84), pack-reused 0
接收对象中: 100% (669/669), 363.53 KiB | 225.00 KiB/s, 完成.
处理 delta 中: 100% (171/171), 完成.
来自 git.zhlh6.cn:chenshuo/recipes
 * branch            master     -> FETCH_HEAD
 * [新分支]          master     -> origin/master
adl@ADLADL ~/gitTest2 (git)-[master] % ll
总用量 0
adl@ADLADL ~/gitTest2 (git)-[master] % ll -a
总用量 20K
drwxr-xr-x   3 adl adl 4.0K  1月  2 14:45 .
drwxr-xr-x 134 adl adl  12K  1月  2 14:49 ..
drwxr-xr-x   8 adl adl 4.0K  1月  2 14:49 .git
adl@ADLADL ~/gitTest2 (git)-[master] % git checkout master
分支 'master' 设置为跟踪来自 'origin' 的远程分支 'master'。
已经位于 'master'
adl@ADLADL ~/gitTest2 (git)-[master] % ll
总用量 4.0K
drwxr-xr-x 2 adl adl 4.0K  1月  2 14:49 sudoku
adl@ADLADL ~/gitTest2 (git)-[master] % ll sudoku
总用量 4.0K
-rw-r--r-- 1 adl adl 129  1月  2 14:49 README
```

As we can see, `git config core.sparsecheckout true` and `git fetch --depth 1 origin master` are the key steps.

The sparse checkout mechanism lets us check out only specified directories or files, which greatly reduces the time Git spends working with large repositories. To check out only the desired directory or file, write its path into `.git/info/sparse-checkout`.

When I use sparse-checkout, it shows me the files matching the sparse-checkout pattern:

```bash
adl@ADLADL ~/gitTest2 (git)-[master] % git sparse-checkout list
sudoku/README
```

How does Git do this?

We can use `tree` to see what `.git` actually looks like:

```
adl@ADLADL ~/gitTest2 (git)-[master] % tree .git
.git
├── branches
├── config
├── description
├── FETCH_HEAD
├── HEAD
├── hooks
│   ├── applypatch-msg.sample
│   ├── commit-msg.sample
│   ├── fsmonitor-watchman.sample
│   ├── post-update.sample
│   ├── pre-applypatch.sample
│   ├── pre-commit.sample
│   ├── pre-merge-commit.sample
│   ├── prepare-commit-msg.sample
│   ├── pre-push.sample
│   ├── pre-rebase.sample
│   ├── pre-receive.sample
│   ├── push-to-checkout.sample
│   └── update.sample
├── index
├── info
│   ├── exclude
│   └── sparse-checkout
├── logs
│   ├── HEAD
│   └── refs
│       ├── heads
│       │   └── master
│       └── remotes
│           └── origin
│               └── master
├── objects
│   ├── info
│   └── pack
│       ├── pack-7913f37baa4baa82642cd2440a52671672e69343.idx
│       ├── pack-7913f37baa4baa82642cd2440a52671672e69343.pack
│       ├── pack-d06aacdd30d2cb54dc72f48fb8efe925bebfa4b2.idx
│       └── pack-d06aacdd30d2cb54dc72f48fb8efe925bebfa4b2.pack
├── packed-refs
├── refs
│   ├── heads
│   │   └── master
│   ├── remotes
│   │   └── origin
│   │       └── master
│   └── tags
└── shallow

16 directories, 31 files
```

We don't see any Git objects under `.git/obeject/xx/xxxx..`, but we can see that `.git/obejects/pack/` contains some files ending in `.pack` or `.idx`.

Let's also check whether the index has changed:

```bash
adl@ADLADL ~/gitTest2 (git)-[master] % git ls-files -s         
100644 2cffc1513fd35a654d36ffd848c3dbc57e6afdcd 0       .gitignore
100644 849b7ee53ca8f3fd88bd353e89572e72c9bbe18a 0       LICENSE
100644 e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 0       README
100644 e15f560a0014472f9eab51826aa9986e99a1aa28 0       algorithm/combination.cc
100644 0b6d22de6afcd2cebcbffe175b3fc1c382b977d8 0       algorithm/iprange.cc
100644 8552f50a08192954399d3cc1fd8c8c2e51d8c10c 0       algorithm/mergeMaps.cc
...
```

Well, we can see that all files from the latest commit's tree are listed here... how is that possible?

`git fetch --depth 1 origin` fetches only the latest commit history.

As the official docs say:

`git clone/fetch --depth <depth>`:

`Create a shallow clone with a history truncated to the specified number of commits. `

So we get the latest file information (probably recorded in `.idx`/`.pack`).

Git uses `update-index` to write these files into the index.

Then, because we specified the checkout file `README`,

`README` is restored to the working directory.

This greatly speeds up downloading a small part of a Git repository.

We no longer have to spend hours cloning a repository just to read a few books `:)`

I haven't covered all the details of `git-sparse-checkout`; you can find more here:
[official docs : git-sparse-checkout](https://git-scm.com/docs/git-sparse-checkout/2.28.0)

Thanks.

</div>

<div class="lang-section" data-lang="zh">

使用 Git 下载一些书籍等资源时，由于网速限制，克隆一个大型仓库往往非常耗时。我们常有这样的困惑：为什么不能只下载某一个文件或一两个目录呢？

我记得 2020 年疫情期间居家时就遇到过这个问题。当时我采用了一种在网上看到的奇怪方法：用 svn 下载。

直到最近我才发现，Git 本身就支持一种叫做 sparse checkout 的方法，可以只获取单个文件或目录。

我们以 [这个仓库](https://github.com/chenshuo/recipes/tree/master/sudoku) 为例。

我只想拿到 chenshuo/recipes 里的这个 README。该怎么做呢？

```bash
adl@ADLADL ~/gitTest2 % git init
已初始化空的 Git 仓库于 /home/adl/gitTest2/.git/
adl@ADLADL ~/gitTest2 (git)-[master] % git remote add origin git@git.zhlh6.cn:chenshuo/recipes.git
adl@ADLADL ~/gitTest2 (git)-[master] % git config core.sparsecheckout true
adl@ADLADL ~/gitTest2 (git)-[master] % echo sudoku/README >> .git/info/sparse-checkout
adl@ADLADL ~/gitTest2 (git)-[master] % git fetch --depth 1 origin master
remote: Enumerating objects: 669, done.
remote: Counting objects: 100% (669/669), done.
remote: Compressing objects: 100% (574/574), done.
remote: Total 669 (delta 171), reused 374 (delta 84), pack-reused 0
接收对象中: 100% (669/669), 363.53 KiB | 225.00 KiB/s, 完成.
处理 delta 中: 100% (171/171), 完成.
来自 git.zhlh6.cn:chenshuo/recipes
 * branch            master     -> FETCH_HEAD
 * [新分支]          master     -> origin/master
adl@ADLADL ~/gitTest2 (git)-[master] % ll
总用量 0
adl@ADLADL ~/gitTest2 (git)-[master] % ll -a
总用量 20K
drwxr-xr-x   3 adl adl 4.0K  1月  2 14:45 .
drwxr-xr-x 134 adl adl  12K  1月  2 14:49 ..
drwxr-xr-x   8 adl adl 4.0K  1月  2 14:49 .git
adl@ADLADL ~/gitTest2 (git)-[master] % git checkout master
分支 'master' 设置为跟踪来自 'origin' 的远程分支 'master'。
已经位于 'master'
adl@ADLADL ~/gitTest2 (git)-[master] % ll
总用量 4.0K
drwxr-xr-x 2 adl adl 4.0K  1月  2 14:49 sudoku
adl@ADLADL ~/gitTest2 (git)-[master] % ll sudoku
总用量 4.0K
-rw-r--r-- 1 adl adl 129  1月  2 14:49 README
```

可以看到，`git config core.sparsecheckout true` 和 `git fetch --depth 1 origin master` 是关键步骤。

sparse checkout 机制允许只检出指定的目录或文件，这能大幅缩短 Git 在大型仓库中执行命令的时间。要只检出某个目录或文件，需要把对应路径写入 `.git/info/sparse-checkout` 文件。

使用 sparse-checkout 时，它会列出匹配该模式的文件：

```bash
adl@ADLADL ~/gitTest2 (git)-[master] % git sparse-checkout list
sudoku/README
```

Git 是怎么做到的呢？

我们用 `tree` 看看 `.git` 目录实际长什么样：

```
adl@ADLADL ~/gitTest2 (git)-[master] % tree .git
.git
├── branches
├── config
├── description
├── FETCH_HEAD
├── HEAD
├── hooks
│   ├── applypatch-msg.sample
│   ├── commit-msg.sample
│   ├── fsmonitor-watchman.sample
│   ├── post-update.sample
│   ├── pre-applypatch.sample
│   ├── pre-commit.sample
│   ├── pre-merge-commit.sample
│   ├── prepare-commit-msg.sample
│   ├── pre-push.sample
│   ├── pre-rebase.sample
│   ├── pre-receive.sample
│   ├── push-to-checkout.sample
│   └── update.sample
├── index
├── info
│   ├── exclude
│   └── sparse-checkout
├── logs
│   ├── HEAD
│   └── refs
│       ├── heads
│       │   └── master
│       └── remotes
│           └── origin
│               └── master
├── objects
│   ├── info
│   └── pack
│       ├── pack-7913f37baa4baa82642cd2440a52671672e69343.idx
│       ├── pack-7913f37baa4baa82642cd2440a52671672e69343.pack
│       ├── pack-d06aacdd30d2cb54dc72f48fb8efe925bebfa4b2.idx
│       └── pack-d06aacdd30d2cb54dc72f48fb8efe925bebfa4b2.pack
├── packed-refs
├── refs
│   ├── heads
│   │   └── master
│   ├── remotes
│   │   └── origin
│   │       └── master
│   └── tags
└── shallow

16 directories, 31 files
```

我们在 `.git/obeject/xx/xxxx..` 下看不到任何 Git 对象，却能看到 `.git/obejects/pack/` 目录里有一些后缀为 `.pack` 或 `.idx` 的文件。

我们再看看 index 是否发生了变化：

```bash
adl@ADLADL ~/gitTest2 (git)-[master] % git ls-files -s         
100644 2cffc1513fd35a654d36ffd848c3dbc57e6afdcd 0       .gitignore
100644 849b7ee53ca8f3fd88bd353e89572e72c9bbe18a 0       LICENSE
100644 e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 0       README
100644 e15f560a0014472f9eab51826aa9986e99a1aa28 0       algorithm/combination.cc
100644 0b6d22de6afcd2cebcbffe175b3fc1c382b977d8 0       algorithm/iprange.cc
100644 8552f50a08192954399d3cc1fd8c8c2e51d8c10c 0       algorithm/mergeMaps.cc
...
```

可以看到，最新一次提交的树里所有文件都在这里列出来了……这怎么可能？

`git fetch --depth 1 origin` 只获取最近一次的提交历史。

官方文档的说法是：

`git clone/fetch --depth <depth>`：

创建一个浅克隆，历史记录会被截断到指定数量的提交。

因此我们获取到了最新文件的信息（这些信息可能记录在 `.idx`/`.pack` 中）。

Git 使用 `update-index` 把这些文件写入 index。

接着，由于我们指定了要检出的文件是 `README`，

`README` 就被还原到了工作目录中。

这大大加快了我们只下载 Git 仓库中一小部分内容的效率。

我们再也不用为了读几本书而花几个小时去克隆整个仓库了 `:)`

关于 `git-sparse-checkout` 还有一些内容我没有讲到，可以在这里查看：
[官方文档：git-sparse-checkout](https://git-scm.com/docs/git-sparse-checkout/2.28.0)

谢谢。

</div>

---
title: how_to_download_individual_file_in_git_repository
date: 2021-01-02 14:53:52
tags:
# hidden: true
---

when we are using git to download some books,because of network speed limit,it often takes a lot of time to download a large warehouse.we ofen have such confuse ,why we couldn't just download only one file or one/two catalog?

I remember that I encountered such a problem when the epidemic was at home in 2020.In fact, I was based on a strange method on the Internet: use svn to download.

Only now I discovered that git supports a method called sparse checkout to obtain a single file or directory.

look at this picture:
![a.png]()
here we are in [there](https://github.com/chenshuo/recipes/tree/master/sudoku)

I just want get this README from chenshuo's recipes.
So what should we do?
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

as we see,`git config core.sparsecheckout true`and ` git fetch --depth 1 origin master` is key component

The sparse checkout mechanism allows to check out only specified directories or files, which will greatly shorten the time for Git to execute commands in large Git warehouses. To check out only the specified directory or file, you need to specify the path of the directory or file in the .git/info/sparse-checkout file.

When I use sparse-checkout ,it show me the file which is use this sparse-checkout pattern

```bash
adl@ADLADL ~/gitTest2 (git)-[master] % git sparse-checkout list
sudoku/README
```

how can git do this?

we use tree to see what the actually .git looks like:

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

we can't see any git objects in `.git/obeject/xx/xxxx..`,but we can see that `.git/obejects/pack/`have some files subffix is .pack or .idx .

And we see if the index has been changed:
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
Well, we can see this the last time commit's tree all files are here...how could it be possible?

`git fetch --depth 1 origin`get last time commit history.
As offical docs say:
`git clone/fetch` `--depth <depth>`:
`Create a shallow clone with a history truncated to the specified number of commits. `

So we get Last files info.(may be the info record in .idx/.pack)

git use update-index to write these files into index.

And then ,since we specified the checkout file README.md

README.md back to work directory.

It's greatly speeds up our download of a small part of git.

We no longer have to spend hours going to the git repository to read a few of these books`:)`

some `git-sparse-checkout`info I haven't tell at all ,you can see it in there:
[official docs : git-sparse-checkout](https://git-scm.com/docs/git-sparse-checkout/2.28.0)

Thanks.
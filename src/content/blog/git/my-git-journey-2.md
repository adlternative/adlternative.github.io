---
title: 'My Git Learning Journey 2'
titleZh: '我的git学习之路2'
date: 2020-12-19 22:18:33
tags: git
---

<div class="lang-section" data-lang="en">

In Linus's original vision, Git was designed as a file system. Many people now call it a "content-addressable file system." Because Git keeps most of its design logic on the client side, it can also be described as a decentralized piece of software...

Every day we run `git add`, `git commit`, `git push`, letting commands manage the storage and upload of our daily code repositories. When errors appear, we often feel at a loss. We can't help but wonder: how does Git actually complete an upload? Why do we need to `add` files every time instead of committing and pushing directly? In VS Code, when I switch to the dev branch, new files appear locally and old files are deleted?

It's time to talk about how Git works under the hood.

Git has three very important concepts: the working tree (W), the staging area/index (I), and the repository (R). There is also a "database." All of these are essential components that keep Git running, and every Git command uses contents from these areas.

```
$ tree .git
.git
├── branches
├── config
├── description
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
│   └── update.sample
├── info
│   └── exclude
├── objects
│   ├── info
│   └── pack
└── refs
    ├── heads
    └── tags

9 directories, 16 files
```

When we create a new Git repository, the `.git` directory usually has this tree structure. For now, we won't care about what `branches`, `info`, `hooks`, and `description` are used for.

1. We can read `.git/config`, which stores some user configuration for the Git program to read, for example:
```
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
```
2. `refs` means references. We can look at the contents of files in the `refs/heads/` directory: a hash string, such as `4f0dd3c1d235806c685f6cd36acd11fecd2da1f2`.
3. `.git/HEAD` is a text file containing `ref: refs/heads/master`. It is a "pointer" (the head pointer, pointing to the last commit) that indicates the current commit position. Whenever the Git program needs to know the current commit, it follows the content in `HEAD` to find the file `.git/refs/heads/master`, and then uses the hash in `.git/refs/heads/master` to look up the object file in the database. Here this file will be a commit-type object. Of course, `.git/refs/heads/master` is still empty now, because we haven't made any commits yet. After our first `git add` + `git commit`, `.git/refs/heads/master` will appear. With the `HEAD` design, Git can quickly find the content corresponding to the current commit by indexing `HEAD`.
4. `.git/objects` is what we call the Git database, or object store. For now it contains no stored objects. Once we run `git add`, this directory will have new files, which will hold our various "objects" (blob file objects, commit objects, tree directory objects, tag objects).

Later, every time we run Git, it reads from or writes to this `.git` directory.
So far we have seen the database `.git/objects` and the local working directory, but the concepts of the staging area and repository are still unclear. It seems we need to continue exploring.

### When we add a file

Look, if we run `touch a.c && echo aaa >a.c`, nothing in the `.git` directory changes. But when we run `git add a.c`, an `index` file suddenly appears — this is our staging area. A new directory and file also appear in our database, seemingly a hash string. Indeed that is the case. The formula for calculating this hash is also very simple: `textHash=sha1sum("blob (textSize)(null)(text)")`, where `text` is the content of `a.c` and `textSize` is the size of `a.c`. But what is the content of this hash file? If we directly `cat .git/objects/72/943a16fb2c8f38f9dde202b7a70ccc19c52f34`, we get a bunch of garbled bytes like `xK��OR0aHLL��!`. But when we use `git cat-file blob 72943a16fb2c8f38f9dde202b7a70ccc19c52f34`, we see the content we wrote into `a.c`: `aaa`. The reason we see garbled output is that Git has compressed the content. The formula for the compressed file content can also be summarized as `objText=compression("blob (textSize) 0 text")`. Without compression, our `.git` repository would be too large, which would be a huge burden for network transfer...

So now we have seen the first blob-type object file. It is the result of Git serializing `a.c`, internally calling `hash_object` to obtain the hash and writing it into a file at `.git/hash[0:2]/hash[2:-1]`. It is worth mentioning that after obtaining the file's hash, we can quickly locate the blob object file in the database, and we can also use this blob object file to quickly restore the original file locally based on the original file size and content recorded inside. Ah, this is really interesting! The hash feels as friendly as a C pointer, making it easy to address objects, and at the same time we seem to have the magic power of serializing pointers...

(What are the benefits of content addressing?)
```
├── index
├── info
│   └── exclude
├── objects
│   ├── 72
│   │   └── 943a16fb2c8f38f9dde202b7a70ccc19c52f34
│   ├── info
│   └── pack
└── refs
```

</div>

<div class="lang-section" data-lang="zh">

git 在linus原来的想法中是作为一个文件系统去设计的,现在很多人都称之为"内容寻址文件系统",由于git把大部分的业务设计停留在客户端，所以也可以说git是一种去中心化的软件...

我们平时天天都在`git add`,`git commit`,`git push`
任由命令管理我们的日常的代码仓库的储存和上传，遇到了报错又经常手足无措，心中不免有所疑惑，git它是如何完成上传的呢?为什么每次我们都需要`add`文件呢,而不直接commit,push?在vscode上我一点切换到dev分支本地会有新的文件生成，旧的文件删除?

是时候讲讲git原理了


git 有三个很重要的概念：叫做工作区(W),暂存区(I),版本库(R).其实还应该有一个"数据库"，它们都是维护git运作的重要组成,所有的git命令都是会用到这些区的内容
```
$ tree .git
.git
├── branches
├── config
├── description
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
│   └── update.sample
├── info
│   └── exclude
├── objects
│   ├── info
│   └── pack
└── refs
    ├── heads
    └── tags

9 directories, 16 files
```


当我们新建一个git仓库的时候往往`.git`目录是这样的树型结构,暂时不关心`branches`,`info`,`hooks`,`description`有什么用.

1. 我们可以读取`.git/config`是存储一些用户的配置，供git程序去读取,比如这样的
```
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
```
2. refs是引用的意思,我们可以通过`refs/heads/`目录中文件中的内容:一串hash值，比如`4f0dd3c1d235806c685f6cd36acd11fecd2da1f2`
3. `.git/HEAD`是一个文本文件,里面写着`ref: refs/heads/master`,它是一个表面当前提交位置的＂指针＂(头指针，指向最后一次commit)，git 程序每次需要知道当前的提交是谁的时候就会根据HEAD中的内容去寻找`.git/refs/heads/master`文件，再根据`.git/refs/heads/master`中的hash去数据库寻找对象文件，这里这个文件会是一个commit类型的文件.当然`.git/refs/heads/master`现在那里还是空的，因为我们当前尚未有过提交，等我们`git add`+`git commit`第一次提交以后就会出现`.git/refs/heads/master`,有了HEAD的设计，我们就能用git程序通过索引`HEAD`快速找到此刻对应的提交的内容
4. `.git/objects`,这就是我们叫做的git数据库或者说对象库,里面暂时还没有存入对象,等到我们`git add`了，这个目录就会有新的文件产生，里面将存放我们的各种"对象"(blob文件对象,commit提交对象,tree目录树对象,tag标签对象)

后面每次执行git程序都会从这个.git目录读取或者写入内容.
暂时我们已经看到数据库`.git/objects`，以及本地的工作目录,但暂存区和版本库的概念却依旧不明朗,看来还需要继续我们探究

### 当我们添加一个文件时

look,我们`touch a.c && echo aaa >a.c`发现git目录没啥变化，但当我们`git add a.c`的时候,竟然出现一个index文件，这就是我们的暂存区;在我们的数据库中也多出一个目录和文件，貌似就是一个串哈希值.的确如此，这串哈希的计算公式也很简单`textHash=sha1sum("blob (textSize)(null)(text)")`,其中`text是a.c的内容,textSize是a.c的大小`.但这个hash文件内容是什么呢?我们若直接用`cat .git/objects/72/943a16fb2c8f38f9dde202b7a70ccc19c52f34`读到是一串乱码，`xK��OR0aHLL��!`,但我们使用`git cat-file blob 72943a16fb2c8f38f9dde202b7a70ccc19c52f34`看到的就是我们写入`a.c`的内容`aaa`,看到乱码的原因是git做了一次压缩,这个压缩过后的文件内容公式其实也可以总结出一个公式`objText=compression("blob (textSize) 0 text")`,如果不去压缩文件,那么我们的`.git`仓库过大，对于网络传输来说是一个巨大的负担...
于是乎我们已经看到第一个blob类型对象文件,它是git将`a.c`序列化的结果,底层调用了`hash_object`去获取hash并写入到`.git/hash[0:2]\hash[2:-1]`的文件中．可以提到的是,我们可以在获取了文件哈希的hash值以后快速找到数据库中的blob对象文件，也可以通过这个blob对象文件快速根据其文件中记载的原文件大小和原文件内容还原到本地，啊，这真的很有趣!hash仿佛就像一个c语言的地址一样亲切易于给对象寻址，同时我们仿佛有能将指针序列化的魔力...
(基于内容寻址的好处是什么)
```
├── index
├── info
│   └── exclude
├── objects
│   ├── 72
│   │   └── 943a16fb2c8f38f9dde202b7a70ccc19c52f34
│   ├── info
│   └── pack
└── refs
```

</div>

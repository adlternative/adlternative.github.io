---
title: git命令大全
date: 2020-12-19 22:40:28
tags:
# hidden: true
---

`git ls-tree -l HEAD`
* `ls-tree`可以读取head指向的目录树的所有信息
* `-l`查看对象大小

`git ls-files --stage `
*查看暂存区文件


`git checkout <commit> -- path`会将提交中的文件覆盖本地和暂存区中的同名文件，无论你当前有没有add,这个提交中的文件都会覆盖你的工作区和暂存区
### `git checkout -- path`
根据上面所言,应该会默认当前分支的提交覆盖本地和暂存区才对,但其实默认未指定commit情况下是会将暂存区中的内容覆盖本地


### `git checkout branch`
  * 情况1:如果另外一个分支没有提交过本文件
  不会修改本分支本地的文件，也不会修改暂存区，只是修改了头指针的指向，（WARN!!!：另一个分支会看到本地和暂存区的变化,你在本地修改了a.c,那么把版本库切过来的时候,它当时本地或暂存区若没有a.c,a.c对于它来说是＂新建＂的,若存在,a.c对它来说是＂修改＂的．其实这里也不能这么算：因为根本上就是暂存区和本地的该文件仍然保留着，不会被另一个分支的＂空白＂意外删去：正如情况所言，它没有提交过本文件）
  * 情况2:如果另外一个分支提交过本文件
    会阻止
    ```
    error: 您对下列文件的本地修改将被检出操作覆盖：
            haha.c
    请在切换分支前提交或贮藏您的修改。
    正在终止
    ```
  * 综上所述:本分支checkout到另外一个分支，本分支会将看本地和暂存区中的文件是不是另一个分支之前没有过的文件,如果提交记录中没有则本地的未提交的（(add or no add)and no commit）会保留下来,如果之前提交记录中有就报错,当然其余本分支没有修改的文件会被另一个分支直接覆盖(如果另一个分支有此文件)，当然那些本分支没有的文件而另一个分支有，切换到另一个分支也会创建出来


`git rev-parse refs/heads/master`可以用来显示引用对象的哈希

`git cat-file commit HEAD`可以用来查看HEAD提交对应的提交对象信息

`git cat-file blob HEAD:xxx`可以用来查看HEAD提交对应的blob对象对应的文件内容

`git rev-parse HEAD^^{tree}`可以用来解析并打印HEAD的父提交的tree对象hash,注意这里第二个^应该是表示寻找HEAD对应的tree对象，第一个才是找父提交

`git reset --hard master@{2}`将master重置为两次改变以前的值（这个改变是针对命令的改变,see as git reflog）

`git reset --hard HEAD^`会将HEAD引用指向新的commit,并用引用指向的commit上的目录树替换暂存区，已经变化的暂存区替换工作区，注意那些没有被git跟踪的文件并没有消失,而add后的文件却消失了.奇怪的特性...

`git reset --hard HEAD`会将暂存区的回退成和HEAD commit相同,但是工作区未跟踪的新文件不受影响...,受跟踪的才回退.

`git reset --soft <commit>`会将HEAD引用指向新的commit,但暂存区和本地内容不变，这样一般来说我们本次做的修改和已经添加到暂存区的内容就会被保存下来．

`git reset --mixed <commit>`(默认)，工作区不改变，暂存区回退到上一次提交，这意味着我那些add上去的内容都没了，本地的都还在

commit 对象的哈希计算公式:`hash=sha1sum("commit (messageSize)(null)(message)")`其中`message=tree treeHash\nparent parentHash\nauthor XXX <mail> timestmp (时差)\ncommitter XXX <mail> timestmp (时差)\n\n(提交信息)`

blob 对象的哈希计算公式:`hash=sha1sum("blob (messageSize)(null)(message)")`其中`message=原文件内容`

tree 对象的哈希计算公式:`hash=sha1sum("tree (messageSize)(null)(message)")`其中`message=...`


git 使用sha1作为提交ID的原因：需要"全球唯一",当然现在已经证明可能有冲突


git stash的影响:
  默认重置工作区和index ->版本库,-k不修改index,下次工作区加回来会有冲突须手动解决
  * workD:上次版本库没有本文件则不变,上次有则变上次,下次会变回来
  * index:删,下次若有index同名文件,则冲突并手动解决;下次若有workD同名文件,则阻止除非你重新将这个文件add
  * index+(w修改)下次一起放回index
  * workD ->workD

git如何合并提交:[there](https://segmentfault.com/a/1190000007748862)
```bash
git rebase -i 12a23b(你需要合并的commit的父节点)
```


git merge xxx 是根据三路合并算法将提交xxx的内容和本commit拿过来做出比较后生成新版本作为公有子节点。
git rebase xxx 是是根据三路合并算法将本提交的内容添加到xxx分支上。
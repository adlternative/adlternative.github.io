---
title: 我的git学习之路
date: 2020-12-13 22:35:18
tags: git
hidden: true
---


### git游戏收获的经验和解答
...前面好多关没去写...
再补吧（爬）

##### 远程

第11关：git 远程跟踪
我们需要将我们的自己创建出来的新分支`side`设置为跟踪`origin/master`,这带来的后果是本应该跟踪`origin/master`
的本地`master`不再跟踪它了，当然这不是坏处...

下面跟踪了以后将远程的`origin/master`拉下来变基（中间我们可以对冲突的内容进行修改）,再推送上去就完事喽！

```bash
git branch -u o/master side
git pull --rebase
git push
```

第12关：

get到的点：

* `git push origin master`是将本地的master分支比远程的master分支没有的提交添加上去，可以同步master和origin/master

* 在我们HEAD没有指向一个分支的情况下，直接git push会失效，这时候我们会需要`git push origin master`,在这种场景下我们需要考虑到的是我们是否应该让HEAD checkout 到某个分支，或者将git pull一下


```
git push origin foo 
```

第13关：

`git push origin foo^:master`可以将foo之前的一个提交上传给远程的master,origin/master将会指向`foo^`

`git push origin origin master:newBranch`可以将master提交给远程的newBranch(本地会出现o/newBranch)即使newBranch不存在

```bash
git push origin master^:foo
```

```
git push origin foo:master 
```

第14关：

git fetch就是下载远程`origin/xxx`放到本地`orgin/xxx`这样我们就可以先对远程分支进行检查，之后再合并

git fetch更像是含有git push 相反意义

需求是从远程的master前一个提交下载到本地的foo,再将远程的foo下载到本地的master,再将本地的foo和master进行合并，见答案即可

```bash
git fetch origin master^:foo
git fetch origin foo:master
git checkout foo
git merge master
```



第15关：

```bash
git push origin :foo
```

将空push会删除远程分支foo...这真诡异

```
git fetch orgin :bar
```

将空fetch会创建本地分支bar...这...



第16关：

`git pull origin foo` 相当于：

```bash
git fetch origin foo; git merge o/foo
```

`git pull origin bar~1:bugFix` 相当于：

```bash
git fetch origin bar~1:bugFix; git merge bugFix
```

pull = fetch+merge

如果当前本地在bar分支

```bash
git pull origin master:foo	
```

它先在本地创建了一个叫 `foo`的分支，从远程仓库中的 master 分支中下载提交记录，并合并到 `foo`，然后再 merge 到我们的当前检出的分支 `bar`上。

我们使用fetch从远程下载的时候如果指定的本地分支不存在，会在本地创建一个新的分支指向我们的下载

如果我们只是fetch,带来的后果是下载到本地的o/master,o/bar(当然这是一个好处)

```bash
git checkout c1
git fetch origin master:side
git fetch origin bar:foo
git checkout master
git merge foo
git merge side
```



### git需要注意的事项


it游戏收获的经验和解答
…前面好多关没去写
git 回退的三种方式：

git clean会删除那些未tracked的文件，也就是上一次commit没有，这次新创建的文件
### git游戏收获的经验和解答
...前面好多关没去写...
再补吧（爬）

##### 远程

第11关：git 远程跟踪
我们需要将我们的自己创建出来的新分支`side`设置为跟踪`origin/master`,这带来的后果是本应该跟踪`origin/master`
的本地`master`不再跟踪它了，当然这不是坏处...

下面跟踪了以后将远程的`origin/master`拉下来变基（中间我们可以对冲突的内容进行修改）,再推送上去就完事喽！

```bash
git branch -u o/master side
git pull --rebase
git push
```

第12关：

get到的点：

* `git push origin master`是将本地的master分支比远程的master分支没有的提交添加上去，可以同步master和origin/master

* 在我们HEAD没有指向一个分支的情况下，直接git push会失效，这时候我们会需要`git push origin master`,在这种场景下我们需要考虑到的是我们是否应该让HEAD checkout 到某个分支，或者将git pull一下


```
git push origin foo 
```

第13关：

`git push origin foo^:master`可以将foo之前的一个提交上传给远程的master,origin/master将会指向`foo^`

`git push origin origin master:newBranch`可以将master提交给远程的newBranch(本地会出现o/newBranch)即使newBranch不存在

```bash
git push origin master^:foo
```

```
git push origin foo:master 
```

第14关：

git fetch就是下载远程`origin/xxx`放到本地`orgin/xxx`这样我们就可以先对远程分支进行检查，之后再合并

git fetch更像是含有git push 相反意义

需求是从远程的master前一个提交下载到本地的foo,再将远程的foo下载到本地的master,再将本地的foo和master进行合并，见答案即可

```bash
git fetch origin master^:foo
git fetch origin foo:master
git checkout foo
git merge master
```



第15关：

```bash
git push origin :foo
```

将空push会删除远程分支foo...这真诡异

```
git fetch orgin :bar
```

将空fetch会创建本地分支bar...这...



第16关：

`git pull origin foo` 相当于：

```bash
git fetch origin foo; git merge o/foo
```

`git pull origin bar~1:bugFix` 相当于：

```bash
git fetch origin bar~1:bugFix; git merge bugFix
```

pull = fetch+merge

如果当前本地在bar分支

```bash
git pull origin master:foo
```

它先在本地创建了一个叫 `foo`的分支，从远程仓库中的 master 分支中下载提交记录，并合并到 `foo`，然后再 merge 到我们的当前检出的分支 `bar`上。

我们使用fetch从远程下载的时候如果指定的本地分支不存在，会在本地创建一个新的分支指向我们的下载

如果我们只是fetch,带来的后果是下载到本地的o/master,o/bar(当然这是一个好处)

```bash
git checkout c1
git fetch origin master:side
git fetch origin bar:foo
git checkout master
git merge foo
git merge side
```


<!-- ### git需要注意的事项 -->

#### git 回退的n种场景：

* answer:
  1. 需求:删除add后的文件`a.c`:`git reset HEAD`或者`git restore --staged a.c`,将这些暂存区中的文件回退到工作区,在vscode中也可看到`暂存的更改`变成了`更改`,证明文件已经回滚到工作区了,
  但这些文件仍然在我们的目录,这时候手动`rm`删除(如有更好方法请告诉我)
  2. 需求:如果之前已经被提交的文件`a.c`本次只修改后`add`,想要恢复上一次提交的模样:
  `git reset HEAD`或者`git restore --staged a.c`将文件从暂存区中恢复到工作区,
  `git restore a.c`可以恢复到上一次commit时的状态
  3. 需求:本次新建的文件`a.c`在add,commit未push的情况下如何回滚并删除:
  `git reset HEAD a.c`或者`git reset HEAD`后删除`a.c`并add,commit说明已经删除ok
  4. 需求:如果之前已经被提交的文件`a.c`本次修改后`add`+`commit`如何回退上个版本:
  `git reset HEAD^ a.c`,`git restore a.c`接着再add,commit说明已经回退ok
  5. 需求push 后回退:` git revert HEAD`接着再add,commit说明已经回退ok

#### git 初始化连接远程库的正确顺序

```bash
git init
git remote add origin git@github.com:adlternative/gitTest.git
git pull origin master --rebase=false
......
git add .
git commit -m ".."
git push --set-upstream origin master //将master设置跟踪origin/master再可以push
```
#### git secret　用法简介

```bash
暂时还没写
```
#### git lfs　用法简介

```bash
暂时还没写
```

#### git reset的三种模式 hard/soft/mixed(默认)
`git reset`的原理:让最新提交的指针回到以前某个时点，这个时间点之后的提交都从历史中消失。
`git checkout` 是在修改HEAD的指向，和`git reset`原理上有些不同

|模式 |  缓存区|提交|工作目录|
|--|--|--|--|
| soft |会回退到过去|不变|不变|
| hard |会回退到过去|会回退到过去|会回退到过去(危险!那些gitignore中标记的文件因为在工作目录所以也会被删除掉)|
| mixed(默认)| 会回退到过去 |会回退到过去|不变|
`git reset --soft HEAD`
`git reset --hard HEAD`
`git reset HEAD`
个人觉得经过上次的教训之后只敢使用默认的reset了(那些没有被Tracked的.gitignore中标记的文件全被删除了by use hard way)
`git commit`完后悔用`git reset --soft HEAD^`放弃最新提交


#### git rebase 究竟在做什么
![图片](/home/adl/图片/Screenshot_20201216_214640.png)
如图所示，master分支

我们在adl分支通过`git rebase master`将自己的内容分支私有的部分**移动**到master分支上，接着这条暗线就消亡了，接着我们可以通过`git checkout  master`切换到master分支，再`git rebase adl`将master快速前进到adl节点（这时候没有啥移动分支私有部分，因为master和adl在同一条提交链表上，于是乎作用就是快速移动）


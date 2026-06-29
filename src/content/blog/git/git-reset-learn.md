---
title: 'Learning git reset'
titleZh: 'git reset 学习笔记'
date: 2021-01-10 19:25:18
tags: git
draft: true
---

<div class="lang-section" data-lang="en">

```
git reset HEAD a.txt
```
This only replaces the index entry for `a.txt` with the version from the repository (HEAD). The working tree file is left untouched.


```
git reset HEAD
```
If a file has only been staged (added) without further working tree changes, nothing changes. If the file has been staged and then modified in the working tree, the staged version in the index will overwrite the working tree file.

```
git reset --hard HEAD a.txt
```
This is not allowed — you cannot specify a path with `--hard`. If you want to roll back a single file to an older version, use `git checkout -- file`.

```
git reset --hard HEAD
```
This resets both the index and the working tree to match HEAD. All uncommitted changes are discarded.



```
git reset --hard HEAD~
```
This moves HEAD back one commit and resets the index and working tree to that commit. The latest commit is discarded.

```
git reset --soft HEAD^
```
This moves HEAD back one commit but keeps the index and working tree unchanged. The changes from the discarded commit remain staged.

</div>

<div class="lang-section" data-lang="zh">

```
git reset HEAD a.txt
```
此命令只会用仓库中（HEAD）的版本覆盖暂存区中 `a.txt` 的索引条目，工作区文件保持不变。


```
git reset HEAD
```
如果文件只是被加入暂存区（add）而没有在工作区再次修改，则不会有任何变化。如果文件已被加入暂存区，随后又在工作区做了修改，那么暂存区中的版本会覆盖工作区中的文件。

```
git reset --hard HEAD a.txt
```
这种用法不合法，不能在使用 `--hard` 时指定具体路径。如果想把单个文件回退到旧版本，请使用 `git checkout -- file`。

```
git reset --hard HEAD
```
此命令会将暂存区和工作区都重置为 HEAD 的状态，所有未提交的更改都会被丢弃。



```
git reset --hard HEAD~
```
此命令将 HEAD 回退一个提交，并将暂存区和工作区重置到该提交，最新的提交会被丢弃。

```
git reset --soft HEAD^
```
此命令将 HEAD 回退一个提交，但保持暂存区和工作区不变。被撤销提交中的更改仍保留在暂存区中。

</div>

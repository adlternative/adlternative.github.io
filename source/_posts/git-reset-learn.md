---
title: git-reset-learn
date: 2021-01-10 19:25:18
tags: git
hidden: true
---

```
git reset HEAD a.txt
```
just repo overwrite index.


```
git reset HEAD
```
if the file just add before,nothing change.
if the file  add and changed local file,
the index file will overwrite local file.

```
git reset --hard HEAD a.txt
```
we can't use it.If we want rollback a file to
old version,
use `git checkout -- file`.

```
git reset --hard HEAD
```



```
git reset --hard HEAD~
```

```
git reset --soft HEAD^
```

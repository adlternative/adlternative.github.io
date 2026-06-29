---
title: 'git-checkout-learn'
date: 2021-01-10 18:15:50
tags: git
draft: true
---

<div class="lang-section" data-lang="en">

### git checkout

Sometimes, we get confused when trying to roll back a file version or a commit version; `git checkout` can be tricky.

But Git gives us many fallback options, such as `git reset`, `git revert`, `git checkout`, `git commit --amend` ...

We don't know which one to use. In this post, I will test a few different scenarios and give you a clear conclusion.

local----index----repo

### checkout file

---
```
git checkout -- a.txt
# or
git checkout a.txt
```

If we just created `a.txt`, or `a.txt` exists in the last commit:

1. If we have run `git add` but have not modified `a.txt` in the working directory.
   Conclusion: Nothing changes.
2. If we have run `git add a.txt` and then changed `a.txt` in the working directory again.
   Conclusion: The index version of `a.txt` overwrites the local working tree version.

---

### checkout commit file

```
git checkout HEAD a.txt
```

1. If `a.txt` is in the last commit:
   The repository version of `a.txt` overwrites both the index and the working tree.
2. If `a.txt` is newly created:
   error: pathspec 'a.txt' did not match any file(s) known to git.

The two different checkout forms produce different rollback behaviors: from the index (with `--`) or from the repository (with a commit).

</div>

<div class="lang-section" data-lang="zh">

### git checkout

有时候，当我们试图回滚文件版本或提交版本时，`git checkout` 会让我们感到困惑。

但 Git 提供了许多回退选项，例如 `git reset`、`git revert`、`git checkout`、`git commit --amend` ……

我们不知道应该使用哪一个。本文将尝试几种不同的情况，并给出明确的结论。

local----index----repo

### 检出文件

---
```
git checkout -- a.txt
# 或
git checkout a.txt
```

如果我们新建了 `a.txt`，或者 `a.txt` 已经存在于上一次提交中：

1. 如果我们之前只执行过 `git add`，但工作区中的 `a.txt` 未被再次修改。
   结论：没有任何变化。
2. 如果我们之前执行过 `git add a.txt`，然后又修改了工作区中的 `a.txt`。
   结论：暂存区中的 `a.txt` 会覆盖工作区中的 `a.txt`。

---

### 检出某个提交中的文件

```
git checkout HEAD a.txt
```

1. 如果 `a.txt` 存在于上一次提交中：
   仓库中的 `a.txt` 会同时覆盖暂存区和工作区。
2. 如果 `a.txt` 是新建的文件：
   error: pathspec 'a.txt' did not match any file(s) known to git.

两种不同的 `checkout` 方式对应不同的回滚来源：来自暂存区（使用 `--`）或来自仓库（使用提交）。

</div>

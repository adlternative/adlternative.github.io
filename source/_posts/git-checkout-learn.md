---
title: git-checkout-learn
date: 2021-01-10 18:15:50
tags: git
hidden: true
---

### git checkout

sometimes,we will confuse when we try to .git checkout is difficult to rollback file version or commit version.

But git provides us with a lot of fallback options, such as git reset, git revert, git checkout, git commit --amend ...

we don't know which one should we use.The bloger now is just try some different situation to use them,and give you a clear conclusion.

local----index----repo

### checkout file
---
```
git checkout -- a.txt or git checkout a.txt
```

if we new build a.txt or if a.txt is in the last commit.
   1. If we just use add before.
   Conclusion:Nothing change.
   1. If we use add a.txt before and change local a.txt again.
   Conclusion:The index a.txt overwrite local a.txt.
---

### checkout commit file
```
git checkout HEAD a.txt
```
1. if a.txt is in the last commit.
the repo a.txt overwrite index a.txt and repo index.
2. we new build a.txt.
error:HEAD commit don't have a.txt.

two different way checkout can have different rollback pattern: from index(with --) or from repo(with commit).
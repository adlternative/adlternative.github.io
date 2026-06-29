---
title: 'GSOC, Git Blog 10'
titleZh: "GSoC Git 博客 10"
date: 2021-07-25 21:29:59
tags: git
---

<div class="lang-section" data-lang="en">


## Week10 New Start

### Bug Solving

The first thing is the two bugs mentioned last week now have their solutions.

1. I asked ikke for help on IRC and learned where the bug was introduced: c49a177be (test-lib.sh: set COLUMNS=80 for --verbose repeatability), and then Atharva told me that there seems to be a thread on the mailing list discussing this bug: [progress test failure on fedora34](https://lore.kernel.org/git/49498ed0-cfd5-2305-cee7-5c5939a19bcf@campoint.net/). The conclusion is that when using `checkwinsize` option (default), bash will check and update the window size (by setting `LINES` and `COLUMNS`) after each external command. This causes the `COLUMENS=80` setting in the patch to become invalid.

The current solution is using `shopt -u checkwinsize` to disable this option.

```sh
diff --git a/t/test-lib.sh b/t/test-lib.sh
index 9e26860544..ebcd3b0bab 100644
--- a/t/test-lib.sh
+++ b/t/test-lib.sh
@@ -407,6 +407,7 @@ LC_ALL=C
 PAGER=cat
 TZ=UTC
 COLUMNS=80
+shopt -u checkwinsize
 export LANG LC_ALL PAGER TZ COLUMNS
 EDITOR=:
```

This bug has troubled me for a long time, thanks to the people mentioned above who helped me.

2. `GIT_CHERRY_PICK_HELP="Something" git cherry-pick <commit>...`
Junio believes that environment variable `GIT_CHERRY_PICK_HELP` is the implementation detail of rebase (or other sub-commands), so the correct solution to this bug is `unsetenv("GIT_CHERRY_PICK_HELP")` In `cmd_cherry_pick()`. In this way, `git cherry-pick` will ignore `GIT_CHERRY_PICK_HELP`. However, some functions of such a commonly used sub-command `git cherry-pick` have not been perfected, which was endorsed by Felipe. Maybe I can do my best to make some optimizations later...

### Project Progress

At Christian's suggestion, I split my patch series into two parts, the first part is to add two atoms `%(rest)` and `%(raw)` to the ref-filter; the second part is to let cat-file --batch reuse the logic of ref-filter. Currently I only submit the first part to the mailing list. This may arouse the enthusiasm of reviewers to review my patch `:)`. Ævar, Junio and Jacob gave me some suggestions about some code and commit message's details.
Now the patch is here: [[PATCH v2 0/5] [GSOC] ref-filter: add %(raw) and %(rest) atoms](https://lore.kernel.org/git/pull.1001.v2.git.1627135281887.gitgitgadget@gmail.com/). On the other hand, we started a new discussion on the performance of git cat-file --batch... [[GSOC] How to improve the performance of git cat-file --batch](https://lore.kernel.org/git/CAOLTT8RR3nvtXotqhSO8xPCzGQpGUA8dnNgraAjREZ6uLf4n4w@mail.gmail.com/)

</div>

<div class="lang-section" data-lang="zh">


## 第 10 周 新的开始

### 解决 Bug

首先要说的是，上周提到的两个 bug 现在都有了解决方案。

1. 我在 IRC 上向 ikke 求助，了解到这个 bug 是在 c49a177be（test-lib.sh: set COLUMNS=80 for --verbose repeatability）中引入的；然后 Atharva 告诉我邮件列表上似乎有一个讨论这个 bug 的帖子：[progress test failure on fedora34](https://lore.kernel.org/git/49498ed0-cfd5-2305-cee7-5c5939a19bcf@campoint.net/)。结论是，当使用 `checkwinsize` 选项（默认开启）时，bash 会在每次外部命令执行后检查并更新窗口大小（通过设置 `LINES` 和 `COLUMNS`）。这导致补丁中 `COLUMNS=80` 的设置失效。

目前的解决方案是使用 `shopt -u checkwinsize` 禁用该选项。

```sh
diff --git a/t/test-lib.sh b/t/test-lib.sh
index 9e26860544..ebcd3b0bab 100644
--- a/t/test-lib.sh
+++ b/t/test-lib.sh
@@ -407,6 +407,7 @@ LC_ALL=C
 PAGER=cat
 TZ=UTC
 COLUMNS=80
+shopt -u checkwinsize
 export LANG LC_ALL PAGER TZ COLUMNS
 EDITOR=:
```

这个 bug 困扰了我很久，感谢上面提到的人对我的帮助。

2. `GIT_CHERRY_PICK_HELP="Something" git cherry-pick <commit>...`
Junio 认为环境变量 `GIT_CHERRY_PICK_HELP` 是 rebase（或其他子命令）的实现细节，因此这个 bug 的正确解决方案是在 `cmd_cherry_pick()` 中调用 `unsetenv("GIT_CHERRY_PICK_HELP")`。这样 `git cherry-pick` 就会忽略 `GIT_CHERRY_PICK_HELP`。然而，像 `git cherry-pick` 这样常用的子命令还有一些功能尚未完善，Felipe 也认同这一点。也许之后我可以尽力做一些优化……

### 项目进展

在 Christian 的建议下，我把补丁系列分成了两部分：第一部分是向 ref-filter 添加 `%(rest)` 和 `%(raw)` 两个 atom；第二部分是让 cat-file --batch 复用 ref-filter 的逻辑。目前我只把第一部分提交到了邮件列表。这可能会激发审阅者 review 我补丁的热情 `:)`. Ævar、Junio 和 Jacob 给了我一些关于代码和提交信息的细节建议。
现在补丁在这里：[[PATCH v2 0/5] [GSOC] ref-filter: add %(raw) and %(rest) atoms](https://lore.kernel.org/git/pull.1001.v2.git.1627135281887.gitgitgadget@gmail.com/)。另一方面，我们开启了关于 git cat-file --batch 性能的新讨论……[[GSOC] How to improve the performance of git cat-file --batch](https://lore.kernel.org/git/CAOLTT8RR3nvtXotqhSO8xPCzGQpGUA8dnNgraAjREZ6uLf4n4w@mail.gmail.com/)

</div>

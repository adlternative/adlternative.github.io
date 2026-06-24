---
title: 'GSOC, Git Blog 10'
date: 2021-07-25 21:29:59
tags: git
---


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
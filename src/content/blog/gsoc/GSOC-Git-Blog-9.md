---
title: 'GSOC, Git Blog 9'
date: 2021-07-19 10:48:30
tags: git
---

## Week9 BUG REPORT

### BUG REPORT 1

* What did you do before the bug happened? (Steps to reproduce your issue)

  Because someone told me that `git cherry-pick` can't gave useful prompt information like `git rebase -i` does:

  ```
  You can amend the commit now, with

    git commit --amend

  Once you are satisfied with your changes, run

    git rebase --continue
  ```

  I found that I can take use of "GIT_CHERRY_PICK_HELP" environment variable,

  ```
  $ GIT_CHERRY_PICK_HELP="git cherry-pick --continue" ggg cherry-pick v1
  ```

  which will output prompt information "git cherry-pick --continue", good!

* What did you expect to happen? (Expected behavior)

  I could use `git cherry-pick --abort` to exit cherry-pick normally.

* What happened instead? (Actual behavior)

  Then I couldn't use `git cherry-pick --abort` to exit cherry-pick normally.

* Anything else you want to add:

  See the print_advice() in sequencer.c, `CHERRY_PICK_HEAD` will be removed
  if we use the env "GIT_CHERRY_PICK_HELP". It is used by `git rebase -i` and somewhere else.

  Here may have two solutions:
  1. Prevent users from using the environment variable "GIT_CHERRY_PICK_HELP".
  2. check if we are truly cherry-pick.

  ```c
  diff --git a/sequencer.c b/sequencer.c
  index 0bec01cf38..c01b0b9e9c 100644
  --- a/sequencer.c
  +++ b/sequencer.c
  @@ -409,8 +409,9 @@ static void print_advice(struct repository *r, int show_hint,
                   * (typically rebase --interactive) wants to take care
                   * of the commit itself so remove CHERRY_PICK_HEAD
                   */
  -               refs_delete_ref(get_main_ref_store(r), "", "CHERRY_PICK_HEAD",
  -                               NULL, 0);
  +               if (opts->action != REPLAY_PICK)
  +                       refs_delete_ref(get_main_ref_store(r), "", "CHERRY_PICK_HEAD",
  +                                       NULL, 0);
                  return;
          }
  ```

* [System Info]

  ```
  git version:
  git version 2.32.0
  cpu: x86_64
  no commit associated with this build
  sizeof-long: 8
  sizeof-size_t: 8
  shell-path: /bin/sh
  uname: Linux 5.12.15-arch1-1 #1 SMP PREEMPT Wed, 07 Jul 2021 23:35:29 +0000 x86_64
  compiler info: gnuc: 11.1
  libc info: glibc: 2.33
  $SHELL (typically, interactive shell): /bin/zsh
  ```

* [Enabled Hooks]

  None.

### BUG REPORT 2

* What did you do before the bug happened? (Steps to reproduce your issue)

  Normally execute the test under git/t.

* What did you expect to happen? (Expected behavior)

  Pass the test t/t0500-progress-display.sh.

* What happened instead? (Actual behavior)

  ```zsh
  $ sh t0500-progress-display.sh -d -i -v
	...
  expecting success of 0500.3 'progress display breaks long lines #1': 
          sed -e "s/Z$//" >expect <<\EOF &&
  Working hard.......2.........3.........4.........5.........6:   0% (100/100000)<CR>
  Working hard.......2.........3.........4.........5.........6:   1% (1000/100000)<CR>
  Working hard.......2.........3.........4.........5.........6:                   Z
     10% (10000/100000)<CR>
    100% (100000/100000)<CR>
    100% (100000/100000), done.
  EOF

          cat >in <<-\EOF &&
          progress 100
          progress 1000
          progress 10000
          progress 100000
          EOF
          test-tool progress --total=100000 \
                  "Working hard.......2.........3.........4.........5.........6" \
                  <in 2>stderr &&

          show_cr <stderr >out &&
          test_cmp expect out

  --- expect      2021-07-19 06:09:39.800189433 +0000
  +++ out 2021-07-19 06:09:39.803522767 +0000
  @@ -1,6 +1,5 @@
   Working hard.......2.........3.........4.........5.........6:   0% (100/100000)<CR>
   Working hard.......2.........3.........4.........5.........6:   1% (1000/100000)<CR>
  -Working hard.......2.........3.........4.........5.........6:                   
  -   10% (10000/100000)<CR>
  -  100% (100000/100000)<CR>
  -  100% (100000/100000), done.
  +Working hard.......2.........3.........4.........5.........6:  10% (10000/100000)<CR>
  +Working hard.......2.........3.........4.........5.........6: 100% (100000/100000)<CR>
  +Working hard.......2.........3.........4.........5.........6: 100% (100000/100000), done.
  not ok 3 - progress display breaks long lines #1
  #
  #               sed -e "s/Z$//" >expect <<\EOF &&
  #       Working hard.......2.........3.........4.........5.........6:   0% (100/100000)<CR>
  #       Working hard.......2.........3.........4.........5.........6:   1% (1000/100000)<CR>
  #       Working hard.......2.........3.........4.........5.........6:                   Z
  #          10% (10000/100000)<CR>
  #         100% (100000/100000)<CR>
  #         100% (100000/100000), done.
  #       EOF
  #
  #               cat >in <<-\EOF &&
  #               progress 100
  #               progress 1000
  #               progress 10000
  #               progress 100000
  #               EOF
  #               test-tool progress --total=100000 \
  #                       "Working hard.......2.........3.........4.........5.........6" \
  #                       <in 2>stderr &&
  #
  #               show_cr <stderr >out &&
  #               test_cmp expect out
  #
  ```

* What's different between what you expected and what actually happened?

  It seems that the progress display is not working normally.

* Anything else you want to add:

  I am thinking:
  1. Is this bug caused by my own patches?
  So I switched to other branches, including upstream/master, see the bug too.
  2. Is this bug caused by zsh?
  So I switched to bash, see the bug too.
  3. Does this bug only appear on my Arch-Linux?
  So I asked my classmates (who use arch linux too) to download git/git from github and perform the test, see the bug too.
  4. Does Ubuntu also have this bug?
  No. In the case of using Ubuntu's docker and Centos's virtual machine, after cloning git/git from github, they actually passed the test!!!

  So what's wrong with Arch-Linux?

* [System Info]

  ```
  git version:
  git version 2.32.0
  cpu: x86_64
  no commit associated with this build
  sizeof-long: 8
  sizeof-size_t: 8
  shell-path: /bin/sh
  uname: Linux 5.12.15-arch1-1 #1 SMP PREEMPT Wed, 07 Jul 2021 23:35:29 +0000 x86_64
  compiler info: gnuc: 11.1
  libc info: glibc: 2.33
  $SHELL (typically, interactive shell): /bin/zsh
  ```

* [Enabled Hooks]

  None.


### project progress

I am still thinking about how to improve the performance of `git cat-file --batch`. This cannot be solved quickly, keep patient.

My mentors told me to split my main patch series into a few smaller patch series, but how? In other words, there is a certain correlation between these patches, If they are really split into multiple patches, how can I send them to the mailing list without repeating?

I just received half of the GSoC bonus, felt a burden of responsibility...
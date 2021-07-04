---
title: 'GSOC, Git Blog 4'
date: 2021-06-13 22:12:00
tags: git
---

## Week4: Trouble is a friend

At the beginning of this week , since my previous code broke some Github CI tests , I tried to solve these bugs related to the atom `%(raw)` . The most confusing thing is that some bugs may pass the tests of your local machine, but fail to pass in the CI of GitHub .

E.g. I need to add the `GPG` prerequisites to the test like this:

```sh
test_expect_success GPG 'basic atom: refs/tags/signed-empty raw' '
git cat-file tag refs/tags/signed-empty >expected &&
git for-each-ref --format="%(raw)" refs/tags/signed-empty >actual &&
sanitize_pgp <expected >expected.clean &&
sanitize_pgp <actual >actual.clean &&
echo "" >>expected.clean &&
test_cmp expected.clean actual.clean
'
```

Otherwise, some operating systems that do not contain GnuPG may not be able to perform related tests.

In addition, some scripts like `printf "%b" "a\0b\0c" >blob1` will be truncated at the first NUL on a 32-bit machine, but it performs well on 64-bit machines, and NUL is normally stored in the file. This made me think that Git's file decompression had an error on a 32-bit machine before I used Ubuntu32's docker container to clone the git repository and In-depth analysis of bugs... In the end, I used `printf "a\0b\0c"` to make 32-bit machines not truncated in NUL. Is there a better way to write binary data onto a file than `printf` and `echo`?

Since I am a newbie to docker, I would like to know if there is any way to run the Git's Github CI program remotely or locally?

In the second half of this week, I tried to make `cat-file` reuse the logic of `ref-filter`. I have to say that this is a very difficult process. "rebase -i" again and again to repair the content of previous commits. Squeeze commits, split commits, modify commit messages... Finally, I submitted the patches to the Git mailing list in[[PATCH 0/8] [GSOC][RFC] cat-file: reuse `ref-filter` logic](https://lore.kernel.org/git/pull.980.git.1623496458.gitgitgadget@gmail.com/).
Now `cat-file` has learned most of the atoms in `ref-filter`. I am very happy to be able to make git support richer functions through my own code.

Regrettably, `git cat-file --batch --batch-all-objects` seems to take up a huge amount of memory on a large repo such as git.git, and it will be killed by Linux's oom. This is mainly because we will make a large number of copies of the object's raw data. The original `git cat-file` uses `read_object_file()` or `stream_blob()` to output the object's
raw data, but in `ref-filter`, we have to use `v->s` to copy the object's data, it is difficult to eliminate `v->s` and print the output directly to the final output buffer. Because we may have atoms like `%(if)`, `%(else)` that need to use buffers on the stack to build the final output string layer by layer, or the `cmp_ref_sorting()` needs to use `v->s` to
compare two refs. In short, it is very difficult for `ref-filter` to reduce copy overhead. I even thought about using the string pool API `memintern()` to replace `xmemdupz()`, but it seems that the effect is not obvious. A large number of objects' data will still reside in memory, so this may not be a good method.

Anyway, stay confident. I can solve these difficult problems with the help of mentors and reviewers. `:)`

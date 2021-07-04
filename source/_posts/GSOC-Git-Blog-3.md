---
title: 'GSOC, Git Blog 3'
date: 2021-06-06 23:14:59
tags: git
---

## Week3: Meticulousness is very important

### What happened this week
- I found a `git cat-file` bug this week, see:

```bash
git cat-file --batch=batman --batch-all-objects batman
fatal: object 00345b5fe0aa8f45e9d1289ceb299f0489ea3fe1 changed type!?
```

It seems that Git died for a strange reason: the type of an object changed? Is my Git object damaged? (Just like a friend of mine, use `find . -type f -print0 | xargs -0 sed -i "s/\r//g"` remove all the '\r' of all files in a Git repository, this caused most of his Git commands to fail.) So I tested it under different linux platforms, they all have this same damage.

After a series of testing and debugging, I found that `oid_object_info_extended()` did not get the type of object.

So I submitted the patch for fix this bug to the Git mailing list in [[PATCH] [GSOC] cat-file: fix --batch report changed-type bug](https://lore.kernel.org/git/pull.965.git.1622363366722.gitgitgadget@gmail.com/), Peff tell us the essential reason for this bug:

In `845de33a5b (cat-file: avoid noop calls to sha1_object_info_extended, 2016-05-18)`, this patches
skips the call to `oid_object_info_extended()` entirely when `--batch-all-objects` is in use, and the custom format does
not include any placeholders that require calling it. The correct solution is to put checking if `object_info` is empty after setting `object_info.typep`.

Finally, thanks to the help of Jeff, I summit final patch in [[PATCH v2 1/2] [GSOC] cat-file: handle trivial --batch format with --batch-all-objects](https://lore.kernel.org/git/4af3b958dd056e2162fdc5d7f6600bcedde210b8.1622737766.git.gitgitgadget@gmail.com/).

Talk of experience as a story: Even experienced programmers make small mistakes, writing any code requires very careful thinking.
- The checkpoints for rejecting `%(raw)` and `--<lang>` are incorrect. At Junio's reminder, I changed the checkpoint from
`parse_ref_filter_atom()` to `verify_ref_format()`. My mentor Christian pointed out some grammatical errors in the cover letter.
- At the suggestion of Junio, I rebased `0efed94 ([GSOC] ref-filter: add %(raw) atom)` on `1197f1a (ref-filter: introduce
enum atom_type)`, they have a clash, after resolving the conflict, it's better for me to consider the code I implemented before and the code I wrote now at the same time, I can find more problems
and find better solutions.
- I submitted the patch about `%(rest)`, `%(raw:textconv)` and `%(raw:filters)` for `ref-filter`, they are used to simulate some functions of `git cat-file`, my mentor Hariom noticed one of the formatting issues, I am waiting for more reviews for the time being.

### What's the next step

As long as new atoms `%(rest)`, `%(raw:textconv)` and `%(raw:filters)` for `ref-filter` can be accepted by Git, We can start to let `cat-file` use `ref-filter` logic on a large scale! Exciting! But the performance of `ref-filter` is still not good. Perhaps I need to find a new breakthrough in the performance bottleneck of `ref-filter`.

Thanks!
--
ZheNing Hu
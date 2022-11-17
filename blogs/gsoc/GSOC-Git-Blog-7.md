---
title: 'GSOC, Git Blog 7'
date: 2021-07-04 21:41:57
tags: git
---

## Week7 Performance Testing 2

This week I used performance flame graph at the suggestion of my mentor `Christian` to find out where my patch affected the performance of `cat-file --batch`.  `oid_object_info_extended()` takes the largest proportion of time, it accounts for `90.28%` and `41.60%` in `cat-file --batch` and `cat-file --batch-check` respectively. Part of the reason is that `oid_object_info_extended()` is called twice in `get_object()` with my patch. I tried to revise its logic (`WIP`), the performance is improved when not using `--textconv` and `--filters`.

`Ævar Arnfjörð Bjarmason` gave me a good suggestion on performance regression: When we use the default format of `git cat-file --batch-check` or `git cat-file --batch`, we can directly print the meta-data of the object without going through the logic of `ref-filter`; When we use other format, use the logic in ref-filter.

In addition, `Ævar Arnfjörð Bjarmason` also suggests adding a performance test for `git cat-file --batch`, this can help us analyze and compare performance changes later.
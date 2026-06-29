---
title: 'GSOC, Git Blog 7'
titleZh: "GSOC，Git 博客 7"
date: 2021-07-04 21:41:57
tags: git
---

<div class="lang-section" data-lang="en">

## Week7 Performance Testing 2

This week I used performance flame graph at the suggestion of my mentor `Christian` to find out where my patch affected the performance of `cat-file --batch`.  `oid_object_info_extended()` takes the largest proportion of time, it accounts for `90.28%` and `41.60%` in `cat-file --batch` and `cat-file --batch-check` respectively. Part of the reason is that `oid_object_info_extended()` is called twice in `get_object()` with my patch. I tried to revise its logic (`WIP`), the performance is improved when not using `--textconv` and `--filters`.

`Ævar Arnfjörð Bjarmason` gave me a good suggestion on performance regression: When we use the default format of `git cat-file --batch-check` or `git cat-file --batch`, we can directly print the meta-data of the object without going through the logic of `ref-filter`; When we use other format, use the logic in ref-filter.

In addition, `Ævar Arnfjörð Bjarmason` also suggests adding a performance test for `git cat-file --batch`, this can help us analyze and compare performance changes later.

</div>

<div class="lang-section" data-lang="zh">

## 第七周 性能测试 2

这周，在我的导师 `Christian` 的建议下，我使用了性能火焰图来查明我的补丁在哪些地方影响了 `cat-file --batch` 的性能。`oid_object_info_extended()` 占了最大的时间比例，在 `cat-file --batch` 和 `cat-file --batch-check` 中分别占 `90.28%` 和 `41.60%`。部分原因是，在我的补丁中，`get_object()` 调用了两次 `oid_object_info_extended()`。我尝试修改了它的逻辑（`WIP`），在不使用 `--textconv` 和 `--filters` 时性能有所提升。

`Ævar Arnfjörð Bjarmason` 针对性能回归给了我一个很好的建议：当我们使用 `git cat-file --batch-check` 或 `git cat-file --batch` 的默认格式时，可以直接打印对象的元数据，而不必经过 `ref-filter` 的逻辑；当我们使用其他格式时，再使用 ref-filter 的逻辑。

此外，`Ævar Arnfjörð Bjarmason` 还建议为 `git cat-file --batch` 添加一个性能测试，这可以帮助我们以后分析和比较性能变化。

</div>
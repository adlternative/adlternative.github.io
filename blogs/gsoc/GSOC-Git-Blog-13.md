---
title: 'GSOC, Git Blog 13'
date: 2021-08-15 13:41:14
tags: git
---

### Project Progress

This week I continue to try to optimize the performance of `git cat-file --batch`.

You can see them here:

```bash
git fetch git@github.com:adlternative/git.git cat-file-reuse-ref-filter-logic
git rev-list  2c6ce95c82..8591897fbc
```

Or here:

[[PATCH 00/27] [GSOC] [RFC] cat-file: reuse ref-filter logic](https://lore.kernel.org/git/pull.1016.git.1628842990.gitgitgadget@gmail.com/)

Several of these commits are critical:

* 31acac9fde `[GSOC] ref-filter: remove second parsing in format_ref_array_item`: It use a `parsed_atom_list` to save the parsed state after we calling verify_ref_format(), so we can reduce second parsing in format_ref_array_item(), which bring 1.9% performance improvement.
* 4602b62a92 `[GSOC] ref-filter: reuse finnal buffer if no stack need`：It can reduce some unnecessary copies, which bring 2% performance improvement.

This time I made sure that there was not too much noise, to ensure the stability of this performance test：

#### Test Examples：
* upstream/master: `5d213e46bb (tag: v2.33.0-rc2, upstream/master) Git 2.33-rc2`
* 898e36a92b (before performance optimization): `898e36a92b [GSOC] cat-file: re-implement --textconv, --filters options`
* this tree (after performance optimization): `8591897fbc (HEAD -> cat-file-reuse-ref-filter-logic) [GSOC] ref-filter: add need_get_object_info flag to struct expand_data`


#### Test Results：
```bash
$ GIT_PERF_REPEAT_COUNT=50  GIT_PERF_MAKE_OPTS=-j8 ./run upstream/master . ./p1006-cat-file.sh

Test                                        upstream/master   this tree
------------------------------------------------------------------------------------
1006.2: cat-file --batch-check              0.08(0.06+0.01)   0.08(0.07+0.01) +0.0%
1006.3: cat-file --batch-check with atoms   0.06(0.05+0.00)   0.07(0.06+0.01) +16.7%
1006.4: cat-file --batch                    0.48(0.45+0.03)   0.50(0.46+0.03) +4.2%
1006.5: cat-file --batch with atoms         0.47(0.43+0.03)   0.49(0.46+0.02) +4.3%

$ GIT_PERF_REPEAT_COUNT=50  GIT_PERF_MAKE_OPTS=-j8 ./run upstream/master 898e36a92b ./p1006-cat-file.sh

Test                                        upstream/master   898e36a92b
------------------------------------------------------------------------------------
1006.2: cat-file --batch-check              0.08(0.07+0.00)   0.09(0.09+0.00) +12.5%
1006.3: cat-file --batch-check with atoms   0.06(0.04+0.01)   0.07(0.05+0.02) +16.7%
1006.4: cat-file --batch                    0.48(0.44+0.03)   0.60(0.58+0.02) +25.0%
1006.5: cat-file --batch with atoms         0.47(0.44+0.02)   0.58(0.56+0.02) +23.4%
```

The performance of `git cat-file --batch-check` is very close to `upstream/master`!
The performance difference of `git cat-file --batch` has also changed from 25.0% to 4.2%!

This result is far better than my expectations, I have reason to believe that the performance of `git cat-file --batch` can be improved again!

Good job!

I think the key to continuing to optimize is still to reduce unnecessary copies.

### Additional advice

During the optimization process this week, I found that I might want to use a `strbuf_move()` function, although I did not adopt it in my work (because it did not allow my work to be greatly optimized), but I think it might be useful in some situations: We don’t want to copy the data of strbuf, but just want to move its buf pointer:

```c
void strbuf_move(struct strbuf *sb, struct strbuf *sb2)
{
	strbuf_release(sb);
	*sb = *sb2;
	strbuf_init(sb2, 0);
}
```

Yes, it's like `std::move` in c++. Maybe we can use it in some scenarios.

Thanks, Git!

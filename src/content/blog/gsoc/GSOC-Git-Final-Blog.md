---
title: 'GSOC, Git Final Blog'
titleZh: "GSoC Git 最终博客"
date: 2021-08-17 16:01:18
tags: git
---

<div class="lang-section" data-lang="en">

## Git Final Blog

### My micro project:

You can view them here: [link](https://github.com/gitgitgadget/git/pulls?q=adlternative+closed%3A%3C2021-05-18+label%3Amaster).

```
      builtin/*: update usage format
      ls_files.c: bugfix for --deleted and --modified
      ls_files.c: consolidate two for loops into one
      ls-files.c: add --deduplicate option
      difftool.c: learn a new way start at specified file
      commit: add --trailer option
      format-patch: allow a non-integral version numbers
      ref-filter: get rid of show_ref_array_item
      ref-filter: reuse output buffer
      pretty: provide human date format
      docs: correct descript of trailer.<token>.command
      trailer: add new .cmd config option
```

### My GSoC project:

#### Use ref-filter formats in git cat-file

`git cat-file --batch` is a Git command, it can be used to output the data of Git
objects according to different formats. My goal is to make `git cat-file --batch` reuse the logic in ref-filter, this can make `git cat-file --batch` support more format atoms.

During GSoC, these patches were merged into the `master` branch,
you can view them here: [link](https://github.com/gitgitgadget/git/pulls?q=adlternative+closed%3A%3E%3D2021-05-18+label%3Amaster+).

```
      ref-filter: fix read invalid union member bug
      ref-filter: add objectsize to used_atom
      ref-filter: introduce enum atom_type
      cat-file: handle trivial --batch format with --batch-all-objects
      cat-file: merge two block into one
```

These patches were staying on the `next` branch and waiting to merge to `master`,
you can view them here: [link](https://github.com/gitgitgadget/git/issues?q=adlternative+created%3A%3E2021-05-19+label%3Anext).

```
      ref-filter: add obj-type check in grab contents
      ref-filter: add %(raw) atom
      ref-filter: --format=%(raw) support --perl
      ref-filter: use non-const ref_format in *_atom_parser()
      ref-filter: add %(rest) atom
      cherry-pick: use better advice message
```

This is the complete patches list: [link](https://github.com/adlternative/git/commits/cat-file-reuse-ref-filter-logic)
```
      ref-filter: fix read invalid union member bug
      ref-filter: add objectsize to used_atom
      ref-filter: introduce enum atom_type
      cat-file: handle trivial --batch format with --batch-all-objects
      cat-file: merge two block into one
      [GSOC] ref-filter: add obj-type check in grab contents
      [GSOC] ref-filter: add %(raw) atom
      [GSOC] ref-filter: --format=%(raw) support --perl
      [GSOC] ref-filter: use non-const ref_format in *_atom_parser()
      [GSOC] ref-filter: add %(rest) atom
      [GSOC] ref-filter: pass get_object() return value to their callers
      [GSOC] ref-filter: introduce free_ref_array_item_value() function
      [GSOC] ref-filter: add cat_file_mode to ref_format
      [GSOC] ref-filter: modify the error message and value in get_object
      [GSOC] cat-file: add has_object_file() check
      [GSOC] cat-file: change batch_objects parameter name
      [GSOC] cat-file: create p1006-cat-file.sh
      [GSOC] cat-file: reuse ref-filter logic
      [GSOC] cat-file: reuse err buf in batch_object_write()
      [GSOC] cat-file: re-implement --textconv, --filters options
      [GSOC] ref-filter: remove grab_oid() function
      [GSOC] ref-filter: skip parse_object_buffer()
      [GSOC] ref-filter: merge two for loop in grab_person()
      [GSOC] ref-filter: remove strlen() from find_subpos()
      [GSOC] ref-filter: introducing xstrvfmt_len() and xstrfmt_len()
      [GSOC] ref-filter: remove second parsing in format_ref_array_item()
      [GSOC] ref-filter: introduction ref_filter_slopbuf[1]
      [GSOC] ref-filter: add deref member to struct used_atom
      [GSOC] ref-filter: introduce symref_atom_parser()
      [GSOC] ref-filter: use switch/case instead of if/else
      [GSOC] ref-filter: reuse final buffer
      [GSOC] ref-filter: reduce unnecessary object_info comparisons
      [GSOC] ref-filter: instead CALLOC_ARRAY() to ALLOC_ARRAY()
      [GSOC] ref-filter: reuse object content
```

My git development is mainly divided into three stages:

1. Implement `git cat-file --batch` driver in ref-filter.
   * Support `%(raw)` atom in ref-filter, which can print the raw data of the object.
   ```sh
   $ git for-each-ref --format="%(raw)" refs/tags/v2.33.0
   object 225bc32a989d7a22fa6addafd4ce7dcd04675dbf
   type commit
   tag v2.33.0
   tagger Junio C Hamano <gitster@pobox.com> 1629141357 -0700

   Git 2.33
   -----BEGIN PGP SIGNATURE-----

   iQIzBAABCAAdFiEE4fA2sf7nIh/HeOzvsLXohpav5ssFAmEauW0ACgkQsLXohpav
   5stDJQ//aLGNq9RblR8gl88HsORR4Q8wGawVZplhFraYWD2swq3xYsW+s9DXmmiR
   Pss4Q67CcolI6cLXmUXBA/m0nBuSm0B9gnVewau10+d2AWV3Leuh3wvXs28RFfxk
   2bZAKOMMtQ444Ubld2hnL/E4B6nWoTpx1pbUBLbMN2Vk6L2hVbJ5e559yzqsJdGm
   2VH5vLlT3H8lvK7sLrJ1KcN/O5CsjlbdoeaBs7Pu3SytKf6qJImWW9FyFffewQBH
   UeZ5DHjY/yIomkSZQHraFyhA73U1zUQe2FTDcXtF9vbvZ5BMH6VWv/fKr6usuQqV
   U/2fE3hWL20Iaf/jpkdqEvvhK+EoS84CFEavS2linMMCKh8EVHi/ZUBGBhTym4fl
   MZj0kI0+oBBMpXzCr60wbubFwNKZdZySEuRgPYXRePY7HxcxZ7dDE5Bcd9v3TOU2
   XFf9s/GWeKeCELkJkVyidfUmA8vIjVlLqwkol/G/C4vY0zpIy+6lP5D4gWBxtL6p
   ucBW8uT5j/UXEWOPSPoaUoa7nld32ub6OqhR9bj+mQDkWgVzUCocNEOTgIX7GNFG
   OYEX7T/d3vAxvpaQ3Tn4R/h7zX9FtyBEBHAfdDYuD0qxuAIPWtJ9pB1It5ZbgVJH
   6jLMTXITBDTXgFixOMiE0nyuzQzVcb1zPPrFo1rKr45rl8r/PJ8=
   =IF1E
   -----END PGP SIGNATURE-----

   ```
   * Support `%(rest)` atom in ref-filter, which only used for cat-file mode, which can split
     the input lines at the first whitespace boundary, all characters
     before that whitespace are considered to be the object name;
     characters after that first run of whitespace are output in place of the `%(rest)` atom.

   These atoms will be used as the backend of `git cat-file --batch`.

2. Refactor `git cat-file --batch` to reuse the logic of ref-filter.
	* The default format of `git cat-file --batch-check` is equivalent to `%(objectname) %(objecttype) %(objectsize)` in ref-filter.
	* The default format of `git cat-file --batch` is equivalent to `%(objectname) %(objecttype) %(objectsize)\n%(raw)` in ref-filter.
	* Use `verify_ref_format()` to parse the atoms needed by `git cat-file --batch`.
	* Use `format_ref_array_item()` to get the specific data of the object.
	* Make `git cat-file` options `--textconv`, `--filters` available for `--batch`.

	They can work well in the `git cat-file` environment, but require a lot of adaptation.
	Now `git cat-file --batch` extra supports these atoms:
   ```
   %(tree)
   %(parent)
   %(numparent)
   %(object)
   %(type)
   %(tag)
   %(author)
   %(authorname)
   %(authoremail)
   %(authordate)
   %(committer)
   %(committername)
   %(committeremail)
   %(committerdate)
   %(tagger)
   %(taggername)
   %(taggeremail)
   %(taggerdate)
   %(creator)
   %(creatordate)
   %(subject)
   %(body)
   %(trailers)
   %(contents)
   %(raw)
   %(color)
   %(align)
   %(end)
   %(if)
   %(then)
   %(else)
   ```

	At the same time, it can also support deref atom (e.g. `%(*commiter)`) and atom attribute(e.g. `%(objectname:short=1)`).

3. Optimize ref-filter performance.
   * In the initial refactoring, `git cat-file --batch` have a severe performance degradation [link](https://lore.kernel.org/git/87eecf8ork.fsf@evledraar.gmail.com/), this is because the step of obtaining object data in ref-filter will generate some intermediate data `atom_value` to be used by `git for-each-ref --sort`, which will lead to more copying and more memory allocating in its logic.
   * I made some changes to solve the problem of performance degradation:
     1. Skip unnecessary object content parsing.
     2. Save the format parsing results, reducing the second format parsing.
     3. Reuse the output buffer and reduce copying.
     4. Reuse object content buffer, reduce memory allocation and copy.

   Current performance test results:

   ```
   Test                                        upstream/master   this
   tree
   ------------------------------------------------------------------------------------
   1006.2: cat-file --batch-check              0.06(0.06+0.00)
   0.08(0.07+0.00) +33.3%
   1006.3: cat-file --batch-check with atoms   0.06(0.04+0.01)
   0.06(0.06+0.00) +0.0%
   1006.4: cat-file --batch                    0.49(0.47+0.02)
   0.48(0.47+0.01) -2.0%
   1006.5: cat-file --batch with atoms         0.48(0.44+0.03)
   0.47(0.46+0.01) -2.1%
   ```

   The performance of `git cat-file --batch` is about 2% better than before, and the performance of `git cat-file --batch-check` is about 33% worse than before.

   But in fact, there is little difference with `git cat-file --batch-check`,
   their execution time only differs by 5ms:

   ```
   upstream/master (225bc32a98):

   $ hyperfine --warmup=10  "~/git/bin-wrappers/git cat-file
   --batch-check --batch-all-objects"
   Benchmark #1: ~/git/bin-wrappers/git cat-file --batch-check --batch-all-objects
    Time (mean ± σ):     596.2 ms ±   5.7 ms    [User: 563.0 ms, System: 32.5 ms]
    Range (min … max):   586.9 ms … 607.9 ms    10 runs

   cat-file-reuse-ref-filter-logic (709a0c5c12):

   $ hyperfine --warmup=10  "~/git/bin-wrappers/git cat-file
   --batch-check --batch-all-objects"
   Benchmark #1: ~/git/bin-wrappers/git cat-file --batch-check --batch-all-objects
    Time (mean ± σ):     601.3 ms ±   5.8 ms    [User: 566.9 ms, System: 33.9 ms]
    Range (min … max):   596.7 ms … 613.3 ms    10 runs
   ```

   And `git cat-file --batch-check` can be 0.5s faster than before!

   ```
   upstream/master (225bc32a98):

   $ time git cat-file --batch --batch-all-objects
   >/dev/null
   /home/adl/git/bin-wrappers/git cat-file --batch --batch-all-objects >
    24.61s user 0.30s system 99% cpu 24.908 total

   cat-file-reuse-ref-filter-logic (709a0c5c12):

   $ time git cat-file --batch --batch-all-objects >/dev/null
   cat-file --batch --batch-all-objects > /dev/null  25.10s user 0.30s
   system 99% cpu 25.417 total
   ```

The performance optimization patches has been submitted to the mailing list and is waiting for review by reviewers and mentors.

### What have I learned during this period of time?

* I learned how to use performance testing tools such as `gprof`, `perf`, etc.
* I read the implementation of multiple git sub commands, understand how to use them and modify them.
* I used to think that participating in open source is a very distant thing. Since participating in GSOC this time, I realized that open source is actually very close to us, and it is a very fun and very cool thing.

### Concluding remarks

This summer vacation, I have gained a lot, also made a lot of friends.

Thanks to Google and Git.

Thanks to those people who have helped me!

Thanks to my two mentors Christian and Hariom.

Three months ago, at the beginning of GSoC, I cited the example of Junio's interview: [[GSoC] Hello Git](https://lore.kernel.org/git/CAOLTT8SHE-ok3D+oLNSWFi7KPU==VQnTMDmC4YxUyNBJKmBD8A@mail.gmail.com/), as an echo, I will maintain a passion for open source and technology, continue to participate in the development and maintenance of the Git community.

Thanks.
--

ZheNing Hu

</div>

<div class="lang-section" data-lang="zh">

## Git 最终博客

### 我的小型项目：

你可以在这里查看它们：[链接](https://github.com/gitgitgadget/git/pulls?q=adlternative+closed%3A%3C2021-05-18+label%3Amaster)。

```
      builtin/*: update usage format
      ls_files.c: bugfix for --deleted and --modified
      ls_files.c: consolidate two for loops into one
      ls-files.c: add --deduplicate option
      difftool.c: learn a new way start at specified file
      commit: add --trailer option
      format-patch: allow a non-integral version numbers
      ref-filter: get rid of show_ref_array_item
      ref-filter: reuse output buffer
      pretty: provide human date format
      docs: correct descript of trailer.<token>.command
      trailer: add new .cmd config option
```

### 我的 GSoC 项目：

#### 在 git cat-file 中使用 ref-filter 格式

`git cat-file --batch` 是一个 Git 命令，它可以根据不同的格式输出 Git 对象的数据。我的目标是让 `git cat-file --batch` 复用 ref-filter 中的逻辑，这样它就能支持更多的格式 atom。

在 GSoC 期间，这些补丁被合并到了 `master` 分支，
你可以在这里查看：[链接](https://github.com/gitgitgadget/git/pulls?q=adlternative+closed%3A%3E%3D2021-05-18+label%3Amaster+)。

```
      ref-filter: fix read invalid union member bug
      ref-filter: add objectsize to used_atom
      ref-filter: introduce enum atom_type
      cat-file: handle trivial --batch format with --batch-all-objects
      cat-file: merge two block into one
```

这些补丁停留在 `next` 分支，等待合并到 `master`，
你可以在这里查看：[链接](https://github.com/gitgitgadget/git/issues?q=adlternative+created%3A%3E2021-05-19+label%3Anext)。

```
      ref-filter: add obj-type check in grab contents
      ref-filter: add %(raw) atom
      ref-filter: --format=%(raw) support --perl
      ref-filter: use non-const ref_format in *_atom_parser()
      ref-filter: add %(rest) atom
      cherry-pick: use better advice message
```

这是完整的补丁列表：[链接](https://github.com/adlternative/git/commits/cat-file-reuse-ref-filter-logic)
```
      ref-filter: fix read invalid union member bug
      ref-filter: add objectsize to used_atom
      ref-filter: introduce enum atom_type
      cat-file: handle trivial --batch format with --batch-all-objects
      cat-file: merge two block into one
      [GSOC] ref-filter: add obj-type check in grab contents
      [GSOC] ref-filter: add %(raw) atom
      [GSOC] ref-filter: --format=%(raw) support --perl
      [GSOC] ref-filter: use non-const ref_format in *_atom_parser()
      [GSOC] ref-filter: add %(rest) atom
      [GSOC] ref-filter: pass get_object() return value to their callers
      [GSOC] ref-filter: introduce free_ref_array_item_value() function
      [GSOC] ref-filter: add cat_file_mode to ref_format
      [GSOC] ref-filter: modify the error message and value in get_object
      [GSOC] cat-file: add has_object_file() check
      [GSOC] cat-file: change batch_objects parameter name
      [GSOC] cat-file: create p1006-cat-file.sh
      [GSOC] cat-file: reuse ref-filter logic
      [GSOC] cat-file: reuse err buf in batch_object_write()
      [GSOC] cat-file: re-implement --textconv, --filters options
      [GSOC] ref-filter: remove grab_oid() function
      [GSOC] ref-filter: skip parse_object_buffer()
      [GSOC] ref-filter: merge two for loop in grab_person()
      [GSOC] ref-filter: remove strlen() from find_subpos()
      [GSOC] ref-filter: introducing xstrvfmt_len() and xstrfmt_len()
      [GSOC] ref-filter: remove second parsing in format_ref_array_item()
      [GSOC] ref-filter: introduction ref_filter_slopbuf[1]
      [GSOC] ref-filter: add deref member to struct used_atom
      [GSOC] ref-filter: introduce symref_atom_parser()
      [GSOC] ref-filter: use switch/case instead of if/else
      [GSOC] ref-filter: reuse final buffer
      [GSOC] ref-filter: reduce unnecessary object_info comparisons
      [GSOC] ref-filter: instead CALLOC_ARRAY() to ALLOC_ARRAY()
      [GSOC] ref-filter: reuse object content
```

我的 Git 开发主要分为三个阶段：

1. 在 ref-filter 中实现 `git cat-file --batch` 的驱动。
   * 在 ref-filter 中支持 `%(raw)` atom，它可以输出对象的原始数据。
   ```sh
   $ git for-each-ref --format="%(raw)" refs/tags/v2.33.0
   object 225bc32a989d7a22fa6addafd4ce7dcd04675dbf
   type commit
   tag v2.33.0
   tagger Junio C Hamano <gitster@pobox.com> 1629141357 -0700

   Git 2.33
   -----BEGIN PGP SIGNATURE-----

   iQIzBAABCAAdFiEE4fA2sf7nIh/HeOzvsLXohpav5ssFAmEauW0ACgkQsLXohpav
   5stDJQ//aLGNq9RblR8gl88HsORR4Q8wGawVZplhFraYWD2swq3xYsW+s9DXmmiR
   Pss4Q67CcolI6cLXmUXBA/m0nBuSm0B9gnVewau10+d2AWV3Leuh3wvXs28RFfxk
   2bZAKOMMtQ444Ubld2hnL/E4B6nWoTpx1pbUBLbMN2Vk6L2hVbJ5e559yzqsJdGm
   2VH5vLlT3H8lvK7sLrJ1KcN/O5CsjlbdoeaBs7Pu3SytKf6qJImWW9FyFffewQBH
   UeZ5DHjY/yIomkSZQHraFyhA73U1zUQe2FTDcXtF9vbvZ5BMH6VWv/fKr6usuQqV
   U/2fE3hWL20Iaf/jpkdqEvvhK+EoS84CFEavS2linMMCKh8EVHi/ZUBGBhTym4fl
   MZj0kI0+oBBMpXzCr60wbubFwNKZdZySEuRgPYXRePY7HxcxZ7dDE5Bcd9v3TOU2
   XFf9s/GWeKeCELkJkVyidfUmA8vIjVlLqwkol/G/C4vY0zpIy+6lP5D4gWBxtL6p
   ucBW8uT5j/UXEWOPSPoaUoa7nld32ub6OqhR9bj+mQDkWgVzUCocNEOTgIX7GNFG
   OYEX7T/d3vAxvpaQ3Tn4R/h7zX9FtyBEBHAfdDYuD0qxuAIPWtJ9pB1It5ZbgVJH
   6jLMTXITBDTXgFixOMiE0nyuzQzVcb1zPPrFo1rKr45rl8r/PJ8=
   =IF1E
   -----END PGP SIGNATURE-----

   ```
   * 在 ref-filter 中支持 `%(rest)` atom，它只在 cat-file 模式下使用，可以在第一个空白边界处分割输入行，空白之前的所有字符被视为对象名；空白之后的字符将替代 `%(rest)` atom 输出。

   这些 atom 将被用作 `git cat-file --batch` 的后端。

2. 重构 `git cat-file --batch` 以复用 ref-filter 的逻辑。
	* `git cat-file --batch-check` 的默认格式等价于 ref-filter 中的 `%(objectname) %(objecttype) %(objectsize)`。
	* `git cat-file --batch` 的默认格式等价于 ref-filter 中的 `%(objectname) %(objecttype) %(objectsize)\n%(raw)`。
	* 使用 `verify_ref_format()` 解析 `git cat-file --batch` 所需的 atom。
	* 使用 `format_ref_array_item()` 获取对象的具体数据。
	* 让 `git cat-file` 的 `--textconv`、`--filters` 选项对 `--batch` 可用。

	它们在 `git cat-file` 环境中可以很好地工作，但需要做大量适配。
	现在 `git cat-file --batch` 额外支持这些 atom：
   ```
   %(tree)
   %(parent)
   %(numparent)
   %(object)
   %(type)
   %(tag)
   %(author)
   %(authorname)
   %(authoremail)
   %(authordate)
   %(committer)
   %(committername)
   %(committeremail)
   %(committerdate)
   %(tagger)
   %(taggername)
   %(taggeremail)
   %(taggerdate)
   %(creator)
   %(creatordate)
   %(subject)
   %(body)
   %(trailers)
   %(contents)
   %(raw)
   %(color)
   %(align)
   %(end)
   %(if)
   %(then)
   %(else)
   ```

	同时，它还支持 deref atom（例如 `%(*commiter)`）和 atom 属性（例如 `%(objectname:short=1)`）。

3. 优化 ref-filter 性能。
   * 在最初的 refactor 中，`git cat-file --batch` 出现了严重的性能下降 [链接](https://lore.kernel.org/git/87eecf8ork.fsf@evledraar.gmail.com/)，这是因为 ref-filter 中获取对象数据的步骤会生成一些中间数据 `atom_value`，供 `git for-each-ref --sort` 使用，这会导致其逻辑中产生更多的拷贝和内存分配。
   * 我做了一些改动来解决性能下降的问题：
     1. 跳过不必要的对象内容解析。
     2. 保存格式解析结果，减少第二次格式解析。
     3. 复用输出缓冲区，减少拷贝。
     4. 复用对象内容缓冲区，减少内存分配和拷贝。

   当前性能测试结果：

   ```
   Test                                        upstream/master   this
   tree
   ------------------------------------------------------------------------------------
   1006.2: cat-file --batch-check              0.06(0.06+0.00)
   0.08(0.07+0.00) +33.3%
   1006.3: cat-file --batch-check with atoms   0.06(0.04+0.01)
   0.06(0.06+0.00) +0.0%
   1006.4: cat-file --batch                    0.49(0.47+0.02)
   0.48(0.47+0.01) -2.0%
   1006.5: cat-file --batch with atoms         0.48(0.44+0.03)
   0.47(0.46+0.01) -2.1%
   ```

   `git cat-file --batch` 的性能比之前提高了约 2%，而 `git cat-file --batch-check` 的性能比之前差了约 33%。

   但实际上，`git cat-file --batch-check` 的差距很小，
   它们的执行时间只相差 5ms：

   ```
   upstream/master (225bc32a98):

   $ hyperfine --warmup=10  "~/git/bin-wrappers/git cat-file
   --batch-check --batch-all-objects"
   Benchmark #1: ~/git/bin-wrappers/git cat-file --batch-check --batch-all-objects
    Time (mean ± σ):     596.2 ms ±   5.7 ms    [User: 563.0 ms, System: 32.5 ms]
    Range (min … max):   586.9 ms … 607.9 ms    10 runs

   cat-file-reuse-ref-filter-logic (709a0c5c12):

   $ hyperfine --warmup=10  "~/git/bin-wrappers/git cat-file
   --batch-check --batch-all-objects"
   Benchmark #1: ~/git/bin-wrappers/git cat-file --batch-check --batch-all-objects
    Time (mean ± σ):     601.3 ms ±   5.8 ms    [User: 566.9 ms, System: 33.9 ms]
    Range (min … max):   596.7 ms … 613.3 ms    10 runs
   ```

   而 `git cat-file --batch-check` 可以比之前快 0.5s！

   ```
   upstream/master (225bc32a98):

   $ time git cat-file --batch --batch-all-objects
   >/dev/null
   /home/adl/git/bin-wrappers/git cat-file --batch --batch-all-objects >
    24.61s user 0.30s system 99% cpu 24.908 total

   cat-file-reuse-ref-filter-logic (709a0c5c12):

   $ time git cat-file --batch --batch-all-objects >/dev/null
   cat-file --batch --batch-all-objects > /dev/null  25.10s user 0.30s
   system 99% cpu 25.417 total
   ```

性能优化补丁已经提交到邮件列表，正在等待审阅者和导师的 review。

### 这段时间我学到了什么？

* 我学会了如何使用 `gprof`、`perf` 等性能测试工具。
* 我阅读了多个 Git 子命令的实现，理解了如何使用和修改它们。
* 我曾经认为参与开源是一件非常遥远的事情。自从这次参加 GSoC，我意识到开源其实离我们很近，而且是一件非常有趣、非常酷的事情。

### 结语

这个暑假，我收获了很多，也交了很多朋友。

感谢 Google 和 Git。

感谢所有帮助过我的人！

感谢我的两位导师 Christian 和 Hariom。

三个月前，在 GSoC 开始时，我引用了 Junio 采访中的例子：[[GSoC] Hello Git](https://lore.kernel.org/git/CAOLTT8SHE-ok3D+oLNSWFi7KPU==VQnTMDmC4YxUyNBJKmBD8A@mail.gmail.com/)，作为呼应，我将保持对开源和技术的热情，继续参与 Git 社区的开发与维护。

谢谢。
--

ZheNing Hu

</div>

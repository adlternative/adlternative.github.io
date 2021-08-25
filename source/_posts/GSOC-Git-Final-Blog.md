---
title: 'GSOC, Git Final Blog'
date: 2021-08-17 16:01:18
tags: git
---

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
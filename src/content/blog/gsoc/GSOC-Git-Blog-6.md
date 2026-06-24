---
title: 'GSOC, Git Blog 6'
date: 2021-06-27 20:38:11
tags: git
---

## Week6: Performance Testing

This week, `Christan`, `Hariom`, and `Bagas` reviewed my patches. I revised the commit messages and made some content adjustments based on their suggestions.
Patch is here: [[PATCH v6 00/15] [GSOC][RFC] cat-file: reuse ref-filter logic](https://lore.kernel.org/git/pull.980.v6.git.1624797350.gitgitgadget@gmail.com/).

Compared with the big changes that made `git cat-file` re-use `ref-filter` logic in previous weeks, the overall change this week is not very large.

Although from a functional point of view, the current version of `git cat-file` can support more atoms, but from a performance point of view, it is far less than the previous version.

The following is an excerpt from the commit message of `[GSOC] cat-file: reuse ref-filter logic`:

```
The performance for `git cat-file --batch-all-objects
--batch-check` on the Git repository itself with performance
testing tool `hyperfine` changes from 669.4 ms ± 31.1 ms to
1.134 s ± 0.063 s.

The performance for `git cat-file --batch-all-objects --batch
>/dev/null` on the Git repository itself with performance testing
tool `time` change from "27.37s user 0.29s system 98% cpu 28.089
total" to "33.69s user 1.54s system 87% cpu 40.258 total".
```

Now the performance of `cat-file --batch` is almost half of the previous performance of it, because of the complex logic in `ref-filter`. So I am thinking, how can I find the performance bottleneck in `ref-filter` and optimize it?

So I try to find and use performance testing tools to analyze the time-consuming steps of `git cat-file --batch`.

* Using Google's `gperftools`:
1. Add the link parameter `-lprofiler` in `config.mak`: `CFLAGS += -lprofiler`.
2. `make`.
3. Use `CPUPROFILE=/tmp/prof.out /<path>/git cat-file --batch-check --batch-all-objects` to run the git and general `prof.out`, which contains the results of performance analysis.
4. Use `pprof --text /<path>/git /tmp/prof.out` to display the result in the terminal.

* `git cat-file` after re-using the `ref-filter` logic:

```
Using local file /<path>/git.
Using local file /<path>/prof.out.
/usr/bin/addr2line: /<path>/git: file format not recognized
Total: 283 samples
62 21.9% 21.9% 62 21.9% __GI___libc_write
34 12.0% 33.9% 34 12.0% 000055d9164cdc36
20 7.1% 41.0% 20 7.1% inflate
12 4.2% 45.2% 12 4.2% inflateCodesUsed@@ZLIB_1.2.9
8 2.8% 48.1% 8 2.8% __memcmp_avx2_movbe
7 2.5% 50.5% 7 2.5% 000055d9164cdc33
5 1.8% 52.3% 5 1.8% __libc_open64
5 1.8% 54.1% 5 1.8% __memmove_avx_unaligned_erms
5 1.8% 55.8% 5 1.8% _int_malloc
3 1.1% 56.9% 3 1.1% 000055d9164ccbce
3 1.1% 58.0% 3 1.1% malloc_consolidate
2 0.7% 58.7% 2 0.7% 000055d916478d78
2 0.7% 59.4% 2 0.7% 000055d9164cc821
2 0.7% 60.1% 2 0.7% 000055d9164cc8f5
2 0.7% 60.8% 2 0.7% 000055d9164ccc49
2 0.7% 61.5% 2 0.7% 000055d91659dc02
2 0.7% 62.2% 2 0.7% __GI___libc_free
2 0.7% 62.9% 2 0.7% __calloc
2 0.7% 63.6% 2 0.7% __fstatat64
2 0.7% 64.3% 2 0.7% __memset_avx2_unaligned_erms
2 0.7% 65.0% 2 0.7% __strlen_avx2
2 0.7% 65.7% 2 0.7% __vfprintf_internal
...
1 0.4% 92.9% 1 0.4% _IO_new_do_write
1 0.4% 93.3% 1 0.4% _IO_new_file_write
1 0.4% 93.6% 1 0.4% _IO_old_init
1 0.4% 94.0% 1 0.4% _IO_str_init_static_internal
1 0.4% 94.3% 1 0.4% __GI__IO_default_xsputn
1 0.4% 94.7% 1 0.4% __GI__IO_fwrite
1 0.4% 95.1% 1 0.4% __GI__IO_setb
1 0.4% 95.4% 1 0.4% __GI___libc_malloc
1 0.4% 95.8% 1 0.4% __GI___mmap64
1 0.4% 96.1% 1 0.4% __GI___qsort_r
1 0.4% 96.5% 1 0.4% __GI_munmap
1 0.4% 96.8% 1 0.4% __abi_tag
1 0.4% 97.2% 1 0.4% __strchr_avx2
1 0.4% 97.5% 1 0.4% _int_free
1 0.4% 97.9% 1 0.4% _itoa_word
1 0.4% 98.2% 1 0.4% adler32_z@@ZLIB_1.2.9
1 0.4% 98.6% 1 0.4% inflateBackEnd@@ZLIB_1.2.0
1 0.4% 98.9% 1 0.4% inflateReset2@@ZLIB_1.2.3.4
1 0.4% 99.3% 4 1.4% msort_with_tmp.part.0
1 0.4% 99.6% 1 0.4% unlink_chunk.constprop.0
1 0.4% 100.0% 1 0.4% zError
...
0 0.0% 100.0% 150 53.0% __libc_start_main
```

* `git cat-file` before re-using the `ref-filter` logic:

```
Using local file /<path>/git.
Using local file /tmp/prof.out2.
/usr/bin/addr2line: /<path>/git: file format not recognized
Total: 234 samples
52 22.2% 22.2% 52 22.2% __GI___libc_write
24 10.3% 32.5% 24 10.3% 00005564fbe6b0da
23 9.8% 42.3% 23 9.8% inflateCodesUsed@@ZLIB_1.2.9
11 4.7% 47.0% 11 4.7% inflate
9 3.8% 50.9% 9 3.8% 00005564fbe6b0d7
7 3.0% 53.8% 7 3.0% __memcmp_avx2_movbe
5 2.1% 56.0% 5 2.1% _int_malloc
4 1.7% 57.7% 4 1.7% __libc_open64
3 1.3% 59.0% 3 1.3% __GI__IO_default_xsputn
3 1.3% 60.3% 3 1.3% __memmove_avx_unaligned_erms
3 1.3% 61.5% 3 1.3% __strchrnul_avx2
2 0.9% 62.4% 2 0.9% 00005564fbe1621c
2 0.9% 63.2% 2 0.9% 00005564fbe6813a
2 0.9% 64.1% 2 0.9% 00005564fbe6b0dd
2 0.9% 65.0% 2 0.9% 00005564fbe6b0e9
2 0.9% 65.8% 2 0.9% 00005564fbe6b8f6
2 0.9% 66.7% 2 0.9% 00005564fbef4ce6
2 0.9% 67.5% 2 0.9% __GI___libc_malloc
...
1 0.4% 97.4% 1 0.4% _IO_new_file_write
1 0.4% 97.9% 1 0.4% _IO_new_file_xsputn
1 0.4% 98.3% 1 0.4% __GI___libc_free
1 0.4% 98.7% 1 0.4% __strlen_avx2
1 0.4% 99.1% 1 0.4% __vsnprintf_internal
1 0.4% 99.6% 1 0.4% adler32_z@@ZLIB_1.2.9
1 0.4% 100.0% 1 0.4% inflateBackEnd@@ZLIB_1.2.0
...
0 0.0% 100.0% 118 50.4% __libc_start_main
0 0.0% 100.0% 4 1.7% msort_with_tmp.part.0
```

Ignore `write`, `inflate` and `000055d9164cdc36`, the execution time of `memcmp` and `memmove` is very large.

However, whether it is `git cat-file` before or after re-using the `ref-filter` logic,
the functions they call take up similar proportions of time.

* Using `perf`:
`perf top -p <git-pid>`

```
12.72% libc-2.33.so [.] __memmove_avx_unaligned_erms
7.39% libz.so.1.2.11 [.] inflate
5.56% libz.so.1.2.11 [.] 0x00000000000088ba
5.27% libz.so.1.2.11 [.] adler32_z
3.46% git [.] patch_delta
```
We can see that `memmove` is still the part that accounts for the largest proportion of time.

We can already come to a conclusion: A lot of the time of `cat-file --batch` is used for data copy, this may be the focus of our later performance optimization.

--
ZheNing Hu

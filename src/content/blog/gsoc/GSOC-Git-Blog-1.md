---
title: 'GSOC, Git Blog 1'
date: 2021-05-23 18:42:52
tags: git
---

## Week1: Git Adventure Begin

Use Git to submit Git patches to the Git community. Does it sound magical? I fell very lucky to be selected by the Git community this year and start my Git Adventure in GSoC.

I am no stranger to Git usage, and before the start of GSoC, I have learned some Git source code content, but I only saw the tip of the iceberg of Git source code, there are still many things that I need to explore.

### What happened this week
- In [[GSoC] Hello Git](https://lore.kernel.org/git/CAOLTT8SHE-ok3D+oLNSWFi7KPU==VQnTMDmC4YxUyNBJKmBD8A@mail.gmail.com/), Christian and JiangXin interacted with me.
- I checked Olga's patch at Christian's prompt and learned a way to make `cat-file --batch` use `ref-filter` logic: Use `format_ref_array_item()` in `batch_object_write()`, this is indeed a good entry point. But before implementing this function, we must make `ref-filter` support the function of printing the original data of the object (as `cat-file --batch` does). I decided to reuse the atom `%(content:raw)` in ref-filter to implement this function.

### The difficulties I met
In [[PATCH] [GSOC] ref-filter: add contents:raw atom](https://lore.kernel.org/git/pull.958.git.1621500593126.gitgitgadget@gmail.com/), I submitted a patch, which support atom `%(content:raw)` for `ref-filter`.

Unfortunately, this patch has a big problem: I ignored the breakage on the test. This led me to discover a bigger problem:

If our references points to a blob or a tree, and  these objects may be binary files, this means that we cannot use functions related to `strcmp()`,`strlen()` or `strbuf_addstr()`. The possible '\0' will cause the output to be truncated. We have to think of a way to make `ref-filter` can accept the output of these binary content.

So I searched for all the codes in `ref-filter.c` that buffer might be truncated by '\0' and use the appropriate method to replace them.

Just like replacing `strcmp()` with `memcmp()`, We can use `strbuf_add()` instead of `strbuf_addstr()`, At the same time I also wrote the equivalent `*._quote_buf_with_size()` to replace `*._quote_buf()`.

I just submit it to the mailing list right now: [[GSOC][RFC] ref-filter: add contents:raw atom](https://lore.kernel.org/git/pull.959.git.1621763612.gitgitgadget@gmail.com/)

I don’t know if this is the right approach at the moment, let us slowly wait for the suggestions of mentors and reviewers... `;-)`

Thanks!
--
ZheNing Hu

---
title: 'GSOC, Git Blog 2'
date: 2021-05-30 22:27:29
tags: git
---

## Week2: learning the slang of a new city

### What happened this week
- In [[PATCH 1/2] [GSOC] ref-filter: add %(raw)
atom](https://lore.kernel.org/git/b3848f24f2d3f91fc96f20b5a08cbfbe721acbd6.1622126603.git.gitgitgadget@gmail.com/), I made a license-related mistake this week. When I was implementing `%(raw)` atom for ref-filter, I noticed that `glibc` did not provide us with `memcasecmp()` which can be used to compare two pieces of memory and ignore case, so I found `memcasecmp()` implemented by `gnulib` on the Internet, and copy it to git to use. But unfortunately, I should not copy it so "conveniently". Git use `gpl-v2` and `gunlib` use `gpl-v3`, they are incompatible. Since I used to write code for my own use, I am not very sensitive to licenses problems. Thanks to `Felipe Contreras` for correcting me. Therefore, from today onwards, I will be more careful about the license.
- On the other hand, I realized that clean code is also a very important thing. In `cmp_ref_sorting()`, I want to use
`memcmp()/memcasecmp()` to compare two strings.

BAD VERSION:
  ```c
                        int (*cmp_fn)(const void *, const void *, size_t);
                        cmp_fn = s->sort_flags & REF_SORTING_ICASE
                                ? memcasecmp : memcmp;

                        if (va->s_size != ATOM_VALUE_S_SIZE_INIT &&
                            vb->s_size != ATOM_VALUE_S_SIZE_INIT) {
                                cmp = cmp_fn(va->s, vb->s, va->s_size
> vb->s_size ?
                                       vb->s_size : va->s_size);
                        } else if (va->s_size == ATOM_VALUE_S_SIZE_INIT) {
                                slen = strlen(va->s);
                                cmp = cmp_fn(va->s, vb->s, slen > vb->s_size ?
                                             vb->s_size : slen);
                        } else {
                                slen = strlen(vb->s);
                                cmp = cmp_fn(va->s, vb->s, slen > va->s_size ?
                                             slen : va->s_size);
                        }
                        cmp = cmp ? cmp : va->s_size - vb->s_size;
                }
  ```
It's complicated and buggy.

GOOD VERSION:
  ```c

                        int (*cmp_fn)(const void *, const void *, size_t);
                        cmp_fn = s->sort_flags & REF_SORTING_ICASE
                                ? memcasecmp : memcmp;
                        size_t a_size = va->s_size == ATOM_VALUE_S_SIZE_INIT ?
                                        strlen(va->s) : va->s_size;
                        size_t b_size = vb->s_size == ATOM_VALUE_S_SIZE_INIT ?
                                        strlen(vb->s) : vb->s_size;

                        cmp = cmp_fn(va->s, vb->s, b_size > a_size ?
                                     a_size : b_size);
                        if (!cmp) {
                                if (a_size > b_size)
                                        cmp = 1;
                                else if (a_size < b_size)
                                        cmp = -1;
                        }

  ```
It's relatively refreshing a lot.

So how to cultivate a good coding style? As `Felipe Contreras` said: "It's like learning the
slang of a new city; it takes a while."

### What's the next step
There are still some flaws in the %(raw) implementation, but let's look ahead and see what we can do. We check the atoms with `verify_ref_format()` and pass object oid and grub corresponding object data through `format_ref_array_item()`:

|Git command|Atoms|
|-|-|
|`git cat-file --batch-check` | `%(objectname) %(objecttype) %(objectsize)`|
|`git cat-file --batch --symlink`| `%(objectname) %(objecttype) %(objectsize)`|
|`git cat-file --batch` | `%(objectname) %(objecttype) %(objectsize)\n%(raw)`|
|`git cat-file --batch --textconv` | `%(objectname) %(objecttype)
%(objectsize)\n%(raw:textconv)`|
|`git cat-file --batch --filter` | `%(objectname) %(objecttype)
%(objectsize)\n%(raw:filter)`|
|`git cat-file --batch="%(rest)"` | `%(rest)`|

No additional operation is required in `git cat-file --batch --symlink`, because `get_oid_with_context(...,GET_OID_FOLLOW_SYMLINKS,...)` can help us do that.

I have leave the rough implementation here:
[adlternative:cat-file-temp](https://github.com/gitgitgadget/git/compare/master...adlternative:cat-file-temp).
its performance is 25% worse than before.

Rather than posting it to the mailing list, because I still need to implement the previous dependencies step by step...

Thanks!

--
ZheNing Hu
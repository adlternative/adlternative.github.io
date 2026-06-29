---
title: 'GSOC, Git Blog 2'
titleZh: "GSOC，Git 博客 2"
date: 2021-05-30 22:27:29
tags: git
---

<div class="lang-section" data-lang="en">

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

</div>

<div class="lang-section" data-lang="zh">

## 第二周：学习一座新城市的俚语

### 本周发生了什么
- 在 [[PATCH 1/2] [GSOC] ref-filter: add %(raw)
atom](https://lore.kernel.org/git/b3848f24f2d3f91fc96f20b5a08cbfbe721acbd6.1622126603.git.gitgitgadget@gmail.com/) 中，我这周犯了一个与许可证相关的错误。当我在为 ref-filter 实现 `%(raw)` 原子时，我注意到 `glibc` 没有提供 `memcasecmp()` 函数，该函数可用于比较两段内存并忽略大小写，于是我在网上找到了 `gnulib` 实现的 `memcasecmp()`，并把它复制到 git 中使用。但不幸的是，我不应该如此“方便地”复制它。Git 使用 `gpl-v2`，而 `gnulib` 使用 `gpl-v3`，两者不兼容。由于我以前常写自用的代码，所以对许可证问题不太敏感。感谢 `Felipe Contreras` 纠正了我。因此，从今天起，我会更加注意许可证问题。
- 另一方面，我意识到干净的代码也是非常重要的。在 `cmp_ref_sorting()` 中，我想用
`memcmp()/memcasecmp()` 来比较两个字符串。

糟糕的版本：
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
它复杂且有 bug。

较好的版本：
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
它相对清爽了很多。

那么如何培养良好的编码风格呢？正如 `Felipe Contreras` 所说：“这就像学习一座新城市的俚语，需要时间。”

### 下一步计划
`%(raw)` 的实现仍有一些缺陷，但让我们向前看，看看还能做些什么。我们通过 `verify_ref_format()` 检查原子，并通过 `format_ref_array_item()` 传递对象 oid 和抓取相应的对象数据：

|Git 命令|原子|
|-|-|
|`git cat-file --batch-check` | `%(objectname) %(objecttype) %(objectsize)`|
|`git cat-file --batch --symlink`| `%(objectname) %(objecttype) %(objectsize)`|
|`git cat-file --batch` | `%(objectname) %(objecttype) %(objectsize)\n%(raw)`|
|`git cat-file --batch --textconv` | `%(objectname) %(objecttype)
%(objectsize)\n%(raw:textconv)`|
|`git cat-file --batch --filter` | `%(objectname) %(objecttype)
%(objectsize)\n%(raw:filter)`|
|`git cat-file --batch="%(rest)"` | `%(rest)`|

在 `git cat-file --batch --symlink` 中不需要额外的操作，因为 `get_oid_with_context(...,GET_OID_FOLLOW_SYMLINKS,...)` 可以帮我们完成这一点。

我已将粗略的实现放在这里：
[adlternative:cat-file-temp](https://github.com/gitgitgadget/git/compare/master...adlternative:cat-file-temp)。
它的性能比之前差了 25%。

我还没有把它发到邮件列表上，因为我仍需要逐步实现前面的依赖……

谢谢！

--
ZheNing Hu

</div>
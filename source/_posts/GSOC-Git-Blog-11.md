**---
title: 'GSOC, Git Blog 11'
date: 2021-07-31 14:25:46
tags: git
---

### Attempt to optimize performance

This week, at the prompt of my mentor Christian, I used `gprof` for some performance tests about `git cat-file --batch`: [Re: [GSOC] How to improve the performance of git cat-file --batch](https://lore.kernel.org/git/CAOLTT8TdL7UhfVSOzbpmo-WFNrcKwmy=E720tNt4KM9o_p=keg@mail.gmail.com/)

```
This is my test for git cat-file --batch --batch-all-objects >/dev/null:

daab8a564: The fifth batch (upstream/master)

Flat profile:

Each sample counts as 0.01 seconds.
  %   cumulative   self              self     total
 time   seconds   seconds    calls   s/call   s/call  name
 38.13      0.61     0.61  1968866     0.00     0.00  patch_delta
 13.75      0.83     0.22  6568488     0.00     0.00
unpack_object_header_buffer
 11.25      1.01     0.18   344036     0.00     0.00  unpack_entry
  7.50      1.13     0.12  1964667     0.00     0.00  hashmap_remove
  6.88      1.24     0.11  6153182     0.00     0.00  hashmap_get
  1.88      1.27     0.03  7746299     0.00     0.00  zlib_post_call
  1.88      1.30     0.03   842731     0.00     0.00  bsearch_hash
  1.88      1.33     0.03   827663     0.00     0.00  nth_packed_object_offset
  1.25      1.35     0.02 15385422     0.00     0.00  use_pack
  1.25      1.37     0.02  6236120     0.00     0.00  get_delta_base
  1.25      1.39     0.02  2581859     0.00     0.00  git_inflate_end
  1.25      1.41     0.02   826650     0.00     0.00
do_oid_object_info_extended
  1.25      1.43     0.02   826650     0.00     0.00  find_pack_entry
  1.25      1.45     0.02   825692     0.00     0.00  packed_to_object_type
  1.25      1.47     0.02   378521     0.00     0.00  get_size_from_delta


d3b5272a94: [GSOC] cat-file: reuse ref-filter logic

Flat profile:

Each sample counts as 0.01 seconds.
  %   cumulative   self              self     total
 time   seconds   seconds    calls   s/call   s/call  name
 27.06      0.59     0.59  1968866     0.00     0.00  patch_delta
 16.51      0.95     0.36  2202293     0.00     0.00
unpack_object_header_buffer
 13.76      1.25     0.30  5327015     0.00     0.00  hashmap_get
 11.47      1.50     0.25   344036     0.00     0.00  unpack_entry
  8.72      1.69     0.19   521278     0.00     0.00  lookup_object
  4.13      1.78     0.09  1964667     0.00     0.00  hashmap_remove
  2.75      1.84     0.06   348709     0.00     0.00  get_object
  2.29      1.89     0.05        1     0.05     2.17  oid_array_for_each_unique
  1.38      1.92     0.03  6373452     0.00     0.00  use_pack
  0.92      1.94     0.02  2202293     0.00     0.00  unpack_compressed_entry
  0.92      1.96     0.02  1394836     0.00     0.00  grab_sub_body_contents
  0.92      1.98     0.02   348709     0.00     0.00  create_object
  0.92      2.00     0.02   348709     0.00     0.00  format_ref_array_item
  0.92      2.02     0.02    74557     0.00     0.00  fill_commit_graph_info
```

Before, I might think that the proportion of `lookup_object()` is not very large(11.47%), so I didn't care about it. But Christian strongly recommends that I use `trace_printf()` to observe the number of calls to `lookup_object()`.

Here is an amazing fact:

The number of calls to `lookup_object()` before and after using my patch are 0 and 522709 respectively. Therefore, I am very surprised, why do we have these additional calls?

```
(gdb) bt
#0  lookup_object (r=r@entry=0x5555558b8cc0 <the_repo>, oid=oid@entry=0x5555558b8980 <oi>) at object.c:92
#1  0x0000555555665572 in lookup_commit (r=0x5555558b8cc0 <the_repo>, oid=0x5555558b8980 <oi>) at commit.c:62
#2  0x00005555556edff5 in parse_object_buffer (r=0x5555558b8cc0 <the_repo>, oid=oid@entry=0x5555558b8980 <oi>, type=OBJ_COMMIT, size=788, buffer=0x5555558d0080, eaten_p=eaten_p@entry=0x7fffffffcc0c)
    at object.c:214
#3  0x000055555571da42 in get_object (ref=ref@entry=0x7fffffffcf30, deref=deref@entry=0, obj=obj@entry=0x7fffffffcc90, oi=oi@entry=0x5555558b8980 <oi>, err=err@entry=0x7fffffffcf10)
    at ref-filter.c:1774
#4  0x000055555571fdc2 in populate_value (ref=ref@entry=0x7fffffffcf30, err=err@entry=0x7fffffffcf10) at ref-filter.c:1999
#5  0x00005555557202eb in get_ref_atom_value (ref=ref@entry=0x7fffffffcf30, atom=0, v=v@entry=0x7fffffffcea8, err=err@entry=0x7fffffffcf10) at ref-filter.c:2033
#6  0x00005555557212d6 in format_ref_array_item (info=info@entry=0x7fffffffcf30, format=format@entry=0x7fffffffd0f0, final_buf=final_buf@entry=0x7fffffffd060,
    error_buf=error_buf@entry=0x7fffffffcf10) at ref-filter.c:2627
#7  0x00005555555859d8 in batch_object_write (scratch=0x7fffffffd060, opt=0x7fffffffd0d0, data=<optimized out>, obj_name=0x0) at builtin/cat-file.c:224
```

After printing the call stack of `lookup_object()`, we can know that `parse_buffer()` is calling it. A very straightforward idea, can we avoid calling this function?

In `parse_object_buffer()`, `parse_blob_buffer()`, ``parse_tree_buffer()`, `parse_commit_buffer()`, and `parse_tag_buffer()` parse the object data, and then store it in `struct object *obj`, and finally return it to the caller.

`get_object()` will feed the `obj` to `grab_values()`, and then `grab_values()` will feed the `obj` to `grab_tag_values()`, `grab_commit_values`, which can fill the info in `obj` to implement some atom, e.g. `%(tag)`, `%(type)`, `%(object)`, `%(tree)`, `%(numparent)`,`%(parent)`. It is worth noting that `%(objectname)`, `%(objecttype)`, `%(objectsize)`, `%(deltabase)`, `%(rest)`, `%(raw)` don't appear in them, this means that we can avoid parsing object buffer when we don't use those atoms which require `obj`'s information!

After some processing and adaptation, I made a patch which can skip `parse_object_buffer()` in some cases, this is the result of the performance test of `t/perf/p1006-cat-file.sh`:

```
Test                                        HEAD~             HEAD                  
------------------------------------------------------------------------------------
1006.2: cat-file --batch-check              0.10(0.09+0.00)   0.11(0.10+0.00) +10.0%
1006.3: cat-file --batch-check with atoms   0.09(0.08+0.01)   0.09(0.06+0.03) +0.0% 
1006.4: cat-file --batch                    0.62(0.58+0.04)   0.57(0.54+0.03) -8.1% 
1006.5: cat-file --batch with atoms         0.63(0.60+0.02)   0.52(0.49+0.02) -17.5%
```

We can see that the performance of `git cat-file --batch` has been a certain improvement!

Tell a joke: removing 1984531500 if checks can reduce the startup time of GTA5 by 70%. :-D

[link](https://rockstarintel.com/a-fan-reduces-gta-online-loading-times-by-70)

Currently the patch has not been submitted to the mailing list, let us wait a bit...
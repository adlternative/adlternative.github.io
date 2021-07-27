---
title: gprof-learn
date: 2021-07-27 10:17:31
tags: PerformanceTestingTools
---

编译的时候加一个链接参数 `-pg` 如使用`make` 则是 `CFLAGS+= -lg`。

```sh
$ gprof -b git gmon.out  |head -64
Flat profile:

Each sample counts as 0.01 seconds.
  %   cumulative   self              self     total
 time   seconds   seconds    calls   s/call   s/call  name
 27.06      0.59     0.59  1968866     0.00     0.00  patch_delta
 16.51      0.95     0.36  2202293     0.00     0.00  unpack_object_header_buffer
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

* time: 函数在总调用时间占比。
* cumulative seconds: 当前函数执行时间和之上所有函数执行时间的总和。
* self seconds: 当前函数单独执行时间。
* self ms/call: 如果这个函数被分析，则表示每次调用该函数的平均微秒数，否则为空。
* total ms/call: 如果这个函数被分析，则表示所有调用该函数和其子函数的平均微秒数，否则为空。
* name: 函数的名称。

### 参考
- [Interpreting gprof’s Output](https://sourceware.org/binutils/docs/gprof/Output.html)
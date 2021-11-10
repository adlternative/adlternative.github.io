---
title: Volcano Learning
date: 2021-11-10 20:08:19
tags: DB
hidden: true
---

SQL 查询优化的一种方式。

火山模型 迭代模型

真的很像火山...

机制与策略分离

算子之间的独立性

可扩展性

想起之前参与 `miniob` 比赛，我们仅仅确定了算子的执行顺序，`sql 解析 -> 决定需要读取的表和字段 -> 从这些表读取数据 -> 多表联结 -> 排序 -> 分组 -> 聚合 -> 输出` ，但是耦合程度高，不易修改，扩展，优化。

choose-plan 操作符

exchange 操作符

并发: 算子内部并发，多算子并发

被喷的 c++ 虚函数开销 有多大？

虚函数需要一次间接寻址，虚函数难以内敛。和数据库本身的开销相比是很小的。

优化：物化视图，向量化，代码生成。

1. 向量化：
   * 在火山模型的基础上实施批处理。
   优点：
   1. 减少函数调用次数，减小虚函数调用开销。
   2. [SIMD](https://en.wikipedia.org/wiki/SIMD)


参考:
1. [https://paperhub.s3.amazonaws.com/dace52a42c07f7f8348b08dc2b186061.pdf](https://paperhub.s3.amazonaws.com/dace52a42c07f7f8348b08dc2b186061.pdf)
2. [https://zhuanlan.zhihu.com/p/34220915](https://zhuanlan.zhihu.com/p/34220915)
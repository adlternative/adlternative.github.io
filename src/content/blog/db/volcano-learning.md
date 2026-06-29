---
title: 'Volcano Learning'
titleZh: '火山模型学习'
date: 2021-11-10 20:08:19
tags: DB
---

<div class="lang-section" data-lang="en">

A way to optimize SQL queries.

Volcano model, iterator model.

It really is like a volcano...

Separation of mechanism and policy.

Independence between operators.

Extensibility.

It reminds me of the `miniob` competition I took part in before: we only determined the execution order of operators, `sql parsing -> decide which tables and columns to read -> read data from these tables -> multi-table join -> sort -> group -> aggregate -> output`, but the coupling was high and it was hard to modify, extend, or optimize.

`choose-plan` operator.

`exchange` operator.

Concurrency: intra-operator concurrency, multi-operator concurrency.

How big is the much-criticized overhead of C++ virtual functions?

Virtual functions require an extra indirection, and virtual functions are hard to inline. Compared with the overhead of the database itself, it is small.

Optimizations: materialized views, vectorization, code generation.

1. Vectorization:
   * Implement batch processing on top of the volcano model.
   Advantages:
   1. Reduce the number of function calls and decrease virtual function call overhead.
   2. [SIMD](https://en.wikipedia.org/wiki/SIMD)


References:
1. [https://paperhub.s3.amazonaws.com/dace52a42c07f7f8348b08dc2b186061.pdf](https://paperhub.s3.amazonaws.com/dace52a42c07f7f8348b08dc2b186061.pdf)
2. [https://zhuanlan.zhihu.com/p/34220915](https://zhuanlan.zhihu.com/p/34220915)

</div>

<div class="lang-section" data-lang="zh">

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

</div>

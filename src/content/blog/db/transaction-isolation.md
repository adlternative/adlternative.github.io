---
title: 'Transaction Isolation'
titleZh: '事务隔离'
date: 2021-10-31 11:33:58
tags: DB
---

<div class="lang-section" data-lang="en">

# I(solation)

`Isolation` determines the visibility of a transaction to other users and the system.
`Isolation` is concerned with ensuring that multiple concurrent transactions do not interfere with each other when reading and writing.


### Isolation Conflicts
1. Dirty read (write-read conflict): reading data that another transaction has written but not yet committed.
2. Dirty write (write-write conflict): one transaction overwrites data that another transaction has written but not yet committed.
3. Non-repeatable read (read-write conflict): reading the same row multiple times within a transaction and getting different results. (UPDATE)
4. Phantom read: two identical queries in a transaction return different sets of rows. (INSERT, DELETE)
5. Lost update (write conflict): two transactions read-modify-write the same data; because the second write does not include the value modified by the first transaction, and the second read is a snapshot read, the first transaction's modification is ultimately lost.
6. Write skew (write conflict) (a form of phantom read, broadly a lost update): two transactions read-modify-write multiple data items; because the first write modifies data that the second transaction read, and the second read is a snapshot read, the result is a logical error.

```
x := int[]{1, 2}

for i := 0; i < 2; i++ {
   go func() {
     if len(x) >= 2 {
        // danger!
        x = x[1:]
     }
   }()
}
fmt.Println(len(x)) // maybe 0
```

How to resolve these conflicts in transactions? By setting an appropriate isolation level.
Weaker isolation levels favor concurrency among transactions, but may produce the conflicts described above.
In theory, we can choose a lower isolation level to achieve better performance as long as correctness is not compromised. The choice depends on the application scenario.

### Isolation Levels

1. Read uncommitted
* When a transaction modifies data, other transactions can still read that data even if the modifying transaction has not yet committed.
* Read: row-level shared lock.
* Write: none.
* Pros: good performance.
* Cons: `dirty reads`.

2. Read committed
* When a transaction modifies data, other transactions cannot read that data until the modifying transaction has committed.
* Read:
  1. Row-level shared lock, released after reading.
  2. Maintain both an old value and a new value for every object to be updated; before the transaction commits, all other transactions read the old value, and after the write transaction commits, they read the new value.
* Write: row-level exclusive lock, released when the transaction ends.
* Pros: no `dirty reads` or dirty writes.
* Cons: `non-repeatable reads`.

3. Repeatable read
* When a transaction reads data, other transactions cannot modify that data until the reading transaction commits.
* Read: row-level shared lock, released when the transaction ends.
* Write: row-level exclusive lock, released when the transaction ends.
* Pros: no dirty reads, dirty writes, or non-repeatable reads.
* Cons: `phantom reads`.

4. Snapshot isolation
* MVCC (Multi-Version Concurrency Control)
* Only allows reading committed versions of data that existed before the transaction began. A solution that can benefit concurrency and reduce isolation conflicts.

* Pros: no dirty writes, dirty reads, non-repeatable reads, or (read-only) phantom reads.
* Cons: lost updates, `write skew` (phantom reads involving writes).
  * Solutions:
    1. Pessimistic locking: write locks.
    2. Optimistic locking: ignore conflicts initially and resolve them at the end.

5. Serializable

* Read: table-level shared lock, released when the transaction ends.
* Write: table-level exclusive lock, released when the transaction ends.
* Pros: no dirty reads, lost updates, non-repeatable reads, or phantom reads.
* Cons: serialization, low degree of transaction concurrency.

### References:
- [https://tech.ipalfish.com/blog/2020/03/26/isolation/](https://tech.ipalfish.com/blog/2020/03/26/isolation/)

</div>

<div class="lang-section" data-lang="zh">

# I(solation)

`隔离性` 决定了事务对其他用户以及系统的可见性。
`隔离性` 在乎的是多个事务在并发读写不会相互干扰。


### 隔离冲突
1. 脏读（写读冲突）：读到某个事务读取其他事务未提交的数据。
2. 脏写（写写冲突）：某个事务覆盖另一个事务未提交的数据。
3. 不可重复读（读写冲突）：事务中读取同一行数据获取多次得到不同的结果。（UPDATE）
4. 幻读：事务中两个相同查询获得的数据集合不同。（INSERT, DELETE）
5. 更新丢失（写冲突）：两个事务对同一个数据执行读-修改-写回，由于第二个写操作不包含第一个事务修改后的值，第二个读的数据属于快照读，最终会导致第一个事务的修改值丢失。
6. 写倾斜（写冲突）（属于幻读，属于广义的更新丢失）：两个事务对多个数据执行读-修改-写回，由于第一个写操作会修改第二个事务的读的数据，第二个读的数据属于快照读，最终会导致逻辑错误。

```
x := int[]{1, 2}

for i := 0; i < 2; i++ {
   go func() {
     if len(x) >= 2 {
        // danger!
        x = x[1:]
     }
   }()
}
fmt.Println(len(x)) // maybe 0
```

如何解决事务中的这些冲突？设置合理的隔离级别。
较弱的隔离级别有利于多事务的并发，但是可能会出现上述的冲突。
理论上，在不损害正确性的情况下，我们可以设置较低的隔离级别以获得更好的性能。选择决定于应用场景。

### 隔离级别

1. 未提交读
* 一个事务修改数据，如果该事务尚未提交，其他事务仍然可以读取该数据。
* 读：行级分享锁。
* 写：无。
* 优点：性能好。
* 缺点：`脏读`。

2. 提交读
* 一个事务修改数据，如果该事务尚未提交，其他事务不可以读取该数据。
* 读：
  1. 行级分享锁, 读完释放。
  2. 对每一个待更新对象维护旧值和将要被设置成的新值，在该事务提交之前，所有其他事务的读取只获得旧值，写事务提交后获得新值。
* 写： 行级独占锁, 事务结束释放。
* 优点： 无 `脏读`，脏写。
* 缺点： `不可重复读`。

3. 可重复读
* 一个事务读取数据，如果该事务尚未提交，其他事务不可以修改该数据。
* 读： 行级分享锁, 事务结束释放。
* 写： 行级独占锁, 事务结束释放。
* 优点： 无 脏读，脏写，不可重复读。
* 缺点： `幻读`。

4. 快照级别隔离
* MVCC（Multi-Version Concurrency Control）
* 只允许读取事务开始前已提交版本的数据。既可以利于并发，又可以减少隔离冲突的一种解决方式。

* 优点：无 脏写，脏读，不可重复读，（只读）幻读。
* 缺点：更新丢失，`写倾斜`（有写的幻读）。
  * 解决方式：
    1. 悲观锁：写锁。
    2. 乐观锁：开始不管，最后冲突解决。

5. 可串行化

* 读： 表级分享锁, 事务结束释放。
* 写： 表级独占锁, 事务结束释放。
* 优点： 无 脏读，更新丢失，不可重复读，幻读。
* 缺点： 串行化，事务并发程度低。

### 参考：
- [https://tech.ipalfish.com/blog/2020/03/26/isolation/](https://tech.ipalfish.com/blog/2020/03/26/isolation/)

</div>

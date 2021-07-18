---
title: FUTEX_SWAP INTRODUCTION
date: 2021-07-19 00:08:34
tags: OS
---

## FUTEX_SWAP 介绍

### Google SwitchTo
由于协程本身对操作系统的不可见性，协程中出现的 BUG 往往不能通过一些已有的工具去排查。在谷歌内部有一套闭源的用户态任务调度框架 `SwitchTo`, 这个框架可以为谷歌提供延迟敏感的服务，对运行的内容进行细粒度的用户空间控制/调度，它可以让内核来实现上下文的切换，同时将任务何时切换，何时恢复的工作交给了用户态的程序来做，这样既可以实现在任务间协作式切换的功能，又可以不丧失内核对于任务的控制和观察能力。谷歌去年恢复尝试将其 `SwitchTo` API 上游引入 Linux。相关补丁见：[1]，[2]，[3]，[4].

```c
pid_t switchto_wait(timespec *timeout)
/*  Enter an 'unscheduled state', until our control is re-initiated by another thread or external event (signal). */
void switchto_resume(pid_t tid)
/* Resume regular execution of tid */
pid_t switchto_switch(pid_t tid)
/* Synchronously transfer control to target sibling thread, leaving the current thread unscheduled.Analogous to:Atomically { Resume(t1); Wait(NULL); }
*/
```

这是使用 `SwitchTo` 和使用其他线程间切换的组件的上下文切换性能对比：

| Benchmark       | Time(ns) | CPU(ns) | Iterations |
| --------------- | -------- | ------- | ---------- |
| BM_Futex        | 2905     | 1958    | 1000000    |
| BM_GoogleMutex  | 3102     | 2326    | 1000000    |
| BM_SwitchTo     | 179      | 178     | 3917412    |
| BM_SwitchResume | 2734     | 1554    | 1000000    |

可以看到在使用 `SwitchTo` 后切换的性能比其他组件提高了一个数量级别。

`SwitchTo` 是如何做到在切换性能上大幅度领先的呢？我们暂时可能无法看到它们，但让我们来看看 `Peter Oskolkov` 向 LKML（Linux Kernel Mail List） 提出的补丁中有关 `futex_swap()` 的实现。可以确定的是，`SwitchTo` 构建在这个内核函数之上。

### 什么是 futex

`futex` 全称 `fast user-space locking`，快速用户空间互斥锁，作为内核中一种基本的同步原语，它提供了非常快速的无竞争锁获取和释放，用于构建复杂的同步结构：互斥锁、条件变量、信号量等。 由于 `futex` 的一些机制和使用过于复杂，`glibc` 没有为 `futex` 提供包装器，但我们仍然可以使用 `syscall` 来调用这个 极其 hack 的系统调用。

```c
static int futex(uint32_t *uaddr, int futex_op, uint32_t val,
                 const struct timespec *timeout, uint32_t *uaddr2,
                 uint32_t val3) {
  return syscall(SYS_futex, uaddr, futex_op, val, timeout, uaddr2, val3);
}
```

* `uaddr`: 一个四字节的用户空间地址。多个任务间可以通过 `*uaddr` 的值的变化来控制阻塞或者运行。
* `futex_op`: 用于控制 `futex` 执行的命令 如 `FUTEX_WAIT`，`FUTEX_WAKE`，`FUTEX_LOCK_PI`，`FUTEX_UNLOCK_PI`...
* `val`: 在不同的 `futex_op` 具有不同的含义，如在 `futex(uaddr, FUTEX_WAKE)` 中作为唤醒等待在该 `futex` 上所有任务的数量。
* `timeout`: 作为等待（如 `FUTEX_WAIT`）的超时时间。
* `uaddr2`: `uaddr2` 参数是一个四字节的用户空间地址 在需要的场景使用（如后文的 `FUTEX_SWAP` ）。
* `val3`: 整数参数`val3`的解释取决于在操作上。


### 为什么 futex “快速”？

由于用户模式和内核模式之间的上下文切换很昂贵，`futex` 实现的同步结构会尽可能多地留在用户空间，这意味着它们只需要执行更少的系统调用。`futex` 的状态存储在用户空间变量中，`futex` 可以通过一些原子操作在没有竞争的情况下更改 `futex` 的状态，而无需系统调用的开销。

### futex_wait() 和 futex_wake()

在看 `futex_swap()` 之前让我们先看看 内核中 与 `futex` 最重要的两个内核函数：
```c
static int futex_wait(u32 __user *uaddr, unsigned int flags, u32 val, ktime_t *abs_time, u32 bitset);
```
简单来说 对于 `futex_wait()` 有用的参数就只有 `uaddr`，`val`，`abs_time`，就像 `futex_wait(uaddr,val,abs_time)`。其含义是当这个用户空间地址 `uaddr`的值等于传入的参数 `val` 的时候睡眠，即 `if (*uaddr == val) wait()`. `futex_wake()` 可以将它唤醒，另外还可以通过指定超时时间来超时唤醒。

```c
static int futex_wait(u32 __user *uaddr, unsigned int flags, u32 val,
		      ktime_t *abs_time, u32 bitset)
{
	struct hrtimer_sleeper timeout, *to;
	struct restart_block *restart;
	struct futex_hash_bucket *hb;
	struct futex_q q = futex_q_init;
	int ret;

	if (!bitset)
		return -EINVAL;
	q.bitset = bitset;
  /* 设置定时器 */
	to = futex_setup_timer(abs_time, &timeout, flags,
			       current->timer_slack_ns);
retry:
	/*
	 * Prepare to wait on uaddr. On success, holds hb lock and increments
	 * q.key refs.
	 */
	/* 获取哈希桶自旋锁 如果 *uaddr == val return -EWOULDBLOCK 否则返回 0 */
	ret = futex_wait_setup(uaddr, val, flags, &q, &hb);
	if (ret)
		goto out;

	/* queue_me and wait for wakeup, timeout, or a signal. */
	/*将当前任务状态改为TASK_INTERRUPTIBLE，并将当前任务插入到futex等待队列，释放哈希桶自旋锁，然后重新调度*/
	futex_wait_queue_me(hb, &q, to);

	/* If we were woken (and unqueued), we succeeded, whatever. */
	ret = 0;
	/* unqueue_me() drops q.key ref */
  /* 如果 unqueue_me 返回 0 表示已经被删除则是正常唤醒跳到 out 否则则是超时触发 */
	if (!unqueue_me(&q))
		goto out;
	ret = -ETIMEDOUT;
	if (to && !to->task)
		goto out;

	/*
	 * We expect signal_pending(current), but we might be the
	 * victim of a spurious wakeup as well.
	 */
	if (!signal_pending(current))
		goto retry;

	ret = -ERESTARTSYS;
	if (!abs_time)
		goto out;

	restart = &current->restart_block;
	restart->futex.uaddr = uaddr;
	restart->futex.val = val;
	restart->futex.time = *abs_time;
	restart->futex.bitset = bitset;
	restart->futex.flags = flags | FLAGS_HAS_TIMEOUT;

	ret = set_restart_fn(restart, futex_wait_restart);

out:
	if (to) {
    /* 即将结束，取消定时任务 */
		hrtimer_cancel(&to->timer);
		destroy_hrtimer_on_stack(&to->timer);
	}
	return ret;
}
```

`futex` 内部采用了哈希表的数据结构来保存那些需要睡眠的任务。通过用户空间地址 `uaddr`,`flag`,以及 `futex` 的读写状态可以计算出相同的 `key` 值，将需要睡眠的任务的 `task_struct`放到对应的哈希桶上的优先链表的节点中。

`futex_wait()` 流程：
1. 寻找 `futex` 对应的 `key`，获取 `key` 对应的哈希桶。
1. 获取哈希桶自旋锁，如果 `*uaddr == val` 返回错误给用户态。
2. 否则将当前任务状态改为 `TASK_INTERRUPTIBLE`，并将当前任务插入到 `futex` 等待队列，释放哈希桶自旋锁，然后调度器重新调度。
3. 从睡眠中苏醒，进行超时和唤醒两种情况的相应处理，返回用户态。

```c
static int futex_wake(u32 __user *uaddr, unsigned int flags, int nr_wake, u32 bitset);
```

`futex_wake()` 的参数稍微简单一些，最重要的只有一个用户地址 `uaddr`，以及触发唤醒的任务数最大值 `nr_wake`。

```c
/*
 * Wake up waiters matching bitset queued on this futex (uaddr).
 */
static int
futex_wake(u32 __user *uaddr, unsigned int flags, int nr_wake, u32 bitset)
{
	struct futex_hash_bucket *hb;
	struct futex_q *this, *next;
	union futex_key key = FUTEX_KEY_INIT;
	int ret;
	DEFINE_WAKE_Q(wake_q);

	if (!bitset)
		return -EINVAL;

  /* 寻找 futex 对应的 key */
	ret = get_futex_key(uaddr, flags & FLAGS_SHARED, &key, FUTEX_READ);
	if (unlikely(ret != 0))
		return ret;

  /* 获取 key 对应的哈希桶 */
	hb = hash_futex(&key);

	/* Make sure we really have tasks to wakeup */
  /* 如果哈希桶桑没有等待者...那么谁也不需要被唤醒 */
	if (!hb_waiters_pending(hb))
		return ret;

  /* 获取当前哈希桶的自旋锁 */
	spin_lock(&hb->lock);

  /* 遍历这个哈系桶上的优先链表 */
	plist_for_each_entry_safe(this, next, &hb->chain, list) {
    /* 如果 this 项的 key 与 futex 对应的 key 相同 说明该项在等待 futex */
		if (match_futex (&this->key, &key)) {
			if (this->pi_state || this->rt_waiter) {
				ret = -EINVAL;
				break;
			}

			/* Check if one of the bits is set in both bitsets */
			if (!(this->bitset & bitset))
				continue;

      /* 将 this 添加到唤醒队列 wake_q 中 */
			mark_wake_futex(&wake_q, this);
      /* ret此时为0 递增至 nr_wake 最大唤醒任务数量则退出循环 */
			if (++ret >= nr_wake)
				break;
		}
	}

	spin_unlock(&hb->lock);
	wake_up_q(&wake_q);
	return ret;
}
```

`futex_wake()` 流程：
1. 寻找 `futex` 对应的 `key`，获取 `key` 对应的哈希桶。
2. 获取哈希桶的自旋锁，遍历这个哈系桶上的优先链表，如果当前任务的 `key` 与 `futex` 对应的 `key` 相同，说明该任务在等待 futex，将当前任务添加到唤醒队列 `wake_q` 中，如果达到了 `nr_wake` 个，则退出循环。
3. 释放哈希桶自旋锁，唤醒队列 `wake_q` 中每一个任务。

因此，通过 `futex_wait()` 和 `futex_wake()`，我们可以实现任务的等待和唤醒，见 [5] man 手册中的小 demo。

### FUTEX_SWAP 相关补丁

基于以上的了解，现在我们来看 `Peter Oskolkov` 向内核提交的 `FUTEX_SWAP` 补丁系列。首先看 [4] 中有关 `FUTEX_SWAP` 的相关测试补丁，其中关键的功能函数 `futex_swap_op()` 引起了我们的注意：
```c
void futex_swap_op(int mode, futex_t *futex_this, futex_t *futex_that)
{
	int ret;

	switch (mode) {
	case SWAP_WAKE_WAIT:
		futex_set(futex_this, FUTEX_WAITING);
		futex_set(futex_that, FUTEX_WAKEUP);
		futex_wake(futex_that, 1, FUTEX_PRIVATE_FLAG);
		futex_wait(futex_this, FUTEX_WAITING, NULL, FUTEX_PRIVATE_FLAG);
		if (*futex_this != FUTEX_WAKEUP) {
			fprintf(stderr, "unexpected futex_this value on wakeup\n");
			exit(1);
		}
		break;

	case SWAP_SWAP:
		futex_set(futex_this, FUTEX_WAITING);
		futex_set(futex_that, FUTEX_WAKEUP);
		ret = futex_swap(futex_this, FUTEX_WAITING, NULL,
				 futex_that, FUTEX_PRIVATE_FLAG);
		if (ret < 0 && errno == ENOSYS) {
			/* futex_swap not implemented */
			perror("futex_swap");
			exit(1);
		}
		if (*futex_this != FUTEX_WAKEUP) {
			fprintf(stderr, "unexpected futex_this value on wakeup\n");
			exit(1);
		}
		break;

	default:
		fprintf(stderr, "unknown mode in %s\n", __func__);
		exit(1);
	}
}
```
其中比较了使用 `FUTEX_WAIT`, `FUTEX_WAKE` 实现线程切换以及使用 `FUTEX_SWAP` 实现线程切换的两种方式。

其中 通过调用参数含有 `futex_this` 和 `futex_that` 的 `futex_swap()`，
```c
ret = futex_swap(futex_this, FUTEX_WAITING, NULL,
				 futex_that, FUTEX_PRIVATE_FLAG);
```
代替了下面 `futex_wake()` 和 `futex_wait()` 的两步操作,
```c
futex_wake(futex_that, 1, FUTEX_PRIVATE_FLAG);
futex_wait(futex_this, FUTEX_WAITING, NULL, FUTEX_PRIVATE_FLAG);
```
实现了让当前线程睡眠，并切换到指定线程的作用。

```bash
$ ./futex_swap -i 100000

------- running SWAP_WAKE_WAIT -----------

completed 100000 swap and back iterations in 820683263 ns: 4103 ns per swap
PASS

------- running SWAP_SWAP -----------

completed 100000 swap and back iterations in 124034476 ns: 620 ns per swap
PASS

```

可见在 100k 级别的任务切换批处理上，使用新接口 futex_swap() 的上下文切换性能要比之前好很多。

```c
 /*
- * Wake up waiters matching bitset queued on this futex (uaddr).
+ * Prepare wake queue matching bitset queued on this futex (uaddr).
  */
 static int
-futex_wake(u32 __user *uaddr, unsigned int flags, int nr_wake, u32 bitset)
+prepare_wake_q(u32 __user *uaddr, unsigned int flags, int nr_wake, u32 bitset,
+	       struct wake_q_head *wake_q)
 {
 	struct futex_hash_bucket *hb;
 	struct futex_q *this, *next;
 	union futex_key key = FUTEX_KEY_INIT;
 	int ret;
-	DEFINE_WAKE_Q(wake_q);
 
 	if (!bitset)
 		return -EINVAL;
@@ -1629,20 +1629,34 @@ futex_wake(u32 __user *uaddr, unsigned int flags, int nr_wake, u32 bitset)
 			if (!(this->bitset & bitset))
 				continue;
 
-			mark_wake_futex(&wake_q, this);
+			mark_wake_futex(wake_q, this);
 			if (++ret >= nr_wake)
 				break;
 		}
 	}
 
 	spin_unlock(&hb->lock);
-	wake_up_q(&wake_q);
 out_put_key:
 	put_futex_key(&key);
 out:
 	return ret;
 }

+/*
+ * Wake up waiters matching bitset queued on this futex (uaddr).
+ */
+static int
+futex_wake(u32 __user *uaddr, unsigned int flags, int nr_wake, u32 bitset)
+{
+	int ret;
+	DEFINE_WAKE_Q(wake_q);
+
+	ret = prepare_wake_q(uaddr, flags, nr_wake, bitset, &wake_q);
+	wake_up_q(&wake_q);
+
+	return ret;
+}
+
 s
```

首先是通过从 futex_wake() 中抽出一个 `prepare_wake_q()` 获得 `nr_wake` 个等待在 `futex` 的任务并填入到传入的唤醒队列 `wake_q` 中。

```c
+static int futex_swap(u32 __user *uaddr, unsigned int flags, u32 val,
+		      ktime_t *abs_time, u32 __user *uaddr2)
+{
+	u32 bitset = FUTEX_BITSET_MATCH_ANY;
+	struct task_struct *next = NULL;
+	DEFINE_WAKE_Q(wake_q);
+	int ret;
+
+	ret = prepare_wake_q(uaddr2, flags, 1, bitset, &wake_q);
+	if (!wake_q_empty(&wake_q)) {
+		/* Pull the first wakee out of the queue to swap into. */
+		next = container_of(wake_q.first, struct task_struct, wake_q);
+		wake_q.first = wake_q.first->next;
+		next->wake_q.next = NULL;
+		/*
+		 * Note that wake_up_q does not touch wake_q.last, so we
+		 * do not bother with it here.
+		 */
+		wake_up_q(&wake_q);
+	}
+	if (ret < 0)
+		return ret;
+
+	return futex_wait(uaddr, flags, val, abs_time, bitset, next);
+}
```

`futex_swap()` 流程：
1. 获得等待在 `uaddr2` 上的预备唤醒队列，记录队列第一个任务为 `next`，对其他任务则执行唤醒。
2. 对 `uaddr1` 执行 `futex_wait()`，传入 `next`。

我们看看 `futex_wait()` 上发生了哪些更改：

```c
@@ -2600,9 +2614,12 @@ static int fixup_owner(u32 __user *uaddr, struct futex_q *q, int locked)
  * @hb:		the futex hash bucket, must be locked by the caller
  * @q:		the futex_q to queue up on
  * @timeout:	the prepared hrtimer_sleeper, or null for no timeout
+ * @next:	if present, wake next and hint to the scheduler that we'd
+ *		prefer to execute it locally.
  */
 static void futex_wait_queue_me(struct futex_hash_bucket *hb, struct futex_q *q,
-				struct hrtimer_sleeper *timeout)
+				struct hrtimer_sleeper *timeout,
+				struct task_struct *next)
 {
 	/*
 	 * The task state is guaranteed to be set before another task can
@@ -2627,10 +2644,27 @@ static void futex_wait_queue_me(struct futex_hash_bucket *hb, struct futex_q *q,
 		 * flagged for rescheduling. Only call schedule if there
 		 * is no timeout, or if it has yet to expire.
 		 */
-		if (!timeout || timeout->task)
+		if (!timeout || timeout->task) {
+			if (next) {
+				/*
+				 * wake_up_process() below will be replaced
+				 * in the next patch with
+				 * wake_up_process_prefer_current_cpu().
+				 */
+				wake_up_process(next);
+				put_task_struct(next);
+				next = NULL;
+			}
 			freezable_schedule();
+		}
 	}
 	__set_current_state(TASK_RUNNING);
+
+	if (next) {
+		/* Maybe call wake_up_process_prefer_current_cpu()? */
+		wake_up_process(next);
+		put_task_struct(next);
+	}
 }
 
@@ -2710,7 +2744,7 @@ static int futex_wait_setup(u32 __user *uaddr, u32 val, unsigned int flags,
 }
 
 static int futex_wait(u32 __user *uaddr, unsigned int flags, u32 val,
-		      ktime_t *abs_time, u32 bitset)
+		      ktime_t *abs_time, u32 bitset, struct task_struct *next)
 {
 	struct hrtimer_sleeper timeout, *to;
 	struct restart_block *restart;
@@ -2734,7 +2768,8 @@ static int futex_wait(u32 __user *uaddr, unsigned int flags, u32 val,
 		goto out;
 
 	/* queue_me and wait for wakeup, timeout, or a signal. */
-	futex_wait_queue_me(hb, &q, to);
+	futex_wait_queue_me(hb, &q, to, next);
+	next = NULL;
 
 	/* If we were woken (and unqueued), we succeeded, whatever. */
 	ret = 0;
@@ -2767,6 +2802,10 @@ static int futex_wait(u32 __user *uaddr, unsigned int flags, u32 val,
 	ret = -ERESTART_RESTARTBLOCK;
 
 out:
+	if (next) {
+		wake_up_process(next);
+		put_task_struct(next);
+	}
 	if (to) {
 		hrtimer_cancel(&to->timer);
 		destroy_hrtimer_on_stack(&to->timer);
@@ -2774,7 +2813,6 @@ static int futex_wait(u32 __user *uaddr, unsigned int flags, u32 val,
 	return ret;
 }
```

我们可以看到 `futex_wait()` 传入的 `next` 任务在两种情况下会被唤醒：
1. 当前任务从对 `uaddr` 的等待中苏醒，接着在`futex_wait`结束的时候执行 `wake_up_process()` 切换到 `next` 任务。
2. 在 `futex_wait_queue_me()` 中等待超时（也代表着当前任务从对锁的等待中结束），执行 `wake_up_process()`切换到 `next` 任务。

通过对 `futex` 的魔改, 我们仿佛有了在用户态使用 `switch_to()` 指定任务切换的能力，这真是让人感到兴奋！这就是用户模式线程的用途：极低的切换开销，意味着我们操作系统可以支持的数以千计的线程可以提高到 10 倍以上甚至百万级别！

不过很可惜，该补丁似乎被 Linux 内核社区遗弃。如今补丁作者 `Peter Oskolkov` 正在试图向 Linux 内核引入另外一套 Google 的用户态任务调度框架 `Fiber` [7]，来支持 Linux 世界中 c 系程序员对协作式任务切换的需求。

### 参考资料
[1] https://lore.kernel.org/lkml/414e292195d720c780fab2781c749df3be6566aa.camel@posk.io/

[2] https://lore.kernel.org/lkml/48058b850de10f949f96b4f311adb649b1fb3ff2.camel@posk.io/

[3] https://lore.kernel.org/lkml/d5cf58486a6a5e41581bed9183e8a831908ede0b.camel@posk.io/

[4] https://lore.kernel.org/lkml/a06a25f1380e0da48946b1bb958e1745e5fac964.camel@posk.io/

[5] https://man7.org/linux/man-pages/man2/futex.2.html

[6] https://lwn.net/Articles/360699/

[7] https://lore.kernel.org/lkml/20210520183614.1227046-1-posk@google.com/

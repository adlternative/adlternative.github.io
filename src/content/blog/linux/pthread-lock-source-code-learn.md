---
title: 'pthread_lock_source_code_learn'
date: 2021-03-28 07:58:23
tags: os
---

## pthread_mutex_lock

直接看源码：

```c
int pthread_mutex_lock(pthread_mutex_t *mutex)
{
	int r;

	try_init_preload();

	lock_acquire(&__get_lock(mutex)->dep_map, 0, 0, 0, 1, NULL,
			(unsigned long)_RET_IP_);
	/*
	 * Here's the thing with pthread mutexes: unlike the kernel variant,
	 * they can fail.
	 *
	 * This means that the behaviour here is a bit different from what's
	 * going on in the kernel: there we just tell lockdep that we took the
	 * lock before actually taking it, but here we must deal with the case
	 * that locking failed.
	 *
	 * To do that we'll "release" the lock if locking failed - this way
	 * we'll get lockdep doing the correct checks when we try to take
	 * the lock, and if that fails - we'll be back to the correct
	 * state by releasing it.
	 */
	r = ll_pthread_mutex_lock(mutex);
	if (r)
		lock_release(&__get_lock(mutex)->dep_map, 0, (unsigned long)_RET_IP_);

	return r;
}
```

其中通过`lock_acquire`获取了锁之后执行`ll_pthread_mutex_lock`，如果锁定失败（这个
失败不是指抢夺失败，而是其他一些原因）然后再释放锁资源。

### lll_lock

`ll_pthread_mutex_lock`是使用了glibc中的 `lll_lock`,我们看glibc如何实现的它:
```
/* Acquire the lock at PTR.  */
#define lll_lock(ptr, flags)   \
  ({   \
     int *__iptr = (int *)(ptr);   \
     int __flags = (flags);   \
     if (*__iptr != 0 ||   \
         atomic_compare_and_exchange_bool_acq (__iptr, 1, 0) != 0)   \
       while (1)   \
         {   \
           if (atomic_exchange_acq (__iptr, 2) == 0)   \
             break;   \
           lll_wait (__iptr, 2, __flags);   \
         }   \
     (void)0;   \
   })
```
我们可以看到这个`atomic_compare_and_exchange_bool_acq`，原子比较和交换，
具体含义是什么呢？如果 我们当前的变量等于旧值，就把新值赋值给变量，返回0，
否则直接返回1。

### atomic_compare_and_exchange_bool_acq
```c
#define atomic_compare_and_exchange_bool_acq(mem, newval, oldval) \
  ({ __typeof (mem) __gmemp = (mem);				      \
     __typeof (*mem) __gnewval = (newval);			      \
								      \
     *__gmemp == (oldval) ? (*__gmemp = __gnewval, 0) : 1; })

```

因此翻译一下就是 `atomic_compare_and_exchange_bool_acq (__iptr, 1, 0) != 0)`就是`*__iptr==1` 那么我们就将`__iptr`赋值0,返回1，那么总体上就是`*__iptr==0`或者在我们原子抢锁成功的情况下返回，否则没有拿到锁，则在一个循环内，使用`atomic_exchange_acq`和`lll_wait`， `atomic_exchange_acq`是负责将__iptr赋值2，但如果旧的`__iptr==0`， 那么应该是拿到锁了，就直接退出循环，否则执行 `lll_wait (__iptr, 2, __flags)`,等待`__iptr!=2`，也就是当其他持锁方释放锁了之后，该线程从 `__gsync_wait` 苏醒，然后检查`__iptr`是否等于2，等于2证明抢到锁了退出循环，否则继续循环。

```c
/* Wait on address PTR, without blocking if its contents
 * are different from VAL.  */
#define lll_wait(ptr, val, flags)   \
  __gsync_wait (__mach_task_self (),   \
    (vm_offset_t)(ptr), (val), 0, 0, (flags))
```
但是`__gsync_wait`调用`__gsync_wait_intr`，但是`__gsync_wait_intr` 暂时还不知道是哪里来的。

```c
/* Interruptible version of __gsync_wait.  */
extern kern_return_t __gsync_wait_intr
(
	mach_port_t task,
	vm_offset_t addr,
	unsigned val1,
	unsigned val2,
	natural_t msec,
	int flags
);
```

于是`pthread_lock`通过调用glibc中的`lll_lock`中的`atomic_compare_and_exchange_bool_acq` 来原子抢夺锁和通过`__gync_wait`放弃cpu执行权，调度给其他线程，在其他线程释放锁后苏醒并检查`__iptr`的值来确定自己是否抢夺到锁，从而实现了一个线程在临界区内执行的时候其他线程不能执行的目的。

可能有说错或者遗漏的地方。

完。
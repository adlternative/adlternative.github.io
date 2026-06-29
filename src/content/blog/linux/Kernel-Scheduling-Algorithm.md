---
title: Kernel-Scheduling-Algorithm
titleZh: "内核调度算法"
date: 2021-04-19 18:30:52
tags: os
---

<div class="lang-section" data-lang="en">

## Introduction to Operating System Scheduling Algorithms

### Why Do We Need Scheduling?

1. The operating system needs to make full use of system resources; efficient resource utilization is an important foundation for the OS to run efficiently.
2. The operating system needs to satisfy the goal of concurrent execution of multiple processes.
3. The operating system needs to respond to users as quickly as possible.

### What Are the Scheduling Metrics?

- Performance:
  * Batch tasks: throughput, turnaround time.
  * Interactive tasks: response time.
- Non-performance:
  * Fairness.
  * Resource utilization.
  * Real-time tasks: timeliness.
  * Energy consumption.

Although we hope that a good scheduling policy can improve all metrics at the same time, in reality improving some metrics may affect others. For example, in power-saving mode on our phones, brightness is often limited or the number of apps is restricted, because there is a conflict between performance and energy consumption.

### Scheduling Types

* Scheduling content: task scheduling, I/O scheduling, memory scheduling, energy-aware scheduling.
* Scheduling scenarios: priority scheduling, fair-share scheduling, real-time scheduling, co-scheduling.
* Single-core scheduling, multi-core scheduling.

### What Task Scheduling Algorithms Are There?

#### Classic Scheduling

* FCFS (First-Come, First-Served): maintains a task queue; arriving tasks are pushed to the tail, and each scheduling decision picks the task at the head. Non-preemptive.
  * Advantage: simple and intuitive, friendly to CPU-bound tasks.
  * Disadvantage: not very friendly to short tasks; later short tasks may have long turnaround times.
  * Disadvantage: not very friendly to I/O-bound tasks; when I/O arrives, a task that voluntarily gives up the CPU cannot preempt the CPU in time after the I/O request returns, and must wait, resulting in poor I/O performance.

* SJF (Shortest Job First): when a scheduling decision occurs, pick the task with the shortest running time. Non-preemptive.
  * Disadvantage: requires knowing the task running time in advance, which is hard to predict in normal cases.
  * Disadvantage: depends on task arrival time; short tasks that arrive later still have to wait for earlier long tasks.

* STJF (Shortest Time-to-Completion First): the preemptive version of SJF.
  * Advantage: short tasks are preferred, resulting in fast response time.
  * Disadvantage: long tasks may starve. Because short tasks can preempt the CPU from long tasks, a large number of short tasks may prevent long tasks from getting CPU resources in time, and long-running background tasks will not work properly.

* RR (Round-Robin): each task gets a fixed time slice; every time slice, the scheduler checks whether a task has used up its slice and switches to another task in the queue. After all tasks have run, the time slices are reset.
  * Advantage: strong fairness; different types of tasks all run for a short period before yielding the CPU to other tasks.
  * Advantage: relatively short response time.
  * Disadvantage: if the time slice is too long, response time is long and other tasks wait longer; if the time slice is too short, there are many context switches and high overhead.
  * Disadvantage: long turnaround time.

#### Priority Scheduling

* MLQ (Multi-Level Queue): introduces the concept of priority; different-level queues have different priorities and can use different scheduling policies; the scheduler picks the head task from the highest-priority non-empty queue.
  * Advantage: because different queues can use different policies, it is easy to distinguish different tasks.
  * Disadvantage: tasks in low-priority queues are prone to starvation. If the high-priority queue has a large number of tasks, tasks in low-priority queues cannot execute for a long time.

* MLFQ (Multi-Level Feedback Queue): multi-level queue plus dynamic priority adjustment. It evaluates task execution time to judge short and long tasks, giving short tasks the highest priority. Each queue has a maximum running time; tasks that exceed it are demoted (long tasks are easily demoted). Lower-priority queues are given longer time slices, and all tasks are periodically boosted to the highest priority to avoid starvation.
  * Advantage: dynamically adjusts task priorities, short tasks run first, and long tasks do not starve.
  * Disadvantage: requires parameter tuning. If the priority-boost interval is too short, all tasks stay in the highest-priority queue and the policy degenerates into RR. If the interval is too long, low-priority long tasks cannot execute.

#### Real-Time Scheduling

Real-time operating systems have different considerations: tasks have explicit upper bounds on completion time, with deterministic and predictable latency. (Not expanded here.)

* RM (Rate-Monotonic): a higher rate means a shorter task period and a more urgent deadline, so higher priority is assigned. Preemptive. It has stable task latency but cannot guarantee deadline requirements.

* EDF (Earliest Deadline First): uses the deadline as the basis for priority. It can meet task deadline requirements when CPU utilization <= 1.

#### Other Scheduling

* BVT (Borrowed Virtual Time): tasks are prioritized by reducing their effective virtual time.
* ...

#### What Are the Current Linux Scheduling Algorithms?

* O(N) (v <= 2.4)
  * Based on the RR policy.
  * The scheduler dynamically computes priorities at scheduling time and picks the highest-priority task.
  * Completed tasks are removed and placed at the tail of the queue when scheduled again.
  * During a scheduling period, the scheduler traverses the queue and updates every task's time slice, adding half of the remaining time slice to the next scheduling period.
  * Disadvantage: high scheduling overhead.
  * Disadvantage: poor multi-core scalability.

* O(1) (v == 2.6.0)
  * Each CPU has an active queue and an expired queue. Both are multi-level queues, and a bitmap allows O(1) lookup of the first task in the first non-empty queue in the active queue.
  * Low scheduling overhead.
  * Guarantees small latency for interactive tasks.
  * Disadvantage: uses static time slices, so scheduling latency depends on the number of tasks.
  * Disadvantage: the heuristic for judging task types is overly complex.

* CFS (Completely Fair Scheduler)
  * Uses a red-black tree as the task queue, indexed by virtual time, so the task with the smallest virtual time can be found in O(1), and the scheduler picks that task.
  * Every task is executed once within a scheduling period, ensuring fairness.
  * Assigns dynamic time slices. Within a scheduling period, tasks with different priorities run for different amounts of physical time, but their virtual time increases by the same amount.
  * Tasks that are woken up from blocking are preferred.
  * Used for non-real-time tasks.
  * Scheduling policies: SCHED_OTHER, SCHED_BATCH, SCHED_IDLE.

* RT (Real-Time Scheduler)
  * Uses a multi-level priority queue to schedule real-time tasks.
  * Scheduling policies: SCHED_FIFO, SCHED_RR.

* DL (Deadline Scheduler)
  * Similar to the EDF scheduling policy.
  * Scheduling policy: SCHED_DEADLINE.

</div>

<div class="lang-section" data-lang="zh">

## 操作系统调度算法介绍
### 为什么需要调度？
1. 操作系统需要充分利用系统的资源，资源的有效利用是让操作系统高效运行的重要基础。
2. 操作系统需要满足多个进程并发执行的目标。
3. 操作系统需要尽快响应用户。
### 调度指标有哪些？
- 性能：
  * 批处理任务：吞吐量，周转时间。
  * 交互式任务：响应时间。
- 非性能：
  * 公平性。
  * 资源利用率。
  * 实时任务：实时性。
  * 能耗。
尽管我们希望一个好的调度策略可以让所有的调度指标都好，但是事实上我们在提高一些指标的同时其他指标可能会受到影响，比如我们手机的省电模式下往往只让你使用有限的亮度或限制app使用数量，就是因为性能和能耗两个不同指标间存在冲突。

### 调度类型
* 调度内容： 任务调度，IO调度，内存调度，能耗感知调度。
* 调度场景：优先级调度，公平共享调度，实时调度，协同调度。
* 单核调度，多核调度。
### 有哪些任务调度算法？
#### 经典调度
  * FCFS（先来先服务）：维护一个任务队列，到来的任务push到队尾，每次调度从队首取任务执行，不支持抢占。
    * 优点：简单直观，对CPU密集型任务友好。
    * 缺点：对短任务不太友好，后来的短任务需要很长周转时间。
    * 缺点：对IO密集型任务不太友好，当IO到来时，主动放弃CPU资源的任务在之后IO请求返回的时候无法及时抢占CPU资源，必须等待，导致IO的性能很低。
  * SJF（最短任务优先）：在调度发生时选择运行时间最短的任务执行，不支持抢占。
    * 缺点：需要预知任务时间，常规情况难以预测。
    * 缺点：依赖任务到达时间，后到达的短任务仍然需要等待之前的长任务时间。
  * STJF（最短完成时间任务优先）：SJF的抢占版本。
    * 优点：短任务优先，响应时间快。
    * 缺点：长任务饥饿。由于那些短任务可抢占长任务CPU，这会导致大量的短任务可能让长任务无法及时占用CPU资源，那些后台执行的长任务将无法正常工作。
  * RR（时间片轮转）：每个任务定长时间片，每隔一个时间片检查一个任务是否时间片用完，用完则调度切换到队列的其他任务执行。之后当所有任务都执行完了，再重置时间片。
    * 优点：公平性强，不同类型任务之间都会执行一定较短时间，然后将CPU让给其他的任务。
    * 优点：响应时间较短。
    * 缺点：若时间片过长，则响应时间长，其他任务的等待时间也长;若时间片过短，上下文切换多，性能开销大。
    * 缺点：周转时间较长。
#### 优先级调度
  * MLQ（多级队列）：引入优先级的概念，不同级别的队列有不同的优先级，可以采用不同的调度策略，选择非空的最高优先级的队列的队首任务进行调度。
    * 优点：由于不同的队列可以有不同的策略，利于区分不同任务。
    * 缺点：低优先级队列上的任务容易饥饿。如果高优先级队列有大量的任务，则低优先级队列上的任务迟迟无法执行。
  * MLFQ（多级反馈队列）：多级队列+动态设置任务优先。级。评估任务的执行时间，判断长短任务，短任务最高优先级。每个队列的任务都有其最大运行时间，超时则任务降级（长任务容易降级）。给低优先级的任务更长的时间片，并定时将所有任务的优先级提高到最高，避免任务饥饿。
    * 优点：动态调整任务优先级，短任务优先执行，长任务不会饥饿。
    * 缺点：需要调参。比如任务提升优先级时间间隔过短，所有任务都留在最高优先级的队列中，退化成RR策略。提升优先级的时间间隔过长，低优先级的长任务无法得以执行。
#### 实时调度
  实时操作系统中考虑的依据不同，任务的完成时间有明确的上限，有确定性，可预测的任务时延。（此处不展开讲）
  * RM（速率单调）：速率越高意味着任务周期越短，截止时间越迫切，分配越高的优先级。支持抢占。有稳定的任务时延，不能满足对截止时间的要求。
  * EDF（最早截至时间优先）：将截止时间作为优先级衡量的依据。在CPU利用率<=1的前提下可以满足任务截止时间的要求。
#### 其他调度
  * BVT（借用虚拟时间）:任务通过降低有效虚拟时间来优先调度。
  …

#### Linux当前的调度算法有哪些？
  * O（N）（v<=2.4）
    * 基于RR策略。
    * 调度时会动态计算优先级并选用最高优先级任务调度。
    * 执行完的任务被移除，再次调度时放入队列尾。
    * 一个调度时间段，调度器会遍历队列并更新所有任务时间片，将它们剩余时间片的一半加入到下一个调度中。
    * 缺点：调度开销大。
    * 缺点：多核扩展性差。
  * O（1） （v==2.6.0）
    * 每个CPU一个激活队列和过期队列。每个激活队列和过期队列都是多级队列，通过位图可以以O（1）复杂度找到激活队列上第一个非空队列 上的第一个任务调度。
    * 调度开销小。
    * 保证交互式任务时延较小。
    * 缺点：使用静态时间片，调度时延依赖于任务数量。
    * 缺点：启发式算法判断任务类型过于复杂。
  * CFS（完全公平调度器）
    * 红黑树作为任务队列，虚拟时间作为索引，可以O（1）找到虚拟时间最小的任务，调度会选择虚拟时间最小的任务。
    * 调度周期内所有任务都会被执行一次，保证公平性。
    * 为任务分配动态时间片。每个调度周期内不同优先级的任务执行的物理时间有别，但增长的虚拟时间相同。
    * 阻塞唤醒的任务优先执行。
    * 用于调度非实时任务。
    * 调度策略： SCHED_OTHER， SCHED_BATCH，SCHED_IDLE。
  * RT（实时调度器）
    * 使用多级优先级队列，调度实时任务。
    * 调度策略： SCHED_FIFO， SCHED_RR。
  * DL（截止时间调度器）
    * 类似EDF调度策略。
    * 调度策略： SCHED_DEADLINE。

</div>

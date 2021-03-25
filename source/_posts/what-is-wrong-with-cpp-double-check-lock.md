---
title: what-is-wrong-with-cpp-double-check-lock
date: 2021-03-09 19:17:48
tags: OS
---

设计模式中有一个挺重要的模式叫单例模式，
```
在软件工程中，单件模式是设计模式，限制了实例化一个的类，以一个“单一”的实例。当仅需要一个对象来协调整个系统中的动作时，这很有用。 --wiki
```


也就是我们可以让一个对象只生成一次，比如我们希望程序全局只有一个线程池，或者服务器编程中让全局只有一个`TcpServer`,那么这时候单例模式就用上了。

## v0
之前没有双检查锁的时候是这么获取全局对象：
加锁之后通过检查全局对象是否存在
并返回一个动态分配的对象指针。
```cpp
Singleton* Singleton::getInstance () {
	lock_guard<mutex> lock(m_mutex);
	if (m_Instance == nullptr) {
		m_Instance = new Singleton;
	}
	return Singleton;
}
```
正确性：对
缺点：加锁 性能低

## v1
双检查锁最初，在判断了一次全局对象不存在之后加锁，再判断一次全局对象是否存在，如果不存在就生成一个新对象，想必大家都知道，#2的再次检查是因为#1和#2之间可能其他线程初始化了全局对象。
```cpp
Singleton* Singleton::m_Instance = nullptr;

Singleton* Singleton::getInstance () {
	if (m_Instance == nullptr) {//#1
		lock_guard<mutex> lock(m_mutex);
		if (m_Instance == nullptr) {//#2
			m_Instance = new Singleton;
		}
	}
	return Singleton;
}
```
但是这种看似巧妙的双检查锁在很久以前就被证明是一个错误的模式，在这种模式下：
```cpp
m_Instance = new Singleton
```
指针赋值构造对象是个危险的操作，
一般来说这么做没问题，毕竟是
```cpp
tmp = operator new(sizeof(Singleton)); //#3
new (pInstance) Singleton; //#4
m_Instance = tmp; //#5
```
先执行其构造函数，再给全局指针赋值，但是 编译器重排或者cpu优化都有可能让#4#5重排（我觉得当时人肯定是用出问题却找不到问题后用汇编发现了这个令人恼怒的优化，现在我们不一定测的出来：时代变了，机器变了）(x86强模型下不一定能看得到)，因为可能对象没有构造完毕就提前给指针赋值，导致其他线程可能访问到一个未构造完成的指针，从而可能出现未定义行为。


## v2
c++11之后我们可以用直接生成一个类的单例，代码极其简单，如下：
```cpp
Singleton& GetInstance() {
  static Singleton s;
  return s;
}
```

上图是维基百科上的样例之一，引用了c++草案的话（如果控制在变量初始化时同时进入声明，则并发执行应等待初始化完成。），可能会比较权威，
但我们不可以迷信权威，动手试一试gdb并查看它的汇编代码：我们可以看到`__cxa_guard_acquire`，`__cxa_guard_abort`的加锁和解锁操作，也就映证了上面这句话的正确性：在变量第一次初始化完成之前加锁，并发需等待。

```
  0x00005555555551b0 <+0>:     movzbl 0x2ea9(%rip),%eax        # 0x555555558060 <_ZGVZN9Singleton11getInstanceEvE1s>
   0x00005555555551b7 <+7>:     test   %al,%al
   0x00005555555551b9 <+9>:     je     0x5555555551c8 <_ZN9Singleton11getInstanceEv+24>
   0x00005555555551bb <+11>:    mov    0x2ea6(%rip),%rax        # 0x555555558068 <_ZZN9Singleton11getInstanceEvE1s>
   0x00005555555551c2 <+18>:    ret    
   0x00005555555551c3 <+19>:    nopl   0x0(%rax,%rax,1)
   0x00005555555551c8 <+24>:    push   %rbp
   0x00005555555551c9 <+25>:    lea    0x2e90(%rip),%rdi        # 0x555555558060 <_ZGVZN9Singleton11getInstanceEvE1s>
   0x00005555555551d0 <+32>:    call   0x555555555070 <__cxa_guard_acquire@plt>
   0x00005555555551d5 <+37>:    test   %eax,%eax
   0x00005555555551d7 <+39>:    jne    0x5555555551e8 <_ZN9Singleton11getInstanceEv+56>
   0x00005555555551d9 <+41>:    mov    0x2e88(%rip),%rax        # 0x555555558068 <_ZZN9Singleton11getInstanceEvE1s>
   0x00005555555551e0 <+48>:    pop    %rbp
   0x00005555555551e1 <+49>:    ret    
   0x00005555555551e2 <+50>:    nopw   0x0(%rax,%rax,1)
   0x00005555555551e8 <+56>:    mov    $0x1,%edi
   0x00005555555551ed <+61>:    call   0x555555555050 <_Znwm@plt>
   0x00005555555551f2 <+66>:    lea    0x2e67(%rip),%rdi        # 0x555555558060 <_ZGVZN9Singleton11getInstanceEvE1s>
   0x00005555555551f9 <+73>:    mov    %rax,0x2e68(%rip)        # 0x555555558068 <_ZZN9Singleton11getInstanceEvE1s>
--Type <RET> for more, q to quit, c to continue without paging--c
   0x0000555555555200 <+80>:    call   0x555555555040 <__cxa_guard_release@plt>
   0x0000555555555205 <+85>:    mov    0x2e5c(%rip),%rax        # 0x555555558068 <_ZZN9Singleton11getInstanceEvE1s>
   0x000055555555520c <+92>:    pop    %rbp
   0x000055555555520d <+93>:    ret    
   0x000055555555520e <+94>:    mov    %rax,%rbp
   0x0000555555555211 <+97>:    jmp    0x555555555080 <_ZN9Singleton11getInstanceEv.cold>
Address range 0x555555555080 to 0x555555555094:
   0x0000555555555080 <-304>:   lea    0x2fd9(%rip),%rdi        # 0x555555558060 <_ZGVZN9Singleton11getInstanceEvE1s>
   0x0000555555555087 <-297>:   call   0x555555555030 <__cxa_guard_abort@plt>
   0x000055555555508c <-292>:   mov    %rbp,%rdi
   0x000055555555508f <-289>:   call   0x555555555060 <_Unwind_Resume@plt>
```

但是它对于#v0的优点是什么呢？
#v0每次拿对对象都要加锁，而#v2只需要在static局部变量初始化的时候初始化一次就好...

参考：
[wiki: 单例模式](https://en.wikipedia.org/wiki/Singleton_pattern)
---
title: resource_limit
date: 2021-03-22 20:26:35
tags: os
---
在我们写程序的时候往往都没有注意到一些系统资源的临界值，
然而这些临界值在有的时候会把我们害的很惨，比如一个忘掉
关的文件描述符，比如`malloc`竟然会返回错误，又或者是爆栈，
我们该如何解决或者说预防这些问题呢？


以下实验仅在本机的系统环境下生效：
```zsh
uname -a
Linux ADLADL 5.11.6-arch1-1 #1 SMP PREEMPT Thu, 11 Mar 2021 13:48:23 +0000 x86_64 GNU/Linux
```

首先，我们得知道如何查看系统资源。

### 用户层面资源限制
`ulimit` 命令可以查看用户层面的系统资源限制。

这是在`/etc/security/limits.conf`的描述
```
该文件为通过PAM登录的用户设置资源限制。
它不会影响系统服务的资源限制。

还要注意/etc/security/limits.d目录中的配置文件，
以字母顺序阅读的内容，请覆盖此设置
域相同或更具体的情况下使用文件。
例如，这意味着在此处设置通配符域的限制
可以使用配置文件中的通配符设置覆盖
子目录，但此处的用户特定设置只能被覆盖
在子目录中具有特定于用户的设置。
```

我们可以通过 `ulimit -a` 查看我们所有的资源上限
```zsh
$ ulimit -a
-t: cpu time (seconds)              unlimited
-f: file size (blocks)              unlimited
-d: data seg size (kbytes)          unlimited
-s: stack size (kbytes)             8192
-c: core file size (blocks)         unlimited
-m: resident set size (kbytes)      unlimited
-u: processes                       30689
-n: file descriptors                1024
-l: locked-in-memory size (kbytes)  64
-v: address space (kbytes)          unlimited
-x: file locks                      unlimited
-i: pending signals                 30689
-q: bytes in POSIX msg queues       819200
-e: max nice                        0
-r: max rt priority                 0
-N 15:                              unlimited
```
只说其中我们比较关注的那些：

`-s` 栈大小:8MB

`-u` 进程上限:30000来

`-n` 文件描述符上限:1024

同时你可以用`ulimit -Ha`或`ulimit -Sa`查看硬限制和软限制，硬限制是指对资源节点和数据块的绝对限制，由 root 用户设置硬限制。虽然其他用户可以降低硬限制，但只有 root 用户可以增加硬限制。
至于软限制，网上资料也没有说什么，大概就是非root用户不能超过软限制，但是非root用户可以做的是将其软限制增加到其硬限制。

我们的服务器程序可能有打开超过1024个文件描述符，
有没有办法取修改这些资源的上限呢？
```zsh
cat /etc/security/limits.conf

#<domain>      <type>  <item>         <value>
#

#*               soft    core            0
#*               hard    rss             10000
#@student        hard    nproc           20
#@faculty        soft    nproc           20
#@faculty        hard    nproc           50
#ftp             hard    nproc           0
#@student        -       maxlogins       4
```

E.g. `ulimit -n 1024`可以修改系统对文件描述符的限制，不过是临时当前的shell生效的,如果你使用`which ulimit`你会发现`ulimit`是一个`shell built-in command`的脚本。

我们应该修改 `/etc/security/limits.conf` 去让我们的修改永久生效(需要重新启动,可能有直接加载配置的方法，暂时不知道)。

### 实验1. 修改文件描述符号上限

在`/etc/security/limits.conf`中添加以下片段：
```
adl soft nofile 10240
adl hard nofile 20480
```
重启后，然后查看一下资源是否真的被修改了
```zsh
$ ulimit -Hn
20480
$ ulimit -Sn
10240
```
说明修改成功。
那么现在我们测试下我们的程序能否打开这么多个文件描述符?
做个小测试，下面就是打开10240个临时文件：
```cpp
#include <bits/stdc++.h>
#include <errno.h>
#include <fcntl.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

using namespace std;

int main(int argc, char const *argv[]) {
  for (size_t i = 0; i < 10240; i++) {
    FILE *p = tmpfile();
    if (p == NULL) {
      perror("tempfile:");
      std::cout << i << std::endl;
      exit(1);
    }
  }
  return 0;
}

```
接着我们看一下结果：
```
tempfile:: Too many open files
10217
```
在修改之前是`ulimit`的默认值是1024,然后测试出的最大打开文件描述符的数量是`1001`,现在是修改为`10240`后可以打开`10217`个文件描述符，实验成功。然后我们能打开的总数为什么不是刚好`10240`呢? 这个问题是因为程序自身打开了一些文件或是加载了一些内容,`stdin/stdout/stderr`,以及 `/etc/ld.so.cache`，`/usr/lib/libm.so.6`，`/usr/lib/libstdc++.so.6`...

### 实验2. 修改栈空间上限
同样还是在`/etc/security/limits.conf`添加这样两句：
```
* soft stack 8192
* hard stack 16384
```
然后在c程序中中测试栈帧的上限
```cpp
int main(int argc, char const *argv[]) {
  char stack[8192 * 1000];
  return 0;
}
```
程序正常
```cpp
int main(int argc, char const *argv[]) {
  char stack[8192 * 1024];
  return 0;
}
```
程序段错误
```
[1]    8620 segmentation fault (core dumped)  "/home/adl/桌面/linux/resource_test_dir/"max_nofile
```
但这里也只能保守的说：调整以后的一个进程的栈空间大概在 `8192000B` 这附近。

### 系统层面资源限制
单个进程打开文件句柄数上限 最大文件描述符数 10亿
```
$ cat /proc/sys/fs/nr_open
1073741816
```

系统分配的pid上限是400多万
```
$ cat /proc/sys/kernel/pid_max
4194304
```

file-max是在内核级别强制执行的最大文件描述符（FD）
```
$ cat /proc/sys/fs/file-max
6578523
```

已分配的文件文件描述符数，已分配但未使用的文件描述符数以及最大文件描述符数(不可调)
```
cat /proc/sys/fs/file-nr
21536   0       9223372036854775807
```

系统全局的总线程数限制
```
$ cat /proc/sys/kernel/threads-max
61379
```

单个程序所能使用内存映射空间的数量限制
```
cat /proc/sys/vm/max_map_count
65530
```

可以创建的线程的总数和这些有关
```
sys.vm.max_map_count //内存映射空间的数量限制
sys.kernel.pid_max //系统分配的进程号上限
sys.kernel.threads-max //系统全局的总线程数限制
sys.fs.cgroup -name “pids.max” //cgroup中和进程上限的配置
ulimit.max memory size //最大内存限制
ulimit.max user processes //每个用户最大进程数
ulimit.virtual memory //虚拟内存限制
...
```

查看一个进程的资源限制
```
cat /proc/10511/limits 
Limit                     Soft Limit           Hard Limit           Units     
Max cpu time              unlimited            unlimited            seconds   
Max file size             unlimited            unlimited            bytes     
Max data size             unlimited            unlimited            bytes     
Max stack size            16777216             33554432             bytes     
Max core file size        unlimited            unlimited            bytes     
Max resident set          unlimited            unlimited            bytes     
Max processes             30689                30689                processes 
Max open files            10240                20460                files     
Max locked memory         65536                65536                bytes     
Max address space         unlimited            unlimited            bytes     
Max file locks            unlimited            unlimited            locks     
Max pending signals       30689                30689                signals   
Max msgqueue size         819200               819200               bytes     
Max nice priority         0                    0                    
Max realtime priority     0                    0                    
Max realtime timeout      unlimited            unlimited            us        

```

查看一个进程的状态
```
Name:   zsh
Umask:  0022
State:  S (sleeping)
Tgid:   548567
Ngid:   0
Pid:    548567
PPid:   1655
TracerPid:      0
Uid:    1000    1000    1000    1000
Gid:    1000    1000    1000    1000
FDSize: 128
Groups: 150 972 998 1000 
NStgid: 548567
NSpid:  548567
NSpgid: 548567
NSsid:  548567
VmPeak:    16616 kB
VmSize:    16360 kB
VmLck:         0 kB
VmPin:         0 kB
VmHWM:      9376 kB
VmRSS:      7144 kB
RssAnon:            4736 kB
RssFile:            2408 kB
RssShmem:              0 kB
VmData:     4644 kB
VmStk:       132 kB
VmExe:       592 kB
VmLib:      2808 kB
VmPTE:        76 kB
VmSwap:        0 kB
HugetlbPages:          0 kB
CoreDumping:    0
THP_enabled:    1
Threads:        1
SigQ:   0/30689
SigPnd: 0000000000000000
ShdPnd: 0000000000000000
SigBlk: 0000000000000000
SigIgn: 0000000000384004
SigCgt: 0000000008013003
CapInh: 0000000000000000
CapPrm: 0000000000000000
CapEff: 0000000000000000
CapBnd: 000001ffffffffff
CapAmb: 0000000000000000
NoNewPrivs:     0
Seccomp:        0
Seccomp_filters:        0
Speculation_Store_Bypass:       thread vulnerable
SpeculationIndirectBranch:      conditional enabled
Cpus_allowed:   ff
Cpus_allowed_list:      0-7
Mems_allowed:   00000001
Mems_allowed_list:      0
voluntary_ctxt_switches:        149
nonvoluntary_ctxt_switches:     5
```

另外一个类似ulimit的命令`prlimit`
```
prlimit
RESOURCE   DESCRIPTION                            SOFT     HARD UNITS
AS         address space limit                  无限制   无限制 字节
CORE       max core file size                   无限制   无限制 字节
CPU        CPU time                             无限制   无限制 秒数
DATA       max data size                        无限制   无限制 字节
FSIZE      max file size                        无限制   无限制 字节
LOCKS      max number of file locks held        无限制   无限制 锁
MEMLOCK    max locked-in-memory address space    65536    65536 字节
MSGQUEUE   max bytes in POSIX mqueues           819200   819200 字节
NICE       max nice prio allowed to raise            0        0 
NOFILE     max number of open files              10240    20460 文件
NPROC      max number of processes               30689    30689 进程
RSS        max resident set size                无限制   无限制 字节
RTPRIO     max real-time priority                    0        0 
RTTIME     timeout for real-time tasks          无限制   无限制 毫秒数
SIGPENDING max number of pending signals         30689    30689 信号
STACK      max stack size                     16777216 33554432 字节
```

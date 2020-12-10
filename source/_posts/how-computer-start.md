---
title: how-computer-start
date: 2021-02-01 20:56:25
tags: OS 操作系统
hidden: true
---

我们按开机键的时候，计算机是怎么启动的呢？

从硬件来说，我们按开机键的时候，处理器的一个引脚RESET的电平从低到高，处理器执行了硬件的初始化，寄存器初始化到预置的状态。

因为内存存储在DRAM中，在断电的情况下，内存中保存的内存都会消失，处理器加电是不能执行内存中的指令的。

X86在处理器加电复位的时候，寄存器CS=0XFFFF，IP=0X0000，所以第一条指令会取值物理地址0XFFFF0，位于ROM，里面是我们开机是需要的指令。

然而0XFFFF0~0XFFFFF只有16字节，可能装不下一条过长的指令，因此会执行跳转指令到另外一个地方执行我们真正想要执行的指令。

第一个扇区：主引导扇区。（0B～512B）
从硬盘启动的电脑，ROM-BIOS将读取硬盘主引导扇区的内容，并把它加载到一个特殊的逻辑地址0x0000:0x7c00，物理地址0x07c00上。

主引导扇区这512B中，最后两字节固定的0X55,0XAA作为标志。

主引导扇区代码将检测计算机的操作系统并计算它所在的硬盘位置，然后将操作系统的自举代码加载到内存，跳转到那继续执行，直到操作系统启动。


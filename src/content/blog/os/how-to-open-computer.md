---
title: 'how_to_open_computer'
titleZh: '如何打开电脑'
date: 2021-03-04 17:15:45
tags: OS
draft: true
---

<div class="lang-section" data-lang="en">

按下开机键
->
CS IP 置位，对为32位的x86而言，CS=0XF000,IP=0XFFF0
CPU 访问 0XFFFF0 也就是BIOS入口地址
->
进入BIOS
执行BIOS代码 JMP F000:E05B
执行 0xFE05B (还是在BIOS内)
设置中断向量表
校验启动盘 MBR
jmp 0:0x7c00 跳转到 MBR
->
MBR
从磁盘 读取 loader

</div>

<div class="lang-section" data-lang="zh">

按下开机键
->
CS IP 置位，对为32位的x86而言，CS=0XF000,IP=0XFFF0
CPU 访问 0XFFFF0 也就是BIOS入口地址
->
进入BIOS
执行BIOS代码 JMP F000:E05B
执行 0xFE05B (还是在BIOS内)
设置中断向量表
校验启动盘 MBR
jmp 0:0x7c00 跳转到 MBR
->
MBR
从磁盘 读取 loader

</div>
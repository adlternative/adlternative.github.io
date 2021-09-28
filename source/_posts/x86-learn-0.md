---
title: x86汇编 学习笔记
date: 2021-02-01 21:12:12
tags: os
hidden: true
---
### 实模式
将我们的汇编编译后的可执行程序写入到虚拟机的主引导扇区
```bash
 dd if=../../nasm_dir/c6.bin of=learn-asm.vhd bs=512 count=1 conv=notrunc
```

通用寄存器：ax,bx,cx,dx,si,di,bp,sp.
段寄存器：cs(代码段),ds(数据段),es(附加段),ss(栈段寄存器)
指令指针寄存器：ip

cs(2B)+ip(2B) -> 逻辑地址xxxx:xxxx ->物理地址 xxxxx 20位

初始化： dd 1B dw 2B

段大小：64KB 2^16B xxxx就是一段

x86 可访问1MB内存，地址范围是0x00000~0xFFFFF,20根地址线

```txt
00000~9FFFF DRAM{
07c00:07e00主引导扇区(512字节)
}
A0000~EFFFF 外设{
B8000~BFFFF 显卡

}
F0000~FFFFF BIOS ROM
```
第一个扇区：主引导扇区。（0B～512B）
从硬盘启动的电脑，ROM-BIOS将读取硬盘主引导扇区的内容，并把它加载到一个特殊的逻辑地址0x0000:0x7c00，物理地址0x07c00上。

主引导扇区这512B中，最后两字节固定的0X55,0XAA作为标志。


为了让段寄存器指向显存地址，
```as
  mov ax,0xb800                 ;指向文本模式的显示缓冲区
  mov es,ax
```
`不允许将立即数传送到段寄存器`，通过通用寄存器和内存单元（立即数）进行传送，接着再让通用寄存器和段寄存器进行传送。


除法 `div`：
* 2B/1B AX/(2B 通用寄存器 或 内存单元) = AL...AH
* 4B/2B (DX AX)/(2B 通用寄存器 或 内存单元)=AX...DX


跳转 `jmp`:
jmp为无条件转移，可以只修改IP，也可以同时修改CS和IP
相对近寻址 `jmp near`


movsb movsw 

DS:SI -> ES:DI 

传递的字节数或字数由CX指定 
正向传递内存低地址到高地址，反向传递内存高地址到低地址。

传一次
正向：SI，DI +1/+2
反向：SI，DI -1/-2
CX -1

标志器存其FLAG ZF位：计算结果0 ZF->1,否则ZF->0,

DF 方向标志 控制movsb movsw 方向
cld DF 清0 正方向 l->h
std DF 置位 h->l

单独movsb movsw 只能执行一次，
加上rep则CX不为0则重复。

loop CX-- ->0

```asm
mov [bx],dl
```

cbw byte ->word AL ->AX
cwd word ->double word AX->DX:AX

idiv 有符号除法

标志符号位 SF 1 有符号运算 0 无符号数运算

or指令不允许目的操作数和源操作数都是内存单元的情况。

in 从端口读 目的操作数 必须 寄存器 AL|AX，源操作数 DX|立即数。

out 写端口 源操作数 必须 寄存器 AL AX，目的操作数 DX|8位立即数

call
1）将当前的IP或CS和IP压入栈中
2）转移jmp

ret
弹栈到ip中
retf
弹栈到ip,cs中

shr 逻辑右移 dest:r8/r16/m8/m16 src:1, 8位立即数 CL  最右边放到cf


leave 在16位汇编下相当于:
mov sp,bp
pop bp
 
在32位汇编下相当于:
mov esp,ebp;//将ebp指向（ebp内部应当保存一个地址，所谓指向即这个地址对应的空间）的值赋给esp
pop ebp 

/* leave指令将EBP寄存器的内容复制到ESP寄存器中，
以释放分配给该过程的所有堆栈空间。然后，它从堆栈恢复EBP寄存器的旧值。*/
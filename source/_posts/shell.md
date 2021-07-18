---
title: shell笔记
date: 2020-12-23 16:41:27
tags: shell
---
[Linux shell 中$() ` `，${}，$[] $(())，[ ] (( )) [[ ]]作用与区别](https://blog.csdn.net/x1269778817/article/details/46535729)
[shell脚本中的if 参数-a至-z](https://blog.csdn.net/shenhuxi_yu/article/details/53047012)
`$?`:

`[]`等于`test`

`test -z "$VAR"`,`if [-z "$VAR"]`:如果VAR空,那么字符串`"$VAR"`长度为0,原式为真

`test -n`:和`test -z`相反,字符串长度不为0,原式为真

`$()`:里面可放命令

`${}`:变量替换

`$[] ` or `$(()) ` :数学运算

`[[]]`:条件表达式

`2>&1`将标准错误输出重定向到标准输出


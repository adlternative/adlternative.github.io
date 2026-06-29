---
title: 'web_server_learn_0'
titleZh: 'Web 服务器学习笔记（零）'
date: 2021-02-28 11:55:32
tags: web-server
draft: true
---

<div class="lang-section" data-lang="en">

It's been a long time since I studied the muduo network server. I've taken a lot of notes but never summarized them.
Feeling quite ashamed, I'll use these blog posts to record my recent experiences and insights from learning about web servers.


* Reactive, callbacks, async

* Thundering herd problem

* Wire Shark packet capture process

* How to solve "open too many files"?
Honestly, there are quite a few ways to solve this, and of course it depends on the specific situation. The muduo book also mentions several approaches. I'll just share my thoughts here.
1. Increase the file descriptor limit
2. RAII
3. Check the process ID and file descriptor related information in your program:
 `ll /proc/(process_id)/fd/`, then you'll see a lot of file descriptors, all pointing to a file or some device, so you can figure out which resources you forgot to release, and debug your code accordingly.

</div>

<div class="lang-section" data-lang="zh">

网络服务器muduo学习已经过了很久时间，做了很多笔记，却没有做过总结，
深感惭愧，便用这几篇博客记录一下最近学习web的经验和心得。


* 响应式，回调，异步

* 惊群问题

* Wire Shark 抓包过程

* open too many file 如何解决?
这个问题其实说实话方法挺多，当然也要具体问题具体分析。muduo上也说了几种方案。我这里也就说说我的想法。
1. 增大文件描述符数量上限
2. RAII
3. 查看你的程序中进程号和文件描述符相关的信息：
 `ll /proc/(process_id)/fd/`，然后你看到非常多的文件描述符，他们都指向一个文件或者一些设备，这样你就可以知道是哪些资源你忘记了释放，在代码中就可以有针对性的debug了。

</div>


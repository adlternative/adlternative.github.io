---
title: git_wrapper_x_api_learn
date: 2021-01-25 23:21:37
tags: git
---


git源码wrapper.c对很多常用的函数做了一层包装，
我这里仅仅是为自己做做笔记。

xstrbup:strbup+die

xmalloc:调用do_xmalloc,先用memory_limit_check检查需要分配的内存大小是否超出环境变量GIT_ALLOC_LIMIT，超过则die,接着再malloc,malloc失败再malloc1个字节，如果分配失败再die

xmallocz/xmallocz_gently分别以优雅方式mallloc(失败return)/非优雅方式malloc(失败die)

xmemdupz 调用memcpy(xmallocz(len)) 很妙的api

xstrndup 调用xmemdupz,复制到'\0'或者指定长度

xstrncmpz strncmp 并保证第一个参数字符串是以'\0'结尾

xrealloc 还是一些溢出的处理 并且在需要realloc到0的情况下先free再xmalloc(0),之前没思考过malloc(0)的效果,`根据规范，malloc (0)将返回“一个空指针或一个可以成功传递给 free ()的唯一指针”。`(引用自stackoverflow)

xcalloc 同理还是一些溢出的处理和xmalloc类似

xopen 如果open失败并且是中断产生EINTR那就继续open,否则die with mode and path.


```c
ssize_t xread(int fd, void *buf, size_t len)
{
	ssize_t nr;
	if (len > MAX_IO_SIZE)
		len = MAX_IO_SIZE;
	while (1) {
		nr = read(fd, buf, len);
		if (nr < 0) {
			if (errno == EINTR)
				continue;
			if (handle_nonblock(fd, POLLIN, errno))
				continue;
		}
		return nr;
	}
}
```
xread 首先读取的大小限制在MAX_IO_SIZE以下，接着如果read返回-1,并且是中断EINTR，那么就continue read.我们看到这个
handle_nonblock是这样的:
```c
static int handle_nonblock(int fd, short poll_events, int err)
{
	struct pollfd pfd;

	if (err != EAGAIN && err != EWOULDBLOCK)
		return 0;

	pfd.fd = fd;
	pfd.events = poll_events;

	/*
	 * no need to check for errors, here;
	 * ra subsequent read/write will detect unrecoverable erors
	 */
	poll(&pfd, 1, -1);
	return 1;
}
```
这意味着如果`err==EAGAIN`||`err==EWOULDBLOCK`，我们就使用poll去等待fd上的读事件发生，发生了再重新read。
是为非阻塞IO使用。

所以xread就是read+自重启。

xwrite: 同理也是一样的操作，不过重启等待的是可写时间（写缓冲不满）

xpread: pread+EAGAIN和EINTR的重启处理

xdup: dup+die_errno

xfopen: fopen+EINTR重启+die_errno

xfdopen: fdopen +die_errno

xmkstemp: mkstemp +die_errno

xmkstemp_mode: 同理xmkstemp

xgetcwd: strbuf_getcwd+strbuf_detach

xgethostname: gethostname + 末尾置'\0'

xsnprintf: snprintf + BUG错误处理

总结:包装包的好，外界调用不用过多代码去处理错误。
---
title: git_strbuf_api_learn
date: 2021-01-25 19:16:01
tags: git
---

今天来跟大家分析一下
git源码中字符串缓存区 strbuf api
其中几个函数。
strbuf这个缓存区既可以读一行内容，读文件。
还有很多神奇的操作。

```c
struct strbuf {
	size_t alloc;
	size_t len;
	char *buf;
};
```

|alloc|缓冲区容积(动态分配的大小)|
|-|-|
|len|缓冲区长度|
|buf|缓冲区内容|

### strbuf_init,STRBUF_INIT
```c
char strbuf_slopbuf[1];

#define STRBUF_INIT  { .alloc = 0, .len = 0, .buf = strbuf_slopbuf }

void strbuf_init(struct strbuf *sb, size_t hint)
{
	sb->alloc = sb->len = 0;
	sb->buf = strbuf_slopbuf;
	if (hint)
		strbuf_grow(sb, hint);
}
```
我们可以注意到初始化函数中将buf设置为一个全局的1字节的缓冲区`strbuf_slopbuf`，为什么需要采取这样一种奇怪的方式呢?
因为原作者不希望出现`.buf==NULL`,即使是一个空的strbuf。
然后 `sb->alloc`,`sb->len`大小均为0;
当然在`strbuf_init`中在`hint!=0`的情况下会去调用`strbuf_grow`能在初始化的时候就预先分配好缓冲区的大小，可以后面反复的realloc，这和c++中的vector的reserve功能类似。当然`hint==0`的时候效果和STRBUF_INIT一样。
### strbuf_release
```cpp
void strbuf_release(struct strbuf *sb)
{
	if (sb->alloc) {
		free(sb->buf);
		strbuf_init(sb, 0);
	}
}
```
如果这个buf有分配内存，那么我们就将buf释放，并重新初始化strbuf。
### strbuf_grow
```cpp
void strbuf_grow(struct strbuf *sb, size_t extra)
{
	int new_buf = !sb->alloc;
	if (unsigned_add_overflows(extra, 1) ||
	    unsigned_add_overflows(sb->len, extra + 1))
		die("you want to use way too much memory");
	if (new_buf)
		sb->buf = NULL;
	ALLOC_GROW(sb->buf, sb->len + extra + 1, sb->alloc);
	if (new_buf)
		sb->buf[0] = '\0';
}
```
之前在str_init看到的strbuf_grow,它是怎么给缓冲区分配内存的呢?
首先是检测需要分配的大小`extra`是否会导致溢出，如果会溢出那么就`die`结束程序。`new_buf`表示指明是不是一个新的str_buf,如果是的话，这时候的.buf必然是strbuf_slopbuf，那么我们必须将它先置为NULL,再Realloc,否则一个静态全局的1字节数组是不能realloc的。接着我们继续看看`ALLOC_GROW`:这个宏函数中选择了max(`alloc_nr(alloc)`,nr)作为新的strbuf容积去realloc。
因此,`ALLOC_GROW`的作用是将当前我们需要的容积和现有容积大小以一定比例进行比较，分配较大的大小。在官方的代码注释中也有说明常用的ALLOC_GROW用法是`ALLOC_GROW(item,nr+1,alloc)`。之后就可以向扩容的数组中添加内容。
因此strbuf_grow就可以做到有效的扩容。

```c
#define ALLOC_GROW(x, nr, alloc) \
	do { \
		if ((nr) > alloc) { \
			if (alloc_nr(alloc) < (nr)) \
				alloc = (nr); \
			else \
				alloc = alloc_nr(alloc); \
			REALLOC_ARRAY(x, alloc); \
		} \
	} while (0)
```
### strbuf_attach
```c
void strbuf_attach(struct strbuf *sb, void *buf, size_t len, size_t alloc)
{
	strbuf_release(sb);
	sb->buf   = buf;
	sb->len   = len;
	sb->alloc = alloc;
	strbuf_grow(sb, 0);
	sb->buf[sb->len] = '\0';
}
```
这个strbuf_attach就是将一个strbuf中内容用buf,len,alloc取代。

### strbuf_detach
```c
char *strbuf_detach(struct strbuf *sb, size_t *sz)
{
	char *res;
	strbuf_grow(sb, 0);
	res = sb->buf;
	if (sz)
		*sz = sb->len;
	strbuf_init(sb, 0);
	return res;
}
```
官方说明中是用detach去分离出动态分配的内容，
但是为什么这里需要执行一次strbuf_grow呢?
这是因为如果是一个初始化的strbuf它的buf是slot_buf，它动态内存,我们用`strbuf_grow(sb,0)`将strbuf变成动态分配的内存。
接着我们就可以正常的将`sb->buf`返回并初始化strbuf。当然如果strbuf已经是动态分配的内存了当然也一样...

### strbuf_split_buf
```c
struct strbuf **strbuf_split_buf(const char *str, size_t slen,
				 int terminator, int max)
{
	struct strbuf **ret = NULL;
	size_t nr = 0, alloc = 0;
	struct strbuf *t;

	while (slen) {
		int len = slen;
		if (max <= 0 || nr + 1 < max) {
			const char *end = memchr(str, terminator, slen);
			if (end)
				len = end - str + 1;
		}
		t = xmalloc(sizeof(struct strbuf));
		strbuf_init(t, len);
		strbuf_add(t, str, len);
		ALLOC_GROW(ret, nr + 2, alloc);
		ret[nr++] = t;
		str += len;
		slen -= len;
	}
	ALLOC_GROW(ret, nr + 1, alloc); /* In case string was empty */
	ret[nr] = NULL;
	return ret;
}
```
strbuf_split_buf的意图是将字符数组`str`以`terminator`为分割符分割出多个字串通过`strbuf_init`和`strbuf_add`存入一个strbuf数组中，数组通过之前介绍的`ALLOC_GROW`进行扩容。

### strbuf_setlen
```c
static inline void strbuf_setlen(struct strbuf *sb, size_t len)
{
	if (len > (sb->alloc ? sb->alloc - 1 : 0))
		die("BUG: strbuf_setlen() beyond buffer");
	sb->len = len;
	if (sb->buf != strbuf_slopbuf)
		sb->buf[len] = '\0';
	else
		assert(!strbuf_slopbuf[0]);
}
```
这个strbuf_setlen可以设置strbuf中.len的大小。可以缩短缓冲区长度（通过"末尾置\0"）或者可以在我们扩容并向缓冲区添加内容以后调用strbuf_setlen表示str_buf的len已经增加。

### strbuf_reset
```c
#define strbuf_reset(sb)  strbuf_setlen(sb, 0)
```
通过`strbuf_setlen`将.len的设置为0,这样可以说这个缓冲区是被清空的。

### strbuf_add
```c
void strbuf_add(struct strbuf *sb, const void *data, size_t len)
{
	strbuf_grow(sb, len);
	memcpy(sb->buf + sb->len, data, len);
	strbuf_setlen(sb, sb->len + len);
}
```
这里首先通过strbuf_grow将缓冲区扩容,接着将数据data添加到缓冲区，再使用setlen设置缓冲区的长度。

### strbuf_splice
```c
void strbuf_splice(struct strbuf *sb, size_t pos, size_t len,
				   const void *data, size_t dlen)
{
	if (unsigned_add_overflows(pos, len))
		die("you want to use way too much memory");
	if (pos > sb->len)
		die("`pos' is too far after the end of the buffer");
	if (pos + len > sb->len)
		die("`pos + len' is too far after the end of the buffer");

	if (dlen >= len)
		strbuf_grow(sb, dlen - len);
	memmove(sb->buf + pos + dlen,
			sb->buf + pos + len,
			sb->len - pos - len);
	memcpy(sb->buf + pos, data, dlen);
	strbuf_setlen(sb, sb->len + dlen - len);
}
```
strbuf_splice就是将原有的sb的缓冲区中pos坐标开始的len大小内容用len大小的data替代，可以看到在新缓冲区变大的情况下使用strbuf_grow扩容，memmove,memcpy去改变内容，strbuf_setlen去重新设置strbuf.len。

### strbuf_insert
```c
void strbuf_insert(struct strbuf *sb, size_t pos, const void *data, size_t len)
{
	strbuf_splice(sb, pos, 0, data, len);
}
```
strbuf_insert不过是strbuf_splice的一个子集，作用不再是替代内容，因为不能替代大小为0的内容了,而是从pos插入。
### strbuf_read
```c
ssize_t strbuf_read(struct strbuf *sb, int fd, size_t hint)
{
	size_t oldlen = sb->len;
	size_t oldalloc = sb->alloc;

	strbuf_grow(sb, hint ? hint : 8192);
	for (;;) {
		ssize_t want = sb->alloc - sb->len - 1;
		ssize_t got = read_in_full(fd, sb->buf + sb->len, want);

		if (got < 0) {
			if (oldalloc == 0)
				strbuf_release(sb);
			else
				strbuf_setlen(sb, oldlen);
			return -1;
		}
		sb->len += got;
		if (got < want)
			break;
		strbuf_grow(sb, 8192);
	}

	sb->buf[sb->len] = '\0';
	return sb->len - oldlen;
}
```
首先我们通过这个api去读取一个文件描述符，同样这里这个`strbuf_grow`是预先去指定好需要分配的大小，防止
多次的realloc。
在一个for循环内，每次read指定的大小
是strbuf中可用的大小`want`，读到的大小为`got`(注意这里缓冲区是从buf+len开始),读完一轮之后再`strbuf_grow`去扩容，如果`got < want`也就是读完为止。
出错处理是将strbuf通过`strbuf_release`或者`strbuf_setlen`"还原"回之前的样子。

### strbuf_write
```c
ssize_t strbuf_write(struct strbuf *sb, FILE *f)
{
	return sb->len ? fwrite(sb->buf, 1, sb->len, f) : 0;
}
```
将缓存区中内容写到文件中。
### strbuf_getwholeline
```c
int strbuf_getwholeline(struct strbuf *sb, FILE *fp, int term)
{
	int ch;

	if (feof(fp))
		return EOF;

	strbuf_reset(sb);
	flockfile(fp);
	while ((ch = getc_unlocked(fp)) != EOF) {
		if (!strbuf_avail(sb))
			strbuf_grow(sb, 1);
		sb->buf[sb->len++] = ch;
		if (ch == term)
			break;
	}
	funlockfile(fp);
	if (ch == EOF && sb->len == 0)
		return EOF;

	sb->buf[sb->len] = '\0';
	return 0;
}
```
从一个文件指针fp中读取内容，首先`strbuf_reset`将strbuf清空,接着加锁后一个字节一个字节读取内容添加到strbuf中，读到`term`也就是停止的字符为止。

写不动了写不动了，api好多...

总结:git封装了一层缓冲区类，用户可以非常方便的调用这个类直接去读取一些内容，而不是自己用一些函数，可能出现误用或者性能低下。

google翻译的
strbuf.h中的说明内容
```
strbuf用于所有常用的C字符串和内存api。鉴于缓冲区的长度是已知的，通常最好
使用mem *函数比使用str *一（例如，memchr vs. strchr）。
但是，必须注意str *经常起作的事实
停止使用NUL，而strbuf可能已入NUL。

为了方便起见，strbuf已被NUL终止，但在
strbuf API实际上依赖于不含NUL的字符串。

strbuf的一些不变量非常重要，请牢记：

 -`buf`成员永远不会为NULL，因此可以在任何普通C语言中使用
   安全地进行字符串操作。 strbuf的_have_可以通过以下方式初始化
   但是，在不变式之前使用“ strbuf_init（）”或“ = STRBUF_INIT”。

   *不要*假设`buf`实际上是什么（例如如果是）
   是否分配内存），请使用“ strbuf_detach（）”解开内存
   安全地从其strbuf外壳中缓冲。那是唯一受支持的
   道路。这将为您提供一个已分配的缓冲区，您以后可以`free（）`。

   但是，修改由指向的字符串中的任何内容是完全安全的
   “ buf”成员，位于索引“ 0”和“ len-1”（包含）之间。

 -“ buf”成员是一个字节数组，至少具有“ len + 1”个字节
   已分配。多余的字节用于存储“ \ 0”，从而允许
   “ buf”成员必须是有效的C字符串。每个strbuf函数都可以确保这一点
   不变的被保留。

   注意：可以直接在缓冲区上这样玩：

       strbuf_grow（sb，SOME_SIZE）; <1>
       strbuf_setlen（sb，sb-> len + SOME_OTHER_SIZE）;

   <1>在这里，存储阵列从`sb-> buf'开始，长度为
   `strbuf_avail（sb）`都是您的，您可以确定
   strbuf_avail（sb）至少为SOME_SIZE。

   注意：“ SOME_OTHER_SIZE”必须小于或等于“ strbuf_avail（sb）”。

   这样做是安全的，尽管如果必须在许多地方进行，请添加
   缺少strbuf模块的API是可行的方法。

   警告：请勿假设您的区域大小为`alloc'
   -1`，即使在当前实现中为true。 alloc是
   不应使用的“私有”成员。使用`strbuf_avail（）`
   代替。
```

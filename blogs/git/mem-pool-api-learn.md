---
title: git-mem-pool-api-learn
date: 2021-01-30 15:02:10
tags: git
---
内存池往往是我们节省开销的好帮手，内存池一次分配大量空间，用户从内存池中取出，用完了放回内存池;而不是每次需要动态分配的时候调用一次`malloc`,这样会非常消耗性能。


一般来说内存池的结构都非常复杂,但git的内存池并不吓人，它可能现在的接口都还是比较简单的。

### 数据结构

```c
struct mp_block {
	struct mp_block *next_block;
	char *next_free;
	char *end;
	uintmax_t space[FLEX_ARRAY]; /* more */
};

struct mem_pool {
	struct mp_block *mp_block;

	/*
	 * The amount of available memory to grow the pool by.
	 * This size does not include the overhead for the mp_block.
	 */
	size_t block_alloc;

	/* The total amount of memory allocated by the pool. */
	size_t pool_alloc;
};

```
`mem_pool`:内存池
  * `mp_block`:首块内存块
  * `block_alloc`:分配内存块时，内存池扩容时一个的“标准”。
  * `pool_alloc`:总共分配的内存块数量。

`mp_block`:内存块
  * `next_block`:下一块内存块的地址。
  * `next_free`:本块内存块下个需要free的内存地址。
  * `end`:本块内存块下个需要free的内存末尾。
  * `space`:可动态扩容的数组，这里也就是申请的内存空间。


### api

`mem_pool_init`
```c
#define BLOCK_GROWTH_SIZE 1024*1024 - sizeof(struct mp_block);

void mem_pool_init(struct mem_pool *pool, size_t initial_size)
{
	memset(pool, 0, sizeof(*pool));
	pool->block_alloc = BLOCK_GROWTH_SIZE;

	if (initial_size > 0)
		mem_pool_alloc_block(pool, initial_size, NULL);
}
```
`BLOCK_GROWTH_SIZE`的设计挺奇怪的，是`1024*1024`减去一个内存块结构体的大小。由于我们分配内存块的时候分配的大小是内存块大小加上可用内存空间的大小，所以`BLOCK_GROWTH_SIZE`就是我们分配的内存空间时内存池扩容的一个标准值（见后文）

接着看`mem_pool_alloc_block`
```c
static struct mp_block *mem_pool_alloc_block(struct mem_pool *pool,
					     size_t block_alloc,
					     struct mp_block *insert_after)
{
	struct mp_block *p;

	pool->pool_alloc += sizeof(struct mp_block) + block_alloc;
	p = xmalloc(st_add(sizeof(struct mp_block), block_alloc));

	p->next_free = (char *)p->space;
	p->end = p->next_free + block_alloc;

	if (insert_after) {
		p->next_block = insert_after->next_block;
		insert_after->next_block = p;
	} else {
		p->next_block = pool->mp_block;
		pool->mp_block = p;
	}

	return p;
}
```
首先给内存池的`pool_alloc`增加了`sizeof(struct mp_block) + block_alloc`大小也就是一个结构体`mp_block`的大小加上我们指定分配的大小。接着`malloc`了一块该大小的内存块结构体，`next_free首先指向了`我们的`space`成员的首地址，这就是我们可以用的内存的首地址。

接着由于是新建的内存池，`insert_after==NULL`，所以将这块新的内存块插入内存池的“链表”头部，它的`next_block`此时为`NULL`。
现在我们的内存池就一个内存块，


`mem_pool_alloc`
```c
void *mem_pool_alloc(struct mem_pool *pool, size_t len)
{
	struct mp_block *p = NULL;
	void *r;

	/* round up to a 'uintmax_t' alignment */
	if (len & (sizeof(uintmax_t) - 1))
		len += sizeof(uintmax_t) - (len & (sizeof(uintmax_t) - 1));

	if (pool->mp_block &&
	    pool->mp_block->end - pool->mp_block->next_free >= len)
		p = pool->mp_block;

	if (!p) {
		if (len >= (pool->block_alloc / 2))
			return mem_pool_alloc_block(pool, len, pool->mp_block);

		p = mem_pool_alloc_block(pool, pool->block_alloc, NULL);
	}

	r = p->next_free;
	p->next_free += len;
	return r;
}
```
这里时用户从内存池取出内存的接口，首先将需要分配的大小`len`去对齐`uintmax_t`的整数倍，接着看内存首个内存块中剩余的内存空间是否足够，足够则取当前内存块，否则判断当前我们需要分配的内存空间是否大于内存池扩容标准`pool->block_alloc`的一半，如果大于等于标准值的一半，则调用`mem_pool_alloc_block`分配一块`len`内存空间的新内存块，并将新内存块插入到内存池首个内存块的后面，接着返回新内存块。如果小于标准值的一半，那么分配标准值大小的内存块插入内存池内存块链表首部，接着将内存块的`next_free`加上为我们需要的内存大小`len`，并返回内存空间地址，用户可以返回的空间，len大小内自由的使用。如果用户内存越界，可能会写到错误的内存空间上。

`mem_pool_calloc`,`mem_pool_strdup`,`mem_pool_strndup`
```c
void *mem_pool_calloc(struct mem_pool *pool, size_t count, size_t size)
{
	size_t len = st_mult(count, size);
	void *r = mem_pool_alloc(pool, len);
	memset(r, 0, len);
	return r;
}
char *mem_pool_strdup(struct mem_pool *pool, const char *str)
{
	size_t len = strlen(str) + 1;
	char *ret = mem_pool_alloc(pool, len);

	return memcpy(ret, str, len);
}

char *mem_pool_strndup(struct mem_pool *pool, const char *str, size_t len)
{
	char *p = memchr(str, '\0', len);
	size_t actual_len = (p ? p - str : len);
	char *ret = mem_pool_alloc(pool, actual_len+1);

	ret[actual_len] = '\0';
	return memcpy(ret, str, actual_len);
}
```
这三个接口非常简单就是对`mem_pool_alloc`做了一层封装，
`mem_pool_calloc`从内存池中获取内存并清0,
`mem_pool_strdup`从内存池中获取字符串大小的内存，将字符串内存复制到其中，是的，就是`strdup`的内存池版本。
`mem_pool_strndup`同理`mem_pool_strdup`，指定了复制的长度。`strndup`内存池版本。

`mem_pool_contains`
```c
int mem_pool_contains(struct mem_pool *pool, void *mem)
{
	struct mp_block *p;

	/* Check if memory is allocated in a block */
	for (p = pool->mp_block; p; p = p->next_block)
		if ((mem >= ((void *)p->space)) &&
		    (mem < ((void *)p->end)))
			return 1;

	return 0;
}
```
遍历内存池的内存链表，寻找某个包含我们指定的内存的内存块。正如注释所示：`Check if memory is allocated in a block `

`mem_pool_combine`
```c
void mem_pool_combine(struct mem_pool *dst, struct mem_pool *src)
{
	struct mp_block *p;

	/* Append the blocks from src to dst */
	if (dst->mp_block && src->mp_block) {
		/*
		 * src and dst have blocks, append
		 * blocks from src to dst.
		 */
		p = dst->mp_block;
		while (p->next_block)
			p = p->next_block;

		p->next_block = src->mp_block;
	} else if (src->mp_block) {
		/*
		 * src has blocks, dst is empty.
		 */
		dst->mp_block = src->mp_block;
	} else {
		/* src is empty, nothing to do. */
	}

	dst->pool_alloc += src->pool_alloc;
	src->pool_alloc = 0;
	src->mp_block = NULL;
}

```
这里`mem_pool_combine`将两个内存池合并，将`src`的内存块链表接到`dst`链表的最后。

`mem_pool_discard`
```c
void mem_pool_discard(struct mem_pool *pool, int invalidate_memory)
{
	struct mp_block *block, *block_to_free;

	block = pool->mp_block;
	while (block)
	{
		block_to_free = block;
		block = block->next_block;

		if (invalidate_memory)
			memset(block_to_free->space, 0xDD, ((char *)block_to_free->end) - ((char *)block_to_free->space));

		free(block_to_free);
	}

	pool->mp_block = NULL;
	pool->pool_alloc = 0;
}

```
`mem_pool_discard`将遍历内存池整个内存块链表，会依据`invalidate_memory`来先将内存空间的每个字节用`0xDD`使之无效，接着再释放内存。
并清空内存池。

到此，git的内存池已经结束了，你可能会很想问，用户将内存用完何时交还给内存池？事实上，它这种设计下内存池会在某个时候销毁的时候，会去将所有的内存释放，可能这样会更加"集中",因此这个内存池我们也看不到所谓内存块合并，可能它这个内存池仅仅时为了使用便捷并减少多次分配内存性能。

甚至我还有一个疑问：不用的内存块链表中肯定有大量的碎片，如何去利用这些空间？



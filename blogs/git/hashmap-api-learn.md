---
title: git-hashmap-api-learn
date: 2021-01-28 21:06:26
tags: git
---

hashmap是一种存储Key 和Value的集合，每个键值对称为Entry。每个Entry被分散存储在一个个“桶”中。

|      | 查找 | 插入 | 删除 |
| ---- | ---- | ---- | ---- |
| 平均 | O(1) | O(1) | O(1) |
| 最坏 | O(N) | O(N) | O(N) |

而hash有很多中不同的算法，其中开放寻址法和链式存储法是最常见的。

git中采取的是链式存储的方式。

而hash存储的好坏很大一部分程度上取决于hash算法，git中采取就是著名的SHA1算法，当然现在可能这种算法也是不安全的，不过git中也为SHA256准备了备用方案。

今天将介绍Git中hashtable的实现api。

### hash算法

strhash,strihash,memhash,memihash,
memihash_cont这几种api基本都一致。如下图的strhash，通过字符串中每一个字符和 当前hash值和FNV32_PRIME 的乘积做异或运算，返回最终hash值。strihash也不过是在strhash中小写字符转大写去做运算，memhash对缓冲区中每个字符做同样运算，memihash同理strihash。
```c
unsigned int strhash(const char *str)
{
	unsigned int c, hash = FNV32_BASE;
	while ((c = (unsigned char) *str++))
		hash = (hash * FNV32_PRIME) ^ c;
	return hash;
}
```
memihash_cont有一点小不同，在memihash的基础上 hash的初始值不再是FNV32_BASE而是外界提供的hash_seed。
```c
/*
 *将另一块数据合并到memihash中
 *计算。
 */
unsigned int memihash_cont(unsigned int hash_seed, const void *buf, size_t len)
{
	unsigned int hash = hash_seed;
	unsigned char *ucbuf = (unsigned char *) buf;
	while (len--) {
		unsigned int c = *ucbuf++;
		if (c >= 'a' && c <= 'z')
			c -= 'a' - 'A';
		hash = (hash * FNV32_PRIME) ^ c;
	}
	return hash;
}
```

### 数据结构

`hashmap_entry`
```c
struct hashmap_entry {
	struct hashmap_entry *next;
	unsigned int hash;
};
```
`hash`: 存放一个hash值。
`next`: 一个桶中下一个Entry的指针。

`hashmap`
```c
struct hashmap {
	struct hashmap_entry **table;
	hashmap_cmp_fn cmpfn;
	const void *cmpfn_data;
	unsigned int private_size;
	unsigned int tablesize;
	unsigned int grow_at;
	unsigned int shrink_at;
	unsigned int do_count_items : 1;
};
```
`table`: hashmap中有一个hashmap_entry的二级指针table,这代表之后我们使用动态分配table的内存之后数组中每个都是一个
hashmap_entry的指针，这些指针通过`next`指针串联。

`hashmap_cmp_fn`: 用户提供的函数，用于测试两个hashmap条目是否相等。

`private_size`: 项的总数。

`tablesize`: 桶的数量。

`grow_at`: hashtable在有多少项的时候执行扩容操作。

`shrink_at`: hashtable在桶有多少项的时候执行缩小操作。

`do_count_items`: 这一个bit可以指定是否需要跟踪Entry总数（通过private_size）。

`hashmap_iter`
```c
struct hashmap_iter {
	struct hashmap *map;
	struct hashmap_entry *next;
	unsigned int tablepos;
};
```
### api:

`hashmap_init`and `HASHMAP_INIT`:
```c
void hashmap_init(struct hashmap *map, hashmap_cmp_fn equals_function,
		  const void *cmpfn_data, size_t initial_size)
{
	unsigned int size = HASHMAP_INITIAL_SIZE;

	memset(map, 0, sizeof(*map));

	map->cmpfn = equals_function ? equals_function : always_equal;
	map->cmpfn_data = cmpfn_data;

	/* calculate initial table size and allocate the table */
	initial_size = (unsigned int) ((uint64_t) initial_size * 100
			/ HASHMAP_LOAD_FACTOR);
	while (initial_size > size)
		size <<= HASHMAP_RESIZE_BITS;
	alloc_table(map, size);

	/*
	 * Keep track of the number of items in the map and
	 * allow the map to automatically grow as necessary.
	 */
	map->do_count_items = 1;
}

#define HASHMAP_INIT(fn, data) { .cmpfn = fn, .cmpfn_data = data, \
				 .do_count_items = 1 }
```
为hashmap设置了项比较函数，函数的参数，并在`HASHMAP_INITIAL_SIZE`(64)和用户传入的`initial_size`取决出需要分配桶数量。
在`alloc_table()`执行分配。

```c
static void alloc_table(struct hashmap *map, unsigned int size)
{
	map->tablesize = size;
	map->table = xcalloc(size, sizeof(struct hashmap_entry *));

	/* calculate resize thresholds for new size */
	map->grow_at = (unsigned int) ((uint64_t) size * HASHMAP_LOAD_FACTOR / 100);
	if (size <= HASHMAP_INITIAL_SIZE)
		map->shrink_at = 0;
	else
		/*
		 * The shrink-threshold must be slightly smaller than
		 * (grow-threshold / resize-factor) to prevent erratic resizing,
		 * thus we divide by (resize-factor + 1).
		 */
		map->shrink_at = map->grow_at / ((1 << HASHMAP_RESIZE_BITS) + 1);
}

```
在`alloc_table()`中，`grow_at`设置为差不多`0.8*size`的大小，如果`size < HASHMAP_INITIAL_SIZE`，`shrink_at`设置为0,桶比较少，意味着在hashtable有项在桶中的时候不需要调用`realloc`缩小容量了;否则shrink_at设置为差不多`0.16*size`的大小。注意到每个桶是通过`xcalloc`分配的内存，这意味着每个桶的链表头开始都是`NULL`。`HASHMAP_INIT`是另外一种初始化方式。

`hashmap_add`
```c
void hashmap_add(struct hashmap *map, struct hashmap_entry *entry)
{
	unsigned int b;

	if (!map->table)
		alloc_table(map, HASHMAP_INITIAL_SIZE);

	b = bucket(map, entry);
	/* add entry */
	entry->next = map->table[b];
	map->table[b] = entry;

	/* fix size and rehash if appropriate */
	if (map->do_count_items) {
		map->private_size++;
		if (map->private_size > map->grow_at)
			rehash(map, map->tablesize << HASHMAP_RESIZE_BITS);
	}
}
```
向hash表添加项，首先用`bucket`以项的hash值找到对应的桶坐标：
```c
static inline unsigned int bucket(const struct hashmap *map,
				  const struct hashmap_entry *key)
{
	return key->hash & (map->tablesize - 1);
}
```
可以注意到`bucket`通过`&`而不是`%`获得桶的坐标，真的代码写的很精妙。
接着往对应的桶插入链表的头部。
并总数计数，如果项数到了`grow_at`，通过rehash将hash表扩容。
```c
static void rehash(struct hashmap *map, unsigned int newsize)
{
	/* map->table MUST NOT be NULL when this function is called */
	unsigned int i, oldsize = map->tablesize;
	struct hashmap_entry **oldtable = map->table;

	alloc_table(map, newsize);
	for (i = 0; i < oldsize; i++) {
		struct hashmap_entry *e = oldtable[i];
		while (e) {
			struct hashmap_entry *next = e->next;
			unsigned int b = bucket(map, e);
			e->next = map->table[b];
			map->table[b] = e;
			e = next;
		}
	}
	free(oldtable);
}
```
扩容的大小`newsize`是之前的俩倍，在alloc_table中重新调用`calloc`分配更多的项，并重新设置了`graw_at`和`shrink_at`。接着将旧的hash表上所有的项重新用`bucket`计算桶坐标，并重新放入桶上的链表上。最后将旧的哈希表释放。

`hashmap_get`

```c
struct hashmap_entry *hashmap_get(const struct hashmap *map,
				const struct hashmap_entry *key,
				const void *keydata)
{
	if (!map->table)
		return NULL;
	return *find_entry_ptr(map, key, keydata);
}
```
其中调用`find_entry_ptr`:
```c
static inline struct hashmap_entry **find_entry_ptr(const struct hashmap *map,
		const struct hashmap_entry *key, const void *keydata)
{
	/* map->table MUST NOT be NULL when this function is called */
	struct hashmap_entry **e = &map->table[bucket(map, key)];
	while (*e && !entry_equals(map, *e, key, keydata))
		e = &(*e)->next;
	return e;
}
```
首先找到我们想要的`hashmap_entry *key`所对应的桶，在遍历桶上每个节点通过`entry_equals`找到和我们的key“相同”的项并返回（这里的相同不仅仅靠着hash值，还可以通过用户函数和传入的keydata来判断相同。如下）
```c
static inline int entry_equals(const struct hashmap *map,
			       const struct hashmap_entry *e1,
			       const struct hashmap_entry *e2,
			       const void *keydata)
{
	return (e1 == e2) ||
	       (e1->hash == e2->hash &&
		!map->cmpfn(map->cmpfn_data, e1, e2, keydata));
}
```
可能大家会有些困惑这个cmpfn为什么还要去比较`keydata`，其实有些数据也许hash值不同，但是它们其实都算同一个东西，比如"adl"和"hzn"都它们都指向同一个人，也许"adl"和"hzn"的哈希值是不同的，但是我们可以在一个结构体里面放如人的ID，这样在hash表中想找含有该人的项，找到"adl"或者"hzn"都符合常理。
正如下面这样一个字符串池的比较函数，通过比较`hash_entry`对应的`pool_entry`，并比较`keydata`是否和`e1->data`相同或内容相等来作为额外的比较。
```c
static int pool_entry_cmp(const void *unused_cmp_data,
			  const struct hashmap_entry *eptr,
			  const struct hashmap_entry *entry_or_key,
			  const void *keydata)
{
	const struct pool_entry *e1, *e2;

	e1 = container_of(eptr, const struct pool_entry, ent);
	e2 = container_of(entry_or_key, const struct pool_entry, ent);

	return e1->data != keydata &&
	       (e1->len != e2->len || memcmp(e1->data, keydata, e1->len));
}
```

言归正传，`find_entry_ptr`找到了和`key`或者`keydata`匹配的哈希项并返回，注意这里返回了哈希项的二级指针。`hashmap_get`则返回了`find_entry_ptr`的解引用。

`hashmap_remove`
```c
struct hashmap_entry *hashmap_remove(struct hashmap *map,
				     const struct hashmap_entry *key,
				     const void *keydata)
{
	struct hashmap_entry *old;
	struct hashmap_entry **e;

	if (!map->table)
		return NULL;
	e = find_entry_ptr(map, key, keydata);
	if (!*e)
		return NULL;

	/* remove existing entry */
	old = *e;
	*e = old->next;
	old->next = NULL;

	/* fix size and rehash if appropriate */
	if (map->do_count_items) {
		map->private_size--;
		if (map->private_size < map->shrink_at)
			rehash(map, map->tablesize >> HASHMAP_RESIZE_BITS);
	}

	return old;
}
```
很简单，先找到哈希项对应的二级指针，并在链表中删除它（想想如果`find_entry_ptr`使用一级指针会怎么样。）

接着再`private_size`减1，可能执行缩小的rehash。

`hashmap_put`
```c
struct hashmap_entry *hashmap_put(struct hashmap *map,
				  struct hashmap_entry *entry)
{
	struct hashmap_entry *old = hashmap_remove(map, entry, NULL);
	hashmap_add(map, entry);
	return old;
}
```
remove旧项后add新项并返回旧项。

`hashmap_get_next`
```c
struct hashmap_entry *hashmap_get_next(const struct hashmap *map,
				       const struct hashmap_entry *entry)
{
	struct hashmap_entry *e = entry->next;
	for (; e; e = e->next)
		if (entry_equals(map, entry, e, NULL))
			return e;
	return NULL;
}
```
传入的是前一个匹配项，通过`hashmap_get_next`可以找到下一个（相同或者指定内容相等）匹配项。

`hashmap_iter_init`and`hashmap_iter_next`and`hashmap_iter_first`
```c
void hashmap_iter_init(struct hashmap *map, struct hashmap_iter *iter)
{
	iter->map = map;
	iter->tablepos = 0;
	iter->next = NULL;
}

struct hashmap_entry *hashmap_iter_next(struct hashmap_iter *iter)
{
	struct hashmap_entry *current = iter->next;
	for (;;) {
		if (current) {
			iter->next = current->next;
			return current;
		}

		if (iter->tablepos >= iter->map->tablesize)
			return NULL;

		current = iter->map->table[iter->tablepos++];
	}
}

static inline struct hashmap_entry *hashmap_iter_first(struct hashmap *map,
						       struct hashmap_iter *iter)
{
	hashmap_iter_init(map, iter);
	return hashmap_iter_next(iter);
}
```
`hashmap_iter_first`获得哈希表第一个哈希项指针。
`hashmap_iter_next`可以获得从第前一个获取到下一个哈希项。
也就是通过`hashmap_iter_first`和`hashmap_iter_next`哈希表所有的项。

`hashmap_clear`
```c
#define hashmap_clear(map) hashmap_clear_(map, -1)
```
```c
void hashmap_clear_(struct hashmap *map, ssize_t entry_offset)
{
	if (!map || !map->table)
		return;
	if (entry_offset >= 0)  /* called by hashmap_clear_and_free */
		free_individual_entries(map, entry_offset);
	free(map->table);
	memset(map, 0, sizeof(*map));
}
```
很清晰这个`hashmap_clear`只能free了哈希表上的桶，不会对每个哈希项对应的数据进行清理。
`hashmap_partial_clear`
```c
#define hashmap_partial_clear(map) hashmap_partial_clear_(map, -1)
```
```c
void hashmap_partial_clear_(struct hashmap *map, ssize_t entry_offset)
{
	if (!map || !map->table)
		return;
	if (entry_offset >= 0)  /* called by hashmap_clear_entries */
		free_individual_entries(map, entry_offset);
	memset(map->table, 0, map->tablesize * sizeof(struct hashmap_entry *));
	map->shrink_at = 0;
	map->private_size = 0;
}
```
这个甚至连哈希表上的桶都不会free掉，而是使用memset清空。

`hashmap_clear_and_free`
```c
#define hashmap_clear_and_free(map, type, member) \
	hashmap_clear_(map, offsetof(type, member))
```

这时候我们应该去看看`free_individual_entries`里面是啥了。

```c
static void free_individual_entries(struct hashmap *map, ssize_t entry_offset)
{
	struct hashmap_iter iter;
	struct hashmap_entry *e;

	hashmap_iter_init(map, &iter);
	while ((e = hashmap_iter_next(&iter)))
		/*
		 * like container_of, but using caller-calculated
		 * offset (caller being hashmap_clear_and_free)
		 */
		free((char *)e - entry_offset);
}
```
可以看到遍历了整个哈希表并free掉对应的数据项。
`hashmap_partial_clear_and_free`

```c
#define hashmap_partial_clear_and_free(map, type, member) \
	hashmap_partial_clear_(map, offsetof(type, member))
```
那么同理，`hashmap_partial_clear_and_free`会free对应的数据项，并将hash表清空。


`hashmap_entry_init`
```c
static inline void hashmap_entry_init(struct hashmap_entry *e,
				      unsigned int hash)
{
	e->hash = hash;
	e->next = NULL;
}
```
向哈希项填入hash值

`hashmap_get_size`
```c
static inline unsigned int hashmap_get_size(struct hashmap *map)
{
	if (map->do_count_items)
		return map->private_size;

	BUG("hashmap_get_size: size not set");
	return 0;
}
```
获取哈希表中的项数。
`hashmap_get_from_hash`
```c
static inline struct hashmap_entry *hashmap_get_from_hash(
					const struct hashmap *map,
					unsigned int hash,
					const void *keydata)
{
	struct hashmap_entry key;
	hashmap_entry_init(&key, hash);
	return hashmap_get(map, &key, keydata);
}
```
直接从哈希值获取哈希项。


hashmap_for_each_entry
```c
#define hashmap_for_each_entry(map, iter, var, member) \
	for (var = NULL, /* for systems without typeof */ \
	     var = hashmap_iter_first_entry_offset(map, iter, \
						OFFSETOF_VAR(var, member)); \
		var; \
		var = hashmap_iter_next_entry_offset(iter, \
						OFFSETOF_VAR(var, member)))
```
遍历整个hash表，这可能写法比较诡异。

首先for循环的开头是将`var`置为NULL，以我觉得它是想保证`var`是个指针。

接着看`hashmap_iter_first_entry_offset`
```c
#define hashmap_iter_first_entry_offset(map, iter, offset) \
	container_of_or_null_offset(hashmap_iter_first(map, iter), offset)
```
接着看`container_of_or_null_offset`
```c
static inline void *container_of_or_null_offset(void *ptr, size_t offset)
{
	return ptr ? (char *)ptr - offset : NULL;
}
```
注意到`container_of`是获取一个结构体中某个成员所对应的该结构体首地址，即
```c
#define container_of(ptr, type, member) \
	((type *) ((char *)(ptr) - offsetof(type, member)))
```
我们可以通入如下方式获得s的地址
```c
  typedef struct {
    int a;
    int b;
  }st;
  void func(){
    st s;
    int *pb=&s.b;
    printf("address:%p\n",container_of(pb,st,b));
  }
```
因此`container_of_or_null_offset`就是在ptr不为NULL的时候采取做`container`的工作，至于为什么要这么做？可能是"更高效"。

然后
`OFFSETOF_VAR(var,member)`可以从一个结构体中找到对应内容的偏移量

`OFFSETOF_VAR`
```C
#if defined(__GNUC__) /* clang sets this, too */
#define OFFSETOF_VAR(ptr, member) offsetof(__typeof__(*ptr), member)
#else /* !__GNUC__ */
#define OFFSETOF_VAR(ptr, member) \
	((uintptr_t)&(ptr)->member - (uintptr_t)(ptr))
#endif /* !__GNUC__ */
```
在有`GNU`的机器上直接使用`__typeof__`得到一个数据的类型，如`OFFSETOF_VAR(&s,b)`就可以找到结构体st上成员b对应的偏移量。

`hashmap_iter_first`提供第一个哈希项，
`hashmap_iter_first_entry_offset`可以直接通过哈希项和哈希项在结构体中的偏移量找到第一个数据项。妙啊！
`hashmap_iter_next_entry_offset`同理可以获得下一个数据项，
所以`hashmap_for_each_entry`可以遍历整个哈希表的数据项。

`hashmap_get_entry`
```c
#define hashmap_get_entry(map, keyvar, member, keydata) \
	container_of_or_null_offset( \
				hashmap_get(map, &(keyvar)->member, keydata), \
				OFFSETOF_VAR(keyvar, member))
```
首先`hashmap_get`获得哈希项，`OFFSETOF_VAR`获得哈希项在数据项的偏移量，最终
`container_of_or_null_offset`获得数据项地址。


这里大部分api讲到了。

可以最后看看池
```c
#define FLEX_ARRAY

struct pool_entry {
	struct hashmap_entry ent;
	size_t len;
	unsigned char data[FLEX_ARRAY];
};

static int pool_entry_cmp(const void *unused_cmp_data,
			  const struct hashmap_entry *eptr,
			  const struct hashmap_entry *entry_or_key,
			  const void *keydata)
{
	const struct pool_entry *e1, *e2;

	e1 = container_of(eptr, const struct pool_entry, ent);
	e2 = container_of(entry_or_key, const struct pool_entry, ent);

	return e1->data != keydata &&
	       (e1->len != e2->len || memcmp(e1->data, keydata, e1->len));
}

const void *memintern(const void *data, size_t len)
{
	static struct hashmap map;
	struct pool_entry key, *e;

	/* initialize string pool hashmap */
	if (!map.tablesize)
		hashmap_init(&map, pool_entry_cmp, NULL, 0);

	/* lookup interned string in pool */
	hashmap_entry_init(&key.ent, memhash(data, len));
	key.len = len;
	e = hashmap_get_entry(&map, &key, ent, data);
	if (!e) {
		/* not found: create it */
		FLEX_ALLOC_MEM(e, data, data, len);
		hashmap_entry_init(&e->ent, key.ent.hash);
		e->len = len;
		hashmap_add(&map, &e->ent);
	}
	return e->data;
}
static inline const char *strintern(const char *string)
{
	return memintern(string, strlen(string));
}
```
首先我们可以看到`pool_entry`池项中有一个哈希项，这说明我们可以通过这个哈希项减去偏移量的方式找到所有的池项。

`memintern`中，我们会在一个静态的`hashmap`中寻找`data`所对应的哈希项，如果找到了就返回对应的池项的data成员（这里存放字符串），否则`FLEX_ALLOC_MEM`为池项分配内存并填写了`data`字段为我们的函数形参`data`，并初始化哈希项并加入到哈希表中，返回池项中的`data`。

```c
#define FLEX_ALLOC_MEM(x, flexname, buf, len) do { \
	size_t flex_array_len_ = (len); \
	(x) = xcalloc(1, st_add3(sizeof(*(x)), flex_array_len_, 1)); \
	memcpy((void *)(x)->flexname, (buf), flex_array_len_); \
} while (0)
```
```
static inline size_t st_add(size_t a, size_t b)
{
	if (unsigned_add_overflows(a, b))
		die("size_t overflow: %"PRIuMAX" + %"PRIuMAX,
		    (uintmax_t)a, (uintmax_t)b);
	return a + b;
}
#define st_add3(a,b,c)   st_add(st_add((a),(b)),(c))
```
`FLEX_ALLOC_MEM`其中是`xcalloc`了一块 结构体大小+字符串长度+1 的空间作为结构体的地址，并将字符串填入对应字段。`st_add3`不过是检查了下是否溢出。

注意到池项中FLEX_ARRAY没有值，也就是说`data`是个可增长数组，之后可以直接给结构体malloc比结构体大小大的空间作为`data`的大小。
```c
	size_t len;
	unsigned char data[FLEX_ARRAY];
```
最后`strintern`也就是填入了静态的字符串多次调用会返回单一的动态的字符串。
不需要重复多次调用`strdup`动态分配影响性能。

总结：git 通过宏函数为哈希表适配了各式各样的接口，设计精巧（可能也有些困难），为性能优化做到了精益求精。

不过这可能是git中最简单的api了吧！小白痛哭;-）

---
title: 'GSOC, Git Blog 12'
titleZh: "GSoC Git 博客 12"
date: 2021-08-09 08:34:29
tags: git
---

<div class="lang-section" data-lang="en">

## Week12 Avoid repetitive parsing


After we brought around `10%` optimization to `git cat-file --batch` through skip parse_object_buffer(), let's take a look at the result of gprof again:

```
  %
 time     calls(before)       calls(after)     name
  1.24               0              349756     format_ref_array_item
  1.24               0              349756     get_object
  0.83         4184784             4534690     do_xmalloc
  0.83               0             1399028     parse_ref_filter_atom
  0.41         4184936             5932565     memory_limit_check
  0.41          701711             1400412     strbuf_add
  0.41               0             1399024     append_atom
  0.41               0             1399024     quote_formatting
  0.41              14              349770     strbuf_init
  0.41               0              349756     populate_value
  0.00         2100807             2449753     strbuf_grow
  0.00         1973422             1973568     xmallocz
  0.00               0             1399024     get_ref_atom_value
  0.00               0             1399024     grab_values
  0.00              77              699589     xstrdup
  0.00              46              699558     xcalloc
```

gprof tells us that cat-file --batch will make a lot of copies by `xstrdup()`, `strbuf_add()`... after using the logic of ref-filter. But at present, the overhead of these copies cannot be easily avoided due to the inherent logic of ref-filter. So ref-filter has no good optimization points? We must re-observe the whole problem from a macro perspective.


`oid_object_info_extended()` can get some metadata of the object, e.g. `size`, `type`, `deltabase`, then we can use `grab_common_values()` to grab them. And those data in the content of the object like commits' `tree-oid`, `parent-oid` or tags' `deref-oid`, can be parsed by `parse_object_buffer()`, then in `grab_tag_values()` or `grab_commit_values()`, we can grab them. But many attributes of commit and tag are not obtained through `parse_object_buffer()`, such as `author-info` ,`commiter-info`, `tagger-info` etc.
We need to call grab_sub_body_contents(), grab_person() to rescan the buffer and extract the data. What if we can combine these multiple scanning and parsing into one completion?
At least intuitively, this has an opportunity to improve performance. So I check the implementation details of `parse_commit_buffer()` and `parse_tag_buffer()`, maybe we can pass some "hook pointer" to these parsing functions like `oid_object_info_extended()` does to extract only the information we need? The commit-slab caught my attention. It can be used to get some specified data content from the object. I am thinking about whether it is possible to design a `struct object_view` (temporarily called `struct commit_view`) to store the offset of the parsed data in the object content. `parse_commit_buffer()` will check whether we need something for in-depth parsing. Like this:

```c
struct commit_view {
	int need_tree : 1;
	int need_parents : 1;

	int need_author : 1;
	int need_author_name : 1;
	int need_author_email : 1;
	int need_author_date : 1;

	int need_committer : 1;
	int need_committer_name : 1;
	int need_committer_email : 1;
	int need_committer_date : 1;

	int tree_offset;
	int tree_length;

	int parents_nr;
	int *parents_offset;
	int *parents_length;

	int author_offset;
	int author_length;

	int author_name_offset;
	int author_name_length;
	int author_email_offset;
	int author_email_length;
	int author_date_offset;
	int author_date_length;

	int committer_offset;
	int committer_length;

	int committer_name_offset;
	int committer_name_length;
	int committer_email_offset;
	int committer_email_length;
	int committer_date_offset;
	int committer_date_length;
};

define_commit_slab(commit_view_slab, struct commit_view);
static struct commit_view_slab view_slab = COMMIT_SLAB_INIT(1, view_slab);

int parse_commit_buffer()
{
		...
		if (view->need_author) {
			view->author_offset = bufptr - head;
			view->author_length = ident_len;
		}
		if (view->need_author_name || view->need_author_email ||
		    view->need_author_date) {
			if (split_ident_line(&ident, ident_line, ident_len) ||
			!ident.date_begin || !ident.date_end)
				return error("bad author line in commit %s",
					     oid_to_hex(&item->object.oid));
			if (view->need_author_name) {
				view->author_name_offset = ident.name_begin - head;
				view->author_name_length = ident.name_end - ident.name_begin;
			}
			if (view->need_author_email) {
				view->author_email_offset = ident.mail_begin - head + 1;
				view->author_email_length = ident.mail_end - ident.mail_begin + 2;
			}
			if (view->need_author_date) {
				view->author_date_offset = ident.date_begin - head;
				view->author_date_length = ident.date_end - ident.date_begin;
			}
		}
		...
}

```

It's still in WIP, hope it can bring some help! It seems that GSOC has only the last few weeks left, I'm not sure how far this patch series is from being merged by the master branch. Performance optimization may have no end. By the way, is there a chance to avoid a large number of copies in ref-filter? This may be another direction.

</div>

<div class="lang-section" data-lang="zh">

## 第 12 周 避免重复解析


在通过跳过 `parse_object_buffer()` 为 `git cat-file --batch` 带来约 `10%` 的优化之后，让我们再来看看 gprof 的结果：

```
  %
 time     calls(before)       calls(after)     name
  1.24               0              349756     format_ref_array_item
  1.24               0              349756     get_object
  0.83         4184784             4534690     do_xmalloc
  0.83               0             1399028     parse_ref_filter_atom
  0.41         4184936             5932565     memory_limit_check
  0.41          701711             1400412     strbuf_add
  0.41               0             1399024     append_atom
  0.41               0             1399024     quote_formatting
  0.41              14              349770     strbuf_init
  0.41               0              349756     populate_value
  0.00         2100807             2449753     strbuf_grow
  0.00         1973422             1973568     xmallocz
  0.00               0             1399024     get_ref_atom_value
  0.00               0             1399024     grab_values
  0.00              77              699589     xstrdup
  0.00              46              699558     xcalloc
```

gprof 告诉我们，在使用 ref-filter 的逻辑后，cat-file --batch 会通过 `xstrdup()`、`strbuf_add()` 等方式产生大量拷贝。但目前由于 ref-filter 的内在逻辑，这些拷贝开销难以轻易避免。那么 ref-filter 就没有好的优化点了吗？我们必须从宏观角度重新审视整个问题。


`oid_object_info_extended()` 可以获取对象的一些元数据，例如 `size`、`type`、`deltabase`，然后我们可以使用 `grab_common_values()` 来抓取它们。而对象内容中的数据，例如 commit 的 `tree-oid`、`parent-oid` 或 tag 的 `deref-oid`，可以通过 `parse_object_buffer()` 解析，然后在 `grab_tag_values()` 或 `grab_commit_values()` 中抓取。但 commit 和 tag 的许多属性并不是通过 `parse_object_buffer()` 获得的，例如 `author-info`、`commiter-info`、`tagger-info` 等。
我们需要调用 `grab_sub_body_contents()`、`grab_person()` 来重新扫描缓冲区并提取数据。如果我们可以把这些多次扫描和解析合并为一次完成会怎样？
至少直观上看，这有机会提升性能。于是我查看了 `parse_commit_buffer()` 和 `parse_tag_buffer()` 的实现细节，也许我们可以像 `oid_object_info_extended()` 那样向这些解析函数传入一些“钩子指针”，只提取我们需要的信息？commit-slab 引起了我的注意。它可以用来从对象中获取某些指定的数据内容。我在想是否可以设计一个 `struct object_view`（暂时称为 `struct commit_view`）来存储解析数据在对象内容中的偏移量。`parse_commit_buffer()` 会检查我们是否需要进行深度解析。就像这样：

```c
struct commit_view {
	int need_tree : 1;
	int need_parents : 1;

	int need_author : 1;
	int need_author_name : 1;
	int need_author_email : 1;
	int need_author_date : 1;

	int need_committer : 1;
	int need_committer_name : 1;
	int need_committer_email : 1;
	int need_committer_date : 1;

	int tree_offset;
	int tree_length;

	int parents_nr;
	int *parents_offset;
	int *parents_length;

	int author_offset;
	int author_length;

	int author_name_offset;
	int author_name_length;
	int author_email_offset;
	int author_email_length;
	int author_date_offset;
	int author_date_length;

	int committer_offset;
	int committer_length;

	int committer_name_offset;
	int committer_name_length;
	int committer_email_offset;
	int committer_email_length;
	int committer_date_offset;
	int committer_date_length;
};

define_commit_slab(commit_view_slab, struct commit_view);
static struct commit_view_slab view_slab = COMMIT_SLAB_INIT(1, view_slab);

int parse_commit_buffer()
{
		...
		if (view->need_author) {
			view->author_offset = bufptr - head;
			view->author_length = ident_len;
		}
		if (view->need_author_name || view->need_author_email ||
		    view->need_author_date) {
			if (split_ident_line(&ident, ident_line, ident_len) ||
			!ident.date_begin || !ident.date_end)
				return error("bad author line in commit %s",
					     oid_to_hex(&item->object.oid));
			if (view->need_author_name) {
				view->author_name_offset = ident.name_begin - head;
				view->author_name_length = ident.name_end - ident.name_begin;
			}
			if (view->need_author_email) {
				view->author_email_offset = ident.mail_begin - head + 1;
				view->author_email_length = ident.mail_end - ident.mail_begin + 2;
			}
			if (view->need_author_date) {
				view->author_date_offset = ident.date_begin - head;
				view->author_date_length = ident.date_end - ident.date_begin;
			}
		}
		...
}

```

这还在进行中（WIP），希望它能带来一些帮助！GSoC 似乎只剩下最后几周了，我不确定这个补丁系列距离被合并到 master 分支还有多远。性能优化也许永无止境。顺便问一下，有没有可能避免 ref-filter 中的大量拷贝？这可能是另一个方向。

</div>

---
title: 'GSOC, Git Blog 12'
date: 2021-08-09 08:34:29
tags: git
---

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
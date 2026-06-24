---
title: Git 源码解析(一) git for-each-ref
date: 2021-08-23 19:28:20
tags: git
---

### 前言
因为目前没有看到任何有关 Git 源码的相关专题，而且恰好我最近在给 Git 社区做贡献，来给大家讲一讲一些 Git 命令的实现。

git for-each-ref 是一个用来显示 Git 引用信息的命令。

### 什么是 Git 引用

我们平时的 Git 分支如 `master`, `main`, 或者是打的标签如 `v1.0.0` 它们往往都会依附在一个提交上，可以说它们就是对应提交的引用。我们可以通过这些引用来索引到这些提交，就比如 `git checkout master` 就是通过寻找 `master` 引用所指向的提交节点来进行切换分支的。

在一个 Git 仓库中, 有一个专门的 `.git/refs` 目录用来保存引用数据文件：

```sh
tree .git/refs/
.git/refs/
├── heads
│   ├── gh-pages
│   └── master
├── remotes
│   └── origin
│       ├── gh-pages
│       ├── HEAD
│       └── master
└── tags
    └── hehe

4 directories, 6 files
```

文件里往往存放的是指向的 `Git` 对象的哈希值，当然有时也可以存放 `refs: xxx`（指向另外一个引用）

```sh
cat .git/refs/remotes/origin/master
7675a02b6bfa91250eaaf885c79da753aa9faaff

cat .git/refs/remotes/origin/HEAD
ref: refs/remotes/origin/master
```

就比如 `7675a02b6bfa91250eaaf885c79da753aa9faaff` 这一串哈希值，我们用 `git cat-file` 来看一下这个串哈希值对应的对象的具体内容：

```sh
git cat-file -p 7675a02b6bfa91250eaaf885c79da753aa9faaff
tree de12e9009967a6ee85446b41ad3bda8be9c2806e
parent 75f45f98272ac35ce5abea9f4c9162bc96fb990e
author ZheNing Hu <adlternative@gmail.com> 1629011797 +0800
committer ZheNing Hu <adlternative@gmail.com> 1629011797 +0800

gsoc

Signed-off-by: ZheNing Hu <adlternative@gmail.com>
```

可见这是一个提交对象的内容。

### git for-each-ref 用法

而 `git for-each-ref` 则可以遍历仓库中所有的引用，获得和这些引用指向的 Git 对象的相关数据。

```sh
git for-each-ref
0bc9f44ab57b9a64ab91abd0192fa26c13957367 commit refs/heads/gh-pages
7675a02b6bfa91250eaaf885c79da753aa9faaff commit refs/heads/master
7675a02b6bfa91250eaaf885c79da753aa9faaff commit refs/remotes/origin/HEAD
84594bbca23e9099eb2ccaf9eac311604fbf3a3c commit refs/remotes/origin/gh-pages
d37fc158177eff9956010c6ca476fd15a3b81363 commit refs/remotes/origin/imgbot
7675a02b6bfa91250eaaf885c79da753aa9faaff commit refs/remotes/origin/master
5101ae00e4eae671e38a1592550771091fd61531 commit refs/tags/hehe
f247ba56494fadccc03f57a85f6264a6a8ea04e0 tag    refs/tags/t2
```

`git for-each-ref` 的默认输出格式是 `%(objectname) %(objecttype)\t%(refname)`,具体含义也就是 `对象名`，`对象类型`，`引用名`。

在 Git 源码的 `ref-filter.c` 中多达 40 种不同的输出格式，终端用户或者上层应用则根据他们所需要的信息使用 `git for-each-ref --format=<format>` 选择不同的格式，就比如这是 `vscode` 的 `Git` 插件在后台做的事情：

```sh
git for-each-ref --format="%(refname)%00%(upstream:short)%00%(objectname)%00%(upstream:track)" refs/heads/cherry-pick-help-fix-3 refs/remotes/cherry-pick-help-fix-3
git for-each-ref --sort="-committerdate" --format="%(refname) %(objectname) %(*objectname)"
```

令人好奇的是，Git 是如何通过这些格式串来获取对象的具体数据的呢？

### 走进 git for-each-ref 源码

Git 子命令的实现上往往遵从下面这样的风格：

```c
int cmd_sub_command(int argc, const char **argv, const char *prefix)
{
	// 变量初始化
	// 一个很大的命令行参数注册表
	// 解析 Git 配置
	// 解析命令行参数
	// 具体的业务逻辑
}
```

在 `builtin/for-each-ref.c` 中，我们可以看到 `git for-each-ref` 的入口 `cmd_for_each_ref()`.

```c
int cmd_for_each_ref(int argc, const char **argv, const char *prefix)
{
	...

	/* 下面这是一个很大的命令行参数注册表 */
	struct option opts[] = {
		OPT_BIT('s', "shell", &format.quote_style,
			N_("quote placeholders suitably for shells"), QUOTE_SHELL),
		OPT_BIT('p', "perl",  &format.quote_style,
			N_("quote placeholders suitably for perl"), QUOTE_PERL),
		OPT_BIT(0 , "python", &format.quote_style,
			N_("quote placeholders suitably for python"), QUOTE_PYTHON),
		OPT_BIT(0 , "tcl",  &format.quote_style,
			N_("quote placeholders suitably for Tcl"), QUOTE_TCL),

		OPT_GROUP(""),
		OPT_INTEGER( 0 , "count", &maxcount, N_("show only <n> matched refs")),
		//
		OPT_STRING(  0 , "format", &format.format, N_("format"), N_("format to use for the output")),
		OPT__COLOR(&format.use_color, N_("respect format colors")),
		OPT_REF_SORT(sorting_tail),
		OPT_CALLBACK(0, "points-at", &filter.points_at,
			     N_("object"), N_("print only refs which points at the given object"),
			     parse_opt_object_name),
		OPT_MERGED(&filter, N_("print only refs that are merged")),
		OPT_NO_MERGED(&filter, N_("print only refs that are not merged")),
		OPT_CONTAINS(&filter.with_commit, N_("print only refs which contain the commit")),
		OPT_NO_CONTAINS(&filter.no_commit, N_("print only refs which don't contain the commit")),
		OPT_BOOL(0, "ignore-case", &icase, N_("sorting and filtering are case insensitive")),
		OPT_END(),
	};

	...

	format.format = "%(objectname) %(objecttype)\t%(refname)"; /* 默认的格式串 */

	git_config(git_default_config, NULL); /* 解析 git 配置 */

	parse_options(argc, argv, prefix, opts, for_each_ref_usage, 0); /* 解析命令行参数 */
	...
	if (verify_ref_format(&format)) /* 格式串解析 */
		usage_with_options(for_each_ref_usage, opts);

	if (!sorting)
		sorting = ref_default_sorting(); /* 初始化引用排序数据 */
	ref_sorting_set_sort_flags_all(sorting, REF_SORTING_ICASE, icase);
	filter.ignore_case = icase;

	filter.name_patterns = argv;
	filter.match_as_path = 1;
	filter_refs(&array, &filter, FILTER_REFS_ALL | FILTER_REFS_INCLUDE_BROKEN); /* 获得所有的引用 */
	ref_array_sort(sorting, &array); /* 进行引用数组的排序 */

	if (!maxcount || array.nr < maxcount)
		maxcount = array.nr;
	/* 遍历引用数组，获取引用对应格式的数据 */
	for (i = 0; i < maxcount; i++) {
		strbuf_reset(&err);
		strbuf_reset(&output);
		if (format_ref_array_item(array.items[i], &format, &output, &err))
			die("%s", err.buf);
		fwrite(output.buf, 1, output.len, stdout); /* 输出引用数据 */
		putchar('\n');
	}
	...
	return 0;
}

```

基本上步骤是很清晰的：
1. 解析命令行提供的参数，没有 `--format` 则使用默认的格式 `%(objectname) %(objecttype)\t%(refname)`。
2. `verify_ref_format()` 对格式进行解析。
3. `filter_refs()` 获得所有的引用。
4. `ref_array_sort()` 对引用对象进行排序。
5. `format_ref_array_item()` 对每一个引用对象获取数据并输出。

阅读的重点放在 `verify_ref_format()` 和 `format_ref_array_item()`。

### `verify_ref_format()`

```c
/*
 * Make sure the format string is well formed, and parse out
 * the used atoms.
 */
int verify_ref_format(struct ref_format *format)
{
	const char *cp, *sp;

	format->need_color_reset_at_eol = 0;
	/* sp 会找到格式原子的开始 "%(" */
	for (cp = format->format; *cp && (sp = find_next(cp)); ) {
		struct strbuf err = STRBUF_INIT;
		const char *color, *ep = strchr(sp, ')'); /* 寻找原子的末尾 */
		int at;

		if (!ep)
			return error(_("malformed format string %s"), sp);
		/* sp points at "%(" and ep points at the closing ")" */
		/* [sp + 2, ep) 就是一个具体的格式原子 比如 `objectname:short`
		 * 我们对该原子使用 `parse_ref_filter_atom()` 进行解析。
		 */
		at = parse_ref_filter_atom(format, sp + 2, ep, &err);
		if (at < 0)
			die("%s", err.buf);
		cp = ep + 1;
		/* 和 %(color) 原子相关的处理 */
		if (skip_prefix(used_atom[at].name, "color:", &color))
			format->need_color_reset_at_eol = !!strcmp(color, "reset");
		strbuf_release(&err);
	}
	if (format->need_color_reset_at_eol && !want_color(format->use_color))
		format->need_color_reset_at_eol = 0;
	return 0;
}

```

源码中将每一个格式单元 `%(atom)` 叫做“原子”，`verify_ref_format()` 所在
做的工作就是将格式串拆分为一个个格式“原子”，然后对每一个“原子”，
使用 `parse_ref_filter_atom()` 进行解析和记录。

```c
/*
 * Used to parse format string and sort specifiers
 */
static int parse_ref_filter_atom(const struct ref_format *format,
				 const char *atom, const char *ep,
				 struct strbuf *err)
{
	const char *sp;
	const char *arg;
	int i, at, atom_len;

	sp = atom;
	if (*sp == '*' && sp < ep)
		sp++; /* deref */
	if (ep <= sp)
		return strbuf_addf_ret(err, -1, _("malformed field name: %.*s"),
				       (int)(ep-atom), atom);
	/* parse_ref_filter_atom() 会在解析结果 used_atom 数组中查找是否已经
	 * 有对应的项，有的话直接返回它在 used_atom 中的坐标。 */

	/* Do we have the atom already used elsewhere? */
	for (i = 0; i < used_atom_cnt; i++) {
		int len = strlen(used_atom[i].name);
		if (len == ep - atom && !memcmp(used_atom[i].name, atom, len))
			return i;
	}

	/*
	 * If the atom name has a colon, strip it and everything after
	 * it off - it specifies the format for this entry, and
	 * shouldn't be used for checking against the valid_atom
	 * table.
	 */
	/* 解析该原子是否有额外的属性 比如 %(objectname:short) */
	arg = memchr(sp, ':', ep - sp);
	/* 原子名应当只包含原子名称 比如 objectname */
	atom_len = (arg ? arg : ep) - sp;

	/* Is the atom a valid one? */
	/* 在全局的有效原子数组 valid_atom 中查找对应的原子 */
	for (i = 0; i < ARRAY_SIZE(valid_atom); i++) {
		int len = strlen(valid_atom[i].name);
		if (len == atom_len && !memcmp(valid_atom[i].name, sp, len))
			break;
	}

	if (ARRAY_SIZE(valid_atom) <= i)
		return strbuf_addf_ret(err, -1, _("unknown field name: %.*s"),
				       (int)(ep-atom), atom);
	if (valid_atom[i].source != SOURCE_NONE && !have_git_dir())
		return strbuf_addf_ret(err, -1,
				       _("not a git repository, but the field '%.*s' requires access to object data"),
				       (int)(ep-atom), atom);

	/* 说明是个正确的原子，我们将解析结果数组 used_atom 扩容， */
	/* Add it in, including the deref prefix */
	at = used_atom_cnt;
	used_atom_cnt++;
	REALLOC_ARRAY(used_atom, used_atom_cnt);
	/* 记录解析原子的那些信息，'i' 是在 valid_atom 对应的坐标 */
	used_atom[at].atom_type = i;
	used_atom[at].name = xmemdupz(atom, ep - atom);
	used_atom[at].type = valid_atom[i].cmp_type;
	used_atom[at].source = valid_atom[i].source;
	if (used_atom[at].source == SOURCE_OBJ) {
		if (*atom == '*')
			oi_deref.info.contentp = &oi_deref.content;
		else
			oi.info.contentp = &oi.content;
	}
	/* 获取原子的参数 如 %(objectname:short) 中的 short */
	if (arg) {
		arg = used_atom[at].name + (arg - atom) + 1;
		if (!*arg) {
			/*
			 * Treat empty sub-arguments list as NULL (i.e.,
			 * "%(atom:)" is equivalent to "%(atom)").
			 */
			arg = NULL;
		}
	}
	memset(&used_atom[at].u, 0, sizeof(used_atom[at].u));
	/* 根据有效原子注册表中该原子对应的解析函数进行解析。 */
	if (valid_atom[i].parser && valid_atom[i].parser(format, &used_atom[at], arg, err))
		return -1;
	if (*atom == '*')
		need_tagged = 1;
	if (i == ATOM_SYMREF)
		need_symref = 1;
	return at;
}
```

其中需要关注的是 `valid_atom` 和 `used_atom`.

`valid_atom` 是一张非常大的有效原子注册表，存放了有效的原子的名称，属性和解析回调函数。

```c
static struct {
	const char *name;
	info_source source;
	cmp_type cmp_type;
	int (*parser)(const struct ref_format *format, struct used_atom *atom,
		      const char *arg, struct strbuf *err);
} valid_atom[] = {
	[ATOM_REFNAME] = { "refname", SOURCE_NONE, FIELD_STR, refname_atom_parser },
	[ATOM_OBJECTTYPE] = { "objecttype", SOURCE_OTHER, FIELD_STR, objecttype_atom_parser },
	[ATOM_OBJECTSIZE] = { "objectsize", SOURCE_OTHER, FIELD_ULONG, objectsize_atom_parser },
	[ATOM_OBJECTNAME] = { "objectname", SOURCE_OTHER, FIELD_STR, oid_atom_parser },
	[ATOM_DELTABASE] = { "deltabase", SOURCE_OTHER, FIELD_STR, deltabase_atom_parser },
	[ATOM_TREE] = { "tree", SOURCE_OBJ, FIELD_STR, oid_atom_parser },
	[ATOM_PARENT] = { "parent", SOURCE_OBJ, FIELD_STR, oid_atom_parser },
	[ATOM_NUMPARENT] = { "numparent", SOURCE_OBJ, FIELD_ULONG },
	[ATOM_OBJECT] = { "object", SOURCE_OBJ },
	[ATOM_TYPE] = { "type", SOURCE_OBJ },
	[ATOM_TAG] = { "tag", SOURCE_OBJ },
  ...
};
```

`used_atom` 则是一个存放解析结果的可动态扩容的数组，存放原子的类型，名称，属性，还使用一个共用体来存放和指定类型的原子的具体解析内容。

```c
static struct used_atom {
	enum atom_type atom_type;
	const char *name;
	cmp_type type;
	info_source source;
	union {
		char color[COLOR_MAXLEN];
		struct align align;
		struct {
			enum {
				RR_REF, RR_TRACK, RR_TRACKSHORT, RR_REMOTE_NAME, RR_REMOTE_REF
			} option;
			struct refname_atom refname;
			unsigned int nobracket : 1, push : 1, push_remote : 1;
		} remote_ref;
		struct {
			enum { C_BARE, C_BODY, C_BODY_DEP, C_LENGTH, C_LINES,
			       C_SIG, C_SUB, C_SUB_SANITIZE, C_TRAILERS } option;
			struct process_trailer_options trailer_opts;
			unsigned int nlines;
		} contents;
		struct {
			cmp_status cmp_status;
			const char *str;
		} if_then_else;
		struct {
			enum { O_FULL, O_LENGTH, O_SHORT } option;
			unsigned int length;
		} oid;
		struct {
			enum { O_SIZE, O_SIZE_DISK } option;
		} objectsize;
		struct email_option {
			enum { EO_RAW, EO_TRIM, EO_LOCALPART } option;
		} email_option;
		struct refname_atom refname;
		char *head;
	} u;
} *used_atom;
```

`parse_ref_filter_atom()` 大致流程：
1. 在存放解析结果的可动态扩容的数组 `used_atom` 中查找是否已有解析结果。如果有则返回其坐标。
2. 如果没有则在一张非常大的有效原子注册表 `valid_atom` 中查找是否有匹配的有效原子项，如果有的话，扩容 `used_atom`。
3. 记录该原子的数据，并执行对应解析函数。

至此，`verify_ref_format()` 成功的将所有原子的解析结果放入了 `used_atom` 中。然后 Git 通过 `filter_refs()` 遍历 `.git/refs` 所有的引用文件，将引用添加到引用数组中，在排序和截取最大长度之后，Git 遍历数组，对每一个引用执行 `format_ref_array_item()`。

### `format_ref_array_item()`

```c
int format_ref_array_item(struct ref_array_item *info,
			   const struct ref_format *format,
			   struct strbuf *final_buf,
			   struct strbuf *error_buf)
{
	const char *cp, *sp, *ep;
	struct ref_formatting_state state = REF_FORMATTING_STATE_INIT;

	state.quote_style = format->quote_style;
	push_stack_element(&state.stack); /* 输出栈 */
	/* 再次解析格式串 */
	for (cp = format->format; *cp && (sp = find_next(cp)); cp = ep + 1) {
		struct atom_value *atomv;
		int pos;
		/* 寻找原子结尾 */
		ep = strchr(sp, ')');
		/* 将那些不是原子内容的部分直接添加到输出缓冲区中 */
		if (cp < sp)
			append_literal(cp, sp, &state);
		/* 解析原子在 used_atom 中的坐标（这次我们就可以从之前的解析结果 used_atom
		 * 中直接获取解析结果，而不用与 valid_atom 进行繁琐的匹配了） */
		pos = parse_ref_filter_atom(format, sp + 2, ep, error_buf);
		/* 获取该引用对象对应该原子的中间数据 */
		if (pos < 0 || get_ref_atom_value(info, pos, &atomv, error_buf) ||
        /* handler == append_atom 时将原子的中间数据添加到缓冲区中 */
		    atomv->handler(atomv, &state, error_buf)) {
			pop_stack_element(&state.stack);
			return -1;
		}
	}
	/* 添加最后的非原子内容到缓冲区 */
	if (*cp) {
		sp = cp + strlen(cp);
		append_literal(cp, sp, &state);
	}
	if (format->need_color_reset_at_eol) {
		struct atom_value resetv;
		resetv.s = GIT_COLOR_RESET;
		if (append_atom(&resetv, &state, error_buf)) {
			pop_stack_element(&state.stack);
			return -1;
		}
	}
	if (state.stack->prev) {
		pop_stack_element(&state.stack);
		return strbuf_addf_ret(error_buf, -1, _("format: %%(end) atom missing"));
	}
	/* 将缓冲区的内容拷贝到最终缓冲区 */
	strbuf_addbuf(final_buf, &state.stack->output);
	pop_stack_element(&state.stack);
	return 0;
}
```

`format_ref_array_item()` 对格式串进行了二次解析，目的是将格式串中原子和非原子的部分都添加到最终输出缓冲区中（`verify_ref_format()` 在 `used_atom` 中只保存了原子的部分）

然后为了实现 `%(if) %(else) %(then) %(end)` 引入了输出栈 `ref_formatting_state` 的概念，一层一层的将中间数据向前叠加，最终会汇入最终缓冲区 `final_buf`。

而其中获取具体的原子对应的对象数据的部分则是 `get_ref_atom_value()` 完成的。

```c
/*
 * Given a ref, return the value for the atom.  This lazily gets value
 * out of the object by calling populate value.
 */
static int get_ref_atom_value(struct ref_array_item *ref, int atom,
			      struct atom_value **v, struct strbuf *err)
{
	if (!ref->value) { /* 如果该引用还没有对应的所有原子中间数据 */
		if (populate_value(ref, err)) /* 获取该引用所有原子对应的中间数据 */
			return -1;
		fill_missing_values(ref->value); /* 填充空项 */
	}
	*v = &ref->value[atom]; /* 从拥有所有原子数据的中间数据数组中获取对应原子的项返回 */
	return 0;
}
```

上面的英文注释也告诉我们，`get_ref_atom_value()` 是采用了一种懒惰求值的方式，
说到底就是一次性获取对象所有的原子数据，而不是来一个原子去找一次。这样做的好处是可以利用空间局部性，减少重复的解析。

`populate_value()` 获取引用对象具体的原子数据：

```c
/*
 * Parse the object referred by ref, and grab needed value.
 */
static int populate_value(struct ref_array_item *ref, struct strbuf *err)
{
	struct object *obj;
	int i;
	struct object_info empty = OBJECT_INFO_INIT;
	/* 分配中间数据数组的空间 */
	CALLOC_ARRAY(ref->value, used_atom_cnt);

	if (need_symref && (ref->flag & REF_ISSYMREF) && !ref->symref) {
		ref->symref = resolve_refdup(ref->refname, RESOLVE_REF_READING,
					     NULL, NULL);
		if (!ref->symref)
			ref->symref = xstrdup("");
	}

	/* Fill in specials first */
	/*遍历 used_atom 数组， 并选择其中比较特殊的那些原子获取数据，如
	 * %(refname), %(symref), %(upstream), %(if) ... */
	for (i = 0; i < used_atom_cnt; i++) {
		struct used_atom *atom = &used_atom[i];
		enum atom_type atom_type = atom->atom_type;
		const char *name = used_atom[i].name;
		struct atom_value *v = &ref->value[i];
		int deref = 0;
		const char *refname;
		struct branch *branch = NULL;

		v->handler = append_atom;
		v->atom = atom;

		if (*name == '*') {
			deref = 1;
			name++;
		}

		if (atom_type == ATOM_REFNAME)
			refname = get_refname(atom, ref);
		else if (atom_type == ATOM_WORKTREEPATH) {
			if (ref->kind == FILTER_REFS_BRANCHES)
				v->s = get_worktree_path(atom, ref);
			else
				v->s = xstrdup("");
			continue;
		}
		else if (atom_type == ATOM_SYMREF)
			refname = get_symref(atom, ref);
   ...
	}
   ...
	if (need_tagged)
		oi.info.contentp = &oi.content;
	/* 判断是否需要继续深度解析对象内容 */
	if (!memcmp(&oi.info, &empty, sizeof(empty)) &&
	    !memcmp(&oi_deref.info, &empty, sizeof(empty)))
		return 0;

	oi.oid = ref->objectname;
	/* 解析对象的数据 */
	if (get_object(ref, 0, &obj, &oi, err))
		return -1;
	/* 如果需要解引用且我们正在处理 TAG 对象 */
	if (!need_tagged || (obj->type != OBJ_TAG))
		return 0;
	/* 解引用找到 tag 指向的对象 */
	oi_deref.oid = *get_tagged_oid((struct tag *)obj);
	/* 获取 tag 指向对象的数据 */
	return get_object(ref, 1, &obj, &oi_deref, err);
}

```

`populate_value()` 的具体流程：
1. 解析特殊原子如 `%(refname)`, `%(worktrepath)`... 这些原子的信息获取并不需要深度解析对象的内容，可以说是比较廉价的。
2. 如果有必要深度解析，则调用 `get_object()` 获取对象深度解析的数据。
3. 如果 `get_object()` 的结果显示该引用指向的是一个标签对象，而且我们需要获得该标签对象解引用的对象的数据（往往是一个提交对象），那么我们需要对这个解引用的对象再次使用 `get_object()` 进行解析。

```c
static int get_object(struct ref_array_item *ref, int deref, struct object **obj,
		      struct expand_data *oi, struct strbuf *err)
{
	/* parse_object_buffer() will set eaten to 0 if free() will be needed */
	int eaten = 1;
	/* 当我们需要获取对象内容时，也获取对象的类型和大小 */
	if (oi->info.contentp) {
		/* We need to know that to use parse_object_buffer properly */
		oi->info.sizep = &oi->size;
		oi->info.typep = &oi->type;
	}
	/* Git 从松散文件或者 pack 文件中解压出对象文件的数据并填入我们指定的位置。*/
	if (oid_object_info_extended(the_repository, &oi->oid, &oi->info,
				     OBJECT_INFO_LOOKUP_REPLACE))
		return strbuf_addf_ret(err, -1, _("missing object %s for %s"),
				       oid_to_hex(&oi->oid), ref->refname);
	if (oi->info.disk_sizep && oi->disk_size < 0)
		BUG("Object size is less than zero.");

	if (oi->info.contentp) {
		/* 解析对象 buffer 数据 并进行缓存 */
		*obj = parse_object_buffer(the_repository, &oi->oid, oi->type, oi->size, oi->content, &eaten);
		if (!*obj) {
			if (!eaten)
				free(oi->content);
			return strbuf_addf_ret(err, -1, _("parse_object_buffer failed on %s for %s"),
					       oid_to_hex(&oi->oid), ref->refname);
		}
		/* 抓取我们需要的那些原子对应的对象数据 1 */
		grab_values(ref->value, deref, *obj, oi->content);
	}
	/* 抓取我们需要的那些原子对应的对象数据 2（不需要对象 content 内容） */
	grab_common_values(ref->value, deref, oi);
	if (!eaten)
		free(oi->content);
	return 0;
}
```

`get_object()` 的具体流程：
1. `oid_object_info_extended()` 从文件中获取我们指定的对象数据，如 对象大小，对象类型，对象内容。
2. 如果需要对象的 `content` 内容则调用 `parse_object_buffer()` 解析内容。
3. 调用 `grab_values()` 和 `grab_common_value()` 抓取对应原子所需的数据，存放到中间数据中。


```c
static void grab_common_values(struct atom_value *val, int deref, struct expand_data *oi)
{
	int i;

	for (i = 0; i < used_atom_cnt; i++) {
		const char *name = used_atom[i].name;
		enum atom_type atom_type = used_atom[i].atom_type;
		struct atom_value *v = &val[i];
		if (!!deref != (*name == '*'))
			continue;
		if (deref)
			name++;
		if (atom_type == ATOM_OBJECTTYPE)
			v->s = xstrdup(type_name(oi->type));
		else if (atom_type == ATOM_OBJECTSIZE) {
			if (used_atom[i].u.objectsize.option == O_SIZE_DISK) {
				v->value = oi->disk_size;
				v->s = xstrfmt("%"PRIuMAX, (uintmax_t)oi->disk_size);
			} else if (used_atom[i].u.objectsize.option == O_SIZE) {
				v->value = oi->size;
				v->s = xstrfmt("%"PRIuMAX , (uintmax_t)oi->size);
			}
		} else if (atom_type == ATOM_DELTABASE)
			v->s = xstrdup(oid_to_hex(&oi->delta_base_oid));
		else if (atom_type == ATOM_OBJECTNAME && deref)
			grab_oid(name, "objectname", &oi->oid, v, &used_atom[i]);
	}
}
```

`grab_common_values()` 在 `used_atom` 中找 `%(objecttype)`, `%(objectsize)`,`%(*objectname)`,`%(deltabase)`,如果找到了则将对象对应的数据填充到中间数据 `v->s` 中。

`grab_values()` 同理，只是分的更加细致，对每一种类型的对象都有不同的处理方式。


### 总结

`git for-each-ref` 分成以下三步：
1. `verify_ref_format()` 解析格式串并存储格式解析结果。
2. 遍历引用数据，使用`format_ref_array_item()` 中再次解析格式串，将每一个引用的每一个解析原子的对应数据拷贝到中间数据。
3. 将中间数据拷贝到最终缓冲区进行输出。

#### 优点
1. 将解析格式和获取对象数据的步骤解耦。
2. 获取对象数据“懒惰”求值，减少重复解析。

#### 缺点
1. 格式串解析分成两次，值得优化。
2. 由于需要中间数据，因此需要大量的内存分配和拷贝，值得优化。


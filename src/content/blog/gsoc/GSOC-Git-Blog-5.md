---
title: 'GSOC, Git Blog 5'
titleZh: "GSOC，Git 博客 5"
date: 2021-06-21 00:45:06
tags: git
---

<div class="lang-section" data-lang="en">

## Week5: Tempting apple

This week, I spent a lot of time working on the digital circuit course design of the school. So this week's patches for git was completed in a hurry. This week `Ævar Arnfjörð Bjarmason` gave a lot of useful suggestions for the patch I wrote earlier. Some are related to code style improvements, and some are better design ideas.

Before, I wanted to use a `<s, s_size>` style string in `atom_value` to help copy and compare data containing '\0'.

Like this:

```c
struct atom_value {
const char *s;
size_t s_size;
...
};
```

But `Ævar Arnfjörð Bjarmason` thinks it is more reasonable to use `strbuf` instead of `<s, s_size>`.

Like this:

```c
struct atom_value {
struct strbuf s;
...
};
```

Since the `strbuf` API has a natural `<s, s_size>`, we can add data that may contain '\0' through `strbuf_add()`,`strbuf_addbuf()`, and `strbuf_addf()` can also be used to fill strbuf with format string. Use `strbuf_addstr()` to replace `xstrdup()`, `strbuf_add()` to replace `xmemdupz()`, this is indeed a very tempting choice.

But in my actual refactoring process, this is not very easy to achieve.

For example, the original interface is like this,

```c
v->s = copy_email(wholine, &used_atom[i]);
```

`v->s` will be filled with the data dynamically allocated by `copy_email()`.

```c
static const char *copy_email(const char *buf, struct used_atom *atom)
{
...
if (!eoemail)
return xstrdup("");
return xmemdupz(email, eoemail - email);
}
```

Then if we want use `strbuf` type `v->s`, we should change the `copy_email()` interface parameters and return value.

```c
static void copy_email(struct strbuf *str, const char *buf, struct
used_atom *atom)
{
...
if (!eoemail)
return;
return strbuf_add(str, email, eoemail - email);
}
```

Then the caller can do:

```c
copy_email(&v->s, wholine, &used_atom[i]);
```

This is in line with our expectations.

But something like `fill_remote_ref_details()`, things gradually become complicated and difficult. Just consider the `show_ref()` called in `fill_remote_ref_details()`, `show_ref()` may call `shorten_unambiguous_ref()` internally, and
then another function is called internally in `shorten_unambiguous_ref()`... This makes us fail the method of passing `v->s` in parameters like `copy_email()` does. Another way of thinking: what if I can "attach" the data directly? Using `strbuf_attach()` may be a viable option, but...

```c
size_t len;
void *data = shorten_unambiguous_ref(refname, warn_ambiguous_refs);
len = strlen(data);
strbuf_attach(&str, data, len, len);
```

...we need to get the length of the data, but this is not easy to do, `strlen()` can only be used on data that does not contain '\0', and we are not sure whether a function like `shorten_unambiguous_ref()` will return a `NULL`.

Well, this is one of the reasons why I cannot move on.

On the other hand, look at the following piece of code, it appears in `populate_value()`.

```c
for (i = 0; i < used_atom_cnt; i++) {
struct atom_value *v = &ref->value[i];
if (v->s == NULL && used_atom[i].source == SOURCE_NONE)
return strbuf_addf_ret(err, -1, _("missing object %s for %s"),
oid_to_hex(&ref->objectname), ref->refname);
}
```

We need to determine whether `v->s` equals to `NULL`. We can use c-style strings to easily distinguish between empty strings(`xstrdup("")`) and `NULL`, but if we use strbuf, it is not easy to distinguish, because an empty strbuf has the following characteristics: `s.buf == strbuf_slopbuf` or `sb->buf[0] == '\0'`. It can be said that we shouldn’t even use `NULL` to assign to `s.buf`.

So in the end, I rejected this seemingly very attractive solution, and use the previous strategy: `<s, s_size>`, unless someone can think of a better solution later `;-)`.

* FootNote:
1. Why is there no `strbuf_empty()` in `strbuf` API? I think this may be a very important thing.

```c
#define strbuf_empty(sb) \
(sb->buf == strbuf_slopbuf) ? \
(!strbuf_slopbuf[0]) : \
(sb->buf[0] == '\0')
```

2. Another thing worth mentioning is: I will have the school final exam between July 7th and July 14th, I may be busy during this period.

Thanks for Git community, reviewers and mentors.
--
ZheNing Hu

</div>

<div class="lang-section" data-lang="zh">

## 第五周：诱人的苹果

这周，我花了很多时间做学校的数字电路课程设计。所以这周给 git 的补丁完成得比较匆忙。这周 `Ævar Arnfjörð Bjarmason` 对我之前写的补丁提了很多有用的建议。有些与代码风格改进有关，有些是更好的设计思路。

之前，我想在 `atom_value` 中使用 `<s, s_size>` 风格的字符串来帮助复制和比较包含 '\0' 的数据。

像这样：

```c
struct atom_value {
const char *s;
size_t s_size;
...
};
```

但 `Ævar Arnfjörð Bjarmason` 认为用 `strbuf` 代替 `<s, s_size>` 更合理。

像这样：

```c
struct atom_value {
struct strbuf s;
...
};
```

由于 `strbuf` API 天然带有 `<s, s_size>`，我们可以通过 `strbuf_add()`、`strbuf_addbuf()` 来添加可能包含 '\0' 的数据，而且 `strbuf_addf()` 也可以用来填充格式字符串到 strbuf。用 `strbuf_addstr()` 替换 `xstrdup()`，用 `strbuf_add()` 替换 `xmemdupz()`，这确实是一个非常诱人的选择。

但在我的实际重构过程中，这并不是很容易实现。

例如，原来的接口是这样的，

```c
v->s = copy_email(wholine, &used_atom[i]);
```

`v->s` 会被 `copy_email()` 动态分配的数据填充。

```c
static const char *copy_email(const char *buf, struct used_atom *atom)
{
...
if (!eoemail)
return xstrdup("");
return xmemdupz(email, eoemail - email);
}
```

那么如果我们想用 `strbuf` 类型的 `v->s`，就需要改变 `copy_email()` 的接口参数和返回值。

```c
static void copy_email(struct strbuf *str, const char *buf, struct
used_atom *atom)
{
...
if (!eoemail)
return;
return strbuf_add(str, email, eoemail - email);
}
```

然后调用者可以这样做：

```c
copy_email(&v->s, wholine, &used_atom[i]);
```

这符合我们的预期。

但像 `fill_remote_ref_details()` 这样的情况，事情逐渐变得复杂和困难。仅考虑 `fill_remote_ref_details()` 中调用的 `show_ref()`，`show_ref()` 内部可能会调用 `shorten_unambiguous_ref()`，而 `shorten_unambiguous_ref()` 内部又会调用另一个函数……这使我们无法像 `copy_email()` 那样通过参数传递 `v->s`。换一种思路：如果我能直接“附加”数据呢？使用 `strbuf_attach()` 可能是一个可行的选择，但……

```c
size_t len;
void *data = shorten_unambiguous_ref(refname, warn_ambiguous_refs);
len = strlen(data);
strbuf_attach(&str, data, len, len);
```

……我们需要获取数据的长度，但这并不容易，`strlen()` 只能用于不包含 '\0' 的数据，而且我们不确定像 `shorten_unambiguous_ref()` 这样的函数是否会返回 `NULL`。

好吧，这是我无法继续推进的原因之一。

另一方面，看看下面这段代码，它出现在 `populate_value()` 中。

```c
for (i = 0; i < used_atom_cnt; i++) {
struct atom_value *v = &ref->value[i];
if (v->s == NULL && used_atom[i].source == SOURCE_NONE)
return strbuf_addf_ret(err, -1, _("missing object %s for %s"),
oid_to_hex(&ref->objectname), ref->refname);
}
```

我们需要判断 `v->s` 是否等于 `NULL`。我们可以用 C 风格字符串轻松区分空字符串（`xstrdup("")`）和 `NULL`，但如果使用 strbuf，就不容易区分，因为空 strbuf 具有以下特征：`s.buf == strbuf_slopbuf` 或 `sb->buf[0] == '\0'`。甚至可以说，我们根本不应该用 `NULL` 赋值给 `s.buf`。

所以最终，我拒绝了这个看似非常有吸引力的方案，转而使用之前的策略：`<s, s_size>`，除非以后有人能想到更好的解决方案 `;-)`。

* 脚注：
1. 为什么 `strbuf` API 中没有 `strbuf_empty()`？我认为这可能是一件很重要的事。

```c
#define strbuf_empty(sb) \
(sb->buf == strbuf_slopbuf) ? \
(!strbuf_slopbuf[0]) : \
(sb->buf[0] == '\0')
```

2. 另一件值得一提的事是：我将在 7 月 7 日至 7 月 14 日之间有学校期末考试，这段时间我可能会比较忙。

感谢 Git 社区、审阅者和导师们。
--
ZheNing Hu

</div>
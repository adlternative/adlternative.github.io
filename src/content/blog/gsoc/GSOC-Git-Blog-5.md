---
title: 'GSOC, Git Blog 5'
date: 2021-06-21 00:45:06
tags: git
---

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
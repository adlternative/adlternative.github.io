---
title: git对象浅析
date: 2020-12-24 18:52:42
tags: git
---

git 中有个叫做`.git/objects`的文件夹被称为git的数据库或者对象库,里面存在着好多以两位十六进制的目录如`29`和目录中会有一些文件,文件名是`01e239516f4f92d0612c892e3cafc20d580c75 `,那么这些文件是什么呢?

这是git中的对象,有四种基本类型:`blob`,`tree`,`commit`,`tag`



我们通过`cat .git/objects/29/1e2d038385561d391d6930842e3d21e5815a7b `试图查看文件内容,不好!是一群乱码,那有什么方法可以查看这个文件呢?我们通过` git cat-file -t 291e2d0`查看可以这个文件对应的对象类型是`commit`,`git cat-file commit 291e2d0`可以看到
```
tree 191a0c665b4014797d08340ae38ff662e604e516
parent d550451a7c8ca1922516e77601bc2cc6ccd90ac9
author adl <1607364851@qq.com> 1608040544 +0800
committer adl <1607364851@qq.com> 1608040544 +0800

Site updated: 2020-12-15 21:55:44
```
tree代表这个提交对象对应的目录树,后面是它的哈希值
parent代表这个提交对象对应的父提交,后面是它的哈希值(父提交可能有俩个:通过合并)
author和committer是作者和提交者,空一行,后面是你的提交信息

因为git程序可以快速通过hash索引到tree和parent,这个hash就像c的指针一样灵活.我们同样使用`git cat-file -p 191a0c665b4014797d08340ae38ff662e604e516`我们就可以快速查看对应目录tree对象的内容:
```
040000 tree 41b51f3c06478abd64e1cbd809a2da9229ac0df8    archives
040000 tree c230503923d78645128246adaa63117d1f4d0f7d    css
040000 tree b1b06b479c63c5360585c3ab8c1336b5f50c184e    hello-world
040000 tree ff63508d6bbec7d95d295162bcb2945a8866282a    how-to-use-a-irc-chatroom
040000 tree 1816e8fa690cd7d035136a534d3bb5d9a4133ca4    img
100644 blob 22ae76e0629471b82e158ed47c2b714068d9c39c    index.html
040000 tree a2c7fc36b7e9a46ec56a253f97df274e92f6b0d4    js
040000 tree 9de1b743365421ce7818f097228c7ddf281e5bef    "\345\256\211\347\232\204\346\203\212\345\245\207\345\216\206\351\231\251"
040000 tree d7cb4246762ecbdd2ab93363c5baec2ca8ab81b1    "\346\210\221\347\232\204git\345\255\246\344\271\240\344\271\213\350\267\257"
040000 tree 105678790c05347e23fac1c6bf83fa66172bb42f    "\351\202\243\344\272\233\346\210\221\347\217\215\350\227\217\345\267\262\344\271\205\347\232\204\347\275\221\347\253\231\346\210\226\350\200\205\350\265\204\346\272\220\344\273\254"
```
里面每一列分别是目录树中每一项的权限,类型,哈希值,文件名
这些tree类型的对象是一些子树,它们都拥有它们自己的目录树,里面同样是一些文件和目录

总算注意到了blob类型的对象,`blob`本意墨水,这里指代的就是单一的文件对象,
`git cat-file -p 22ae76e` :
```
git cat-file -p 22ae76e
<!DOCTYPE html><html lang="en" data-theme="light"><head><meta charset="UTF-8"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="viewport" content="width=device-width,initial-scale=1"><title>阿德烈的惊奇历险 - adl is your father</title><meta name="author" content="阿德烈"><meta name="copyright" content="阿德烈"><meta name="format-detection" content="telephone=no"><meta name="theme-color" content="#ffffff"><meta http-equiv="Cache-Control" content="no-transform"><meta http-equiv="Cache-Control" content="no-siteapp"><meta name="description" content="阿德烈将会成为一名绝地">
<meta property="og:type" content="website">
<meta property="og:title" content="阿德烈的惊奇历险">
...

```

可以看到这个真实的普通文件内容

还剩tag对象:

通过`git tag -a v1.4 -m "my version 1.4"`生成,在`.git/refs/tags/v1.4`可以看到一串hash`254571375f2a56e67ce188b6116ea9bdd77cbdbc `
```
git cat-file -p 254571375f2a56e67ce188b6116ea9bdd77cbdbc
object 0d6b00b5597013767a52b020de6d0e03a75763e1
type commit
tag v1.4
tagger ZheNing Hu <adlternative@gmail.com> 1608809095 +0800

my version 1.4
```
可以发现这个tag对象存储的内容是
它所指向的提交对象的hash,对象类型,标签名,标记者,标记信息
再`git cat-file -p 0d6b00`,就是我们标记时的commit提交


我们可以推测:git底层靠着文件内容生成哈希,再将文件内容和类型信息压缩存入到对应哈希的`.git/objects/xx/xxxxxxx...`的位置,接着git再生成目录树存储各个blob对象和子树的hash和信息,接着提交的时候再记录最顶端树的hash,和当前HEAD提交的hash,我们整条git仿佛通过hash联系在一起,不愧linus当初说做git是为了实现一个文件系统

通过hash(指针),数据库存放的四种对象(类),HEAD(引用),git能够在客户端实现高效的版本控制


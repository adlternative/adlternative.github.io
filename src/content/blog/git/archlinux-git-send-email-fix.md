---
title: 'Fixing git send-email issues on Arch Linux'
titleZh: 'archlinux上的git_send_email问题的解决方案'
date: 2020-12-18 21:53:12
tags: git
---

<div class="lang-section" data-lang="en">

* No fluff — it's hard to configure.
1. Edit `~/.gitconfig`:
```
[sendemail]
        smtpserver = <smtp.gmail.com>
        confirm = auto
        smtpencryption=tls
        smtpserver=smtp.gmail.com
        smtpuser=adlternative@gmail.com
        smtpserverport=587
```
2. In Gmail settings, enable access for less secure apps and turn on POP and IMAP, [here](https://mail.google.com/mail/u/0/#settings/fwdandpop).
3. Fix [bug1](https://bugs.archlinux.org/task/20923) and [bug2](https://bugs.archlinux.org/task/62948): they require installing `perl-io-socket-ssl`, `perl-mime-tools`, and `perl-authen-sasl` with pacman.
4. When running `git send-email` in the terminal, use a proxy: `proxychains4 git send-email --smtp-debug=1   --to=adlternative@gmail.com adl/*.patch `
5. Enter your password when prompted, and the email should be sent successfully!

</div>

<div class="lang-section" data-lang="zh">

* 不说废话,难配置
1. 修改~/.gitconfig
```
[sendemail]
        smtpserver = <smtp.gmail.com>
        confirm = auto
        smtpencryption=tls
        smtpserver=smtp.gmail.com
        smtpuser=adlternative@gmail.com
        smtpserverport=587
```
2. 在gmail的配置里面修改安全性较低的应用访问权限启用,并配置启用pop和imap,[在这](https://mail.google.com/mail/u/0/#settings/fwdandpop)
3. 修复[bug1](https://bugs.archlinux.org/task/20923)
 [bug2](https://bugs.archlinux.org/task/62948)
 分别要求下载 `perl-io-socket-ssl`,`perl-mime-tools`和`perl-authen-sasl`,使用pacman安装
4. 终端`git send-email`的时候要开代理`proxychains4 git send-email --smtp-debug=1   --to=adlternative@gmail.com adl/*.patch `
5. 发邮件的时候输入个密码,然后应该就发送成功了！

</div>

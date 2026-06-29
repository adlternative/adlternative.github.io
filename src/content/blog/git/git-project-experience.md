---
title: 'Git Project Experience Notes'
titleZh: 'git项目经验积累'
date: 2020-12-23 17:14:35
tags: git
draft: true
---

<div class="lang-section" data-lang="en">

****
git ls-files
****

-d deleted
-m modified (includes -d content)

-s show mode bits, object name, and stage number of staged contents in the output

-u show unmerged files in the output (forces –stage)



Ways to debug git:
```bash
GIT_DEBUGGER="/usr/bin/gdb --args" ./bin-wrappers/git ls-files -s
```

</div>

<div class="lang-section" data-lang="zh">

****
git ls-files
****

-d 已删除
-m 已修改（包含 -d的内容 ）

-s 在输出中显示暂存内容的模式位，对象名称和暂存号

-u 在输出中显示未合并的文件（forces –stage）



git debug 方式：
```bash
GIT_DEBUGGER="/usr/bin/gdb --args" ./bin-wrappers/git ls-files -s
```

</div>

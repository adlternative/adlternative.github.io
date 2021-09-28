---
title: golang-pprof-learning
date: 2021-09-27 21:38:15
tags: golang
hidden: true
---

```go
import (
	"net/http"
	_ "net/http/pprof"
)

```

检测堆栈内存分配:
```
curl -sK -v http://localhost:8080/debug/pprof/heap > heap.out
go tool pprof -http=:8060 heap.out
```

检查阻塞
```
http://127.0.0.1:8080/debug/pprof/goroutine?debug=1
http://127.0.0.1:8080/debug/pprof/goroutine?debug=2
```
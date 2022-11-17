---
title: boost asio stack-less coroutine learn
date:  2021-06-13 18:18:02
tags:  cpp
---
### 协程是什么
维基百科中的定义：协程（英语：coroutine）是计算机程序的一类组件，推广了协作式多任务的子程序，允许执行被挂起与被恢复。协程在 Golang 语言中甚至有了语言层面的协程支持，如今，协程终于被添加到 c++20 中。但是在它之前，各种各式各样的 c++ 协程被实现出来，以满足大量 IO 的网络业务。boost 的 asio 网络库中就使用了无栈协程和有栈协程两种协程，本文将简单描述 asio中无栈协程部分的实现内容。

### 无栈协程是什么
线程切换包含如寄存器和线程私有栈，线程私有数据等上下文之间的保存和恢复，以及用户态和内核态的切换。协程有比线程有更加小的切换开销：有栈协程切换的过程中只需要切换协程栈，寄存器环境等上下文，而像 asio 中实现的无栈协程则更为粗暴，将协程状态（只是一个 int 类型的变量用于记录当前执行的“位置”）保存到 coroutine 对象的成员中，通过让函数返回进行切出和通过调用函数并跳转到之前
保存的”位置“进行恢复。无栈协程和有栈协程的区别在于无栈协程不将当前的执行流的状态和上下文保存在栈上，可以选择保存到堆，静态区（全局变量或者局部静态变量中）或者其他地方。因此从某种意义上说，无栈协程相比有栈协程的开销更小，当然权衡之下无栈协程的局限性也会比有栈协程更大，就比如无法支持局部变量；代码的侵入性也比较强：协程的切出（yield）只能在协程的“顶级函数”… 第一次听到这些限制的时候经常会听的云里雾里，所以我们有必要去扣下无栈协程的实现细节：

### 实现细节
受到了达夫设备利用 swtich 语句“掉落”特性的启发，asio的作者设计了以下的几个关键字来实现协程的功能：

`reenter`
  该 `reenter` 宏用于定义协程的主体。它接受一个参数：一个指向协程对象的指针或引用。
`yield`
  切出协程，分成四步：
  1. 保存协程的当前状态。
  2. 执行 `yield` 语句中的操作（可以是一个异步函数 也可以是一个函数返回语句，也可以为空）。
  3. 恢复点定义在 `yield` 语句之后。
  4. 控制权转移到协程体尾部。
`fork`
  分裂出“父子”协程，分成四步:
  1. 保存协程的当前状态。
  2. 执行 `fork` 语句中的操作（往往是复制当前的协程对象并调用当前协程函数，子协程会在其中运行）
  3. 恢复点定义在在 `fork` 语句之后。
  4. 对于父协程，控制流就从 `fork` 下一行开始。

### `reenter` 和 `yield`
`reenter` 和 `yield` 大致使用方式是在一个继承了 `coroutine` 的类
的函数中调用以下代码：
```cpp
Cls::func() {
    reenter (this)
    {
        yield { /* do async task reqest */ }
        /* do something */
        yield return x;
        /* do something */
        yield return y;
        /* do something */
    }
}
```
我们在 `reenter` 中如果想要执行异步任务或者想要主动切出的时候可以调用 `yield`，`yield` 会在执行了其语句中的操作后切出协程函数，下一次程序显示执行该协程对象的该函数（这里是 `Cls::func()` ）的时候会返回到切出点继续执行后面的语句。

### `reenter` 和 `fork`
`reenter` 和 `fork` 大致使用方式在一个继承了 `coroutine` 的类的函数中调用以下代码：
```cpp
Cls::func() {
    reenter (this)
    {
        do
        {
            /* do something */
            fork Cls(*this).func();
    } while (is_parent());
    /*  ... Sub CoRoutine handling follows ... */
    }
}
```
在 `fork` 处开启子协程（注意这里是复制了当前对象）并执行当前函数，子协程和父协程会通过对于 `is_parent()`，`is_child()`的判断解耦开。但是值得注意的是，`asio` 协程默认是让子协程先执行，子协程在遇到 `yield` 或者结束后才会执行父协程的逻辑，但不用担心：子协程一般会是非阻塞代码，父协程在协作中可能会有些吃亏，但仍然会有执行的机会。

* QUE: 子协程切到父协程之后什么时候才会重新轮到子协程执行呢？
* ANS: 子协程在执行 `yield` 的时候往往会绑定一个异步回调函数（而且很可能会是当前的协程函数），由于 `asio` 采用的是`Proactor` 模型，该回调函数会在 `asio` 内部实现检测到相关事件并执行完其处理流程后执行回调函数也就是子协程的当前协程函数，在 `reenter` 检查协程状态后，我们又可以顺利的在子协程原有切出位置之后继续执行。但如果没有`yield`的时候没有执行异步函数，而是直接返回了，那么就必须依赖函数的调用方再次调用该对象的该函数，来显式切回子协程。

使用效果
使用协程，我们可以将很多异步的代码写得比较像同步的代码，不需要去维护复杂的状态机了，看下面 `asio` 中两种 `HTTP` 解析的例子，是不是感觉使用了协程后异常的清爽：

状态机

```cpp
boost::tribool request_parser::consume(request &req, char input) {
  switch (state_) {
  case method_start:
    if (!is_char(input) || is_ctl(input) || is_tspecial(input)) {
      return false;
    } else {
      state_ = method;
      req.method.push_back(input);
      return boost::indeterminate;
    }
  case method:
    if (input == ' ') {
      state_ = uri;
      return boost::indeterminate;
    } else if (!is_char(input) || is_ctl(input) || is_tspecial(input)) {
      return false;
    } else {
      req.method.push_back(input);
      return boost::indeterminate;
    }
  case uri:
    if (input == ' ') {
      state_ = http_version_h;
      return boost::indeterminate;
    } else if (is_ctl(input)) {
      return false;
    } else {
      req.uri.push_back(input);
      return boost::indeterminate;
    }
  case http_version_h:
    if (input == 'H') {
      state_ = http_version_t_1;
      return boost::indeterminate;
    } else {
      return false;
    }
  ...
```

无栈协程
```cpp
boost::tribool request_parser::consume(request& req, char c)
{
  reenter (this)
  {
    req.method.clear();
    req.uri.clear();
    req.http_version_major = 0;
    req.http_version_minor = 0;
    req.headers.clear();
    req.content.clear();
    content_length_ = 0;

    // Request method.
    while (is_char(c) && !is_ctl(c) && !is_tspecial(c) && c != ' ')
    {
      req.method.push_back(c);
      yield return boost::indeterminate;
    }
    if (req.method.empty())
      return false;

    // Space.
    if (c != ' ') return false;
    yield return boost::indeterminate;

    // URI.
    while (!is_ctl(c) && c != ' ')
    {
      req.uri.push_back(c);
      yield return boost::indeterminate;
    }
    if (req.uri.empty()) return false;

    // Space.
    if (c != ' ') return false;
    yield return boost::indeterminate;

    // HTTP protocol identifier.
    if (c != 'H') return false;
    yield return boost::indeterminate;
    if (c != 'T') return false;
    yield return boost::indeterminate;
    if (c != 'T') return false;
    yield return boost::indeterminate;
    if (c != 'P') return false;
    yield return boost::indeterminate;
```

### `asio` 协程实现
在知道了协程的使用之后，我们还可以看看 `asio` 的协程是如何设计的，见 [boost/asio/coroutine.hpp](https://www.boost.org/doc/libs/1_76_0/boost/asio/coroutine.hpp)，核心代码不过 100 来行，就两个类 `coroutine` 和 `coroutine_ref`，靠着 `BOOST_ASIO_CORO_REENTER`， `BOOST_ASIO_CORO_YIELD_IMPL`，`BOOST_ASIO_CORO_FORK_IMPL` 三个宏和 `switch`，`case` 的黑魔法实现。

`yield.hpp` 中关于 `reenter`，`yield`，`fork` 的宏定义。

```cpp
#ifndef reenter
# define reenter(c) BOOST_ASIO_CORO_REENTER(c)
#endif

#ifndef yield
# define yield BOOST_ASIO_CORO_YIELD
#endif

#ifndef fork
# define fork BOOST_ASIO_CORO_FORK
#endif
```

然后我们看 `coroutine.hpp` 中更加细致的实现：

* `coroutine`
作为向外界提供的协程类，内部仅仅维护一个表示状态的 `value_`，
通过 `value_` 的正负来判断父子协程；

```cpp
class coroutine
{
public:
  /// Constructs a coroutine in its initial state.
  coroutine() : value_(0) {}

  /// Returns true if the coroutine is the child of a fork.
  bool is_child() const { return value_ < 0; }

  /// Returns true if the coroutine is the parent of a fork.
  bool is_parent() const { return !is_child(); }

  /// Returns true if the coroutine has reached its terminal state.
  bool is_complete() const { return value_ == -1; }

private:
  friend class detail::coroutine_ref;
  int value_;
};
```

* `coroutine_ref`
内部实现中的协程引用类，通过在构造函数传参来记录并修改协程类的状态。

```cpp
class coroutine_ref
{
public:
  coroutine_ref(coroutine& c) : value_(c.value_), modified_(false) {}
  coroutine_ref(coroutine* c) : value_(c->value_), modified_(false) {}
  ~coroutine_ref() { if (!modified_) value_ = -1; }
  operator int() const { return value_; }
  int& operator=(int v) { modified_ = true; return value_ = v; }
private:
  void operator=(const coroutine_ref&);
  int& value_;
  bool modified_;
};
```

* `BOOST_ASIO_CORO_REENTER(c)`

```cpp
#define BOOST_ASIO_CORO_REENTER(c) \
  switch (::boost::asio::detail::coroutine_ref _coro_value = c) \
    case -1: if (_coro_value) \
    { \
      goto terminate_coroutine; \
      terminate_coroutine: \
      _coro_value = -1; \
      goto bail_out_of_coroutine; \
      bail_out_of_coroutine: \
      break; \
    } \
    else /* fall-through */ case 0:
```

这个宏通过一个 `switch` `case` 作为协程的入口，`switch` 中 协程引用对象 `_coro_value` 的构造函数将会以协程对象 c 作为参数，在后续的一系列的 `case` 中读或者修改该协程引用对象的内容（间接修改协程对象状态本身）。

`case 0` 是协程第一次运行的情况 ， `case -1` 则是协程运行结束的情况，其中的 `terminate_coroutine` 标签和 `bail_out_of_coroutine` 标签值得注意，前者是表示协程已经终止，所以将协程状态设置为 `-1`，后者是表示协程即将切出，其实就是用一个 `break` 跳出 `switch`，之后我们在 `yield` 中可能会跳到这里。

* `BOOST_ASIO_CORO_YIELD_IMPL(n)`

```cpp
#define BOOST_ASIO_CORO_YIELD_IMPL(n) \
  for (_coro_value = (n);;) \
    if (_coro_value == 0) \
    { \
      case (n): ; \
      break; \
    } \
    else \
      switch (_coro_value ? 0 : 1) \
        for (;;) \
          /* fall-through */ case -1: if (_coro_value) \
            goto terminate_coroutine; \
          else for (;;) \
            /* fall-through */ case 1: if (_coro_value) \
              goto bail_out_of_coroutine; \
            else /* fall-through */ case 0:

```

由于 `yield` 宏其实等价于 `BOOST_ASIO_CORO_YIELD_IMPL(__LINE__)`，因此在这个宏的实现中，`for` 循环中让`_coro_value = __LINE__`（这就是所谓的协程状态，一个行号），我们不会通过 `_coro_value == 0` 的判断，在 `else` 中，我们可以看到又有一个 关于 `_coro_value` 的 `switch`，正常情况下会进入 `case 0`执行我们 `yield` 语句中的剩余操作，然后像达夫装置中那样 `fall-through` 到 上面最近的那个` for(;;)`，跳转到 `bail_out_of_coroutine` 标签，从而 靠`break`跳出最外层的 switch，也就是跳出协程，此时协程结构体内部记录着刚才执行 yield 的行号，在我们下一次调用 `reenter` 的时候 `switch` 会让我们跳到 `case(__LINE__)`，也就是 `BOOST_ASIO_CORO_YIELD_IMPL(n)` 中的 `case (n)`，从上面的 `for` 循环 `break` 出去，执行 `yield` 之后的逻辑。

* `BOOST_ASIO_CORO_FORK_IMPL(n)`

```cpp
#define BOOST_ASIO_CORO_FORK_IMPL(n) \
  for (_coro_value = -(n);; _coro_value = (n)) \
    if (_coro_value == (n)) \
    { \
      case -(n): ; \
      break; \
    } \
    else
```
`fork` 也类似，`fork == BOOST_ASIO_CORO_FORK_IMPL(__LINE__)`，`for` 循环首先让 协程状态设置为 `__LINE__` 的相反数，然后执行 `else` 后面的操作（一般是开启子协程函数），子协程 `yield` 或者结束后，父协程开始执行也就是执行`break` 跳出 `for` 循环，但是对于父协程和子协程的具体逻辑则留给了程序员们自己实现（结合` is_child()`，`is_parent()`）。

### 总结
最后我们回过头来看这个无栈协程究竟在做什么：需要切出时将协程状态，也就是行号记录到协程对象的成员中，之后调用该对象的协程函数就可以切换到该行继续执行。

由于 `goto` 可能会跳过局部变量的声明，而且我们下一次调用协程函数的时候局部变量也不再和之前相同，因此在 `asio` 实现的这个无栈协程中我们得规避使用局部变量。

而且由于协程通过一个函数中的 `switch`，`case` 实现的，所以也印证了之前说协程的切换只能在协程的“顶层函数”执行的结论。

好吧，尽管这个无栈协程的限制很多，但是在一些高性能的特定场景下，会可能就会通过无栈协程的黑魔法来进行优化。

### 参考
* [https://www.boost.org/doc/libs/1_76_0/doc/html/boost_asio/reference/coroutine.html](https://www.boost.org/doc/libs/1_76_0/doc/html/boost_asio/reference/coroutine.html)
* [https://www.boost.org/doc/libs/1_76_0/boost/asio/coroutine.hpp](https://www.boost.org/doc/libs/1_76_0/boost/asio/coroutine.hpp)
* [https://www.boost.org/doc/libs/1_76_0/doc/html/boost_asio/examples/cpp03_examples.html](https://www.boost.org/doc/libs/1_76_0/doc/html/boost_asio/examples/cpp03_examples.html)
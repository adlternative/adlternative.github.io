---
title: "I Tried video-use, and Codex Started Pedaling Tokens"
titleZh: "我试了 video-use，然后 Codex 开始乱蹬 Token"
date: 2026-09-02 22:00:00
tags: [ai, agent, video, video-use, codex, qoder]
---

<div class="lang-section" data-lang="en">

Today I tried [video-use](https://github.com/browser-use/video-use), the open-source video-editing skill from the Browser Use team. I did not give it a cinematic interview or a folder of travel footage. I gave it a deliberately rambling Chinese voiceover about Codex burning tokens and asked it to turn that into a video.

The result eventually became a 21.5-second animation in which Codex rides a bicycle so hard that the context window starts smoking. Then I replaced Codex with Qoder's little yellow duck.

<figure style="margin: 2rem 0;">
  <video controls playsinline preload="metadata" poster="/images/video-use/qoder-bike.jpg" style="display:block;width:100%;border-radius:8px;border:1px dashed var(--fg, lime);">
    <source src="/videos/video-use/qoder-pedals-token.mp4" type="video/mp4" />
  </video>
  <figcaption style="margin-top:.6rem;text-align:center;opacity:.75;">The final Qoder cut: 1280×720, 18 fps, 21.5 seconds.</figcaption>
</figure>

## The clever part of video-use is that it barely watches video

A naive video agent could dump every frame into a vision model. That is an excellent way to turn a short clip into millions of mostly redundant tokens.

video-use takes the Browser Use idea and applies it to editing: give the model a structured surface instead of raw pixels. Audio goes through ElevenLabs Scribe for word-level timestamps. Those timestamps become a compact `takes_packed.md`. When the model actually needs visual context, `timeline_view.py` produces a filmstrip with waveform and word labels for just that time range.

The working loop is pleasantly boring:

```text
ffprobe → transcript → takes_packed.md → EDL → ffmpeg render → self-eval
```

The transcript is the primary view. The pictures are fetched only at decision points. An `edl.json` records which source ranges survive, and the renderer extracts and concatenates them with short audio fades at each boundary. Source footage stays untouched; everything goes under `edit/`.

That is much closer to how a coding agent likes to work: inspect small text artifacts, write a deterministic plan, run ordinary tools, then verify the output.

## I started with a bad take on purpose

My first voiceover was 34.42 seconds of synthetic speech, complete with filler, repetition, and a correction:

> 大家好，今天给大家介绍一个新东西。嗯……对，就是那个，那个 Codex。Codex 可厉害了，它，猛蹬 token……哗哗的，哗哗的。呃，不对，是嗖嗖的。

Scribe returned 131 word-level records. video-use packed them, chose seven ranges in the EDL, and produced a 26.57-second cut. Roughly 7.8 seconds of hesitation disappeared without me dragging a playhead around.

```text
34.42s raw take
  → 131 timestamped word records
  → 7 kept ranges
  → 26.57s edited cut
```

The edit was technically correct. It was also a voiceover playing over a static confetti title card. The joke said that Codex was pedaling, but nothing on screen was pedaling. This was a video-editing success and a comedy failure.

## So I made Codex actually pedal

I rewrote the narration into a much tighter story:

> A task arrives. Codex looks at it: easy. Then it gets on the token bicycle and starts pedaling. One thousand, one hundred thousand, five hundred thousand. The code grows line by line; the tokens burn bucket by bucket. Context at 78 percent — keep pedaling. 92 percent — still pedaling. 96 percent — the window is smoking. It only says: auto-extend. 1.2 million tokens. Task complete.

Instead of opening a traditional editor, the agent took video-use's simplest animation route: Pillow, an image sequence, and FFmpeg. At 1280×720 and 18 fps, 21.5 seconds is just 387 deterministic frames.

The animation became six small scenes:

1. a new task lands in front of the Codex logo;
2. Codex rides through a token city while the pedal RPM climbs;
3. code and terminal panels fill up as the token counter accelerates;
4. the context gauge moves from 78% to 92% to 96% and starts smoking;
5. `AUTO EXTEND` fires in a hyperspace burst;
6. `1.2M TOKENS` lands as the punchline.

Pillow drew the wheels, spokes, skyline, gauges, coins, smoke, gradients, and mascot. FFmpeg turned the frames into H.264 and combined them with the 20.42-second narration and a 21.5-second sound-effects bed.

This is the point where video-use feels less like an automatic Premiere clone and more like an editing protocol for coding agents. Once the story is represented as files, timestamps, and code, the agent can invent a shot with the same tools it uses to build a web page.

## Recasting Codex as the Qoder duck

The first version used the purple Codex mark everywhere. I then asked for one change: replace it with Qoder's little yellow duck.

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;margin:2rem 0;">
  <figure style="margin:0;">
    <img src="/images/video-use/codex-bike.jpg" alt="Codex mascot riding the generated token bicycle" style="display:block;width:100%;border-radius:8px;" />
    <figcaption style="margin-top:.4rem;text-align:center;opacity:.75;">Before: Codex.</figcaption>
  </figure>
  <figure style="margin:0;">
    <img src="/images/video-use/qoder-bike.jpg" alt="Qoder yellow duck riding the generated token bicycle" style="display:block;width:100%;border-radius:8px;" />
    <figcaption style="margin-top:.4rem;text-align:center;opacity:.75;">After: Qoder's duck.</figcaption>
  </figure>
</div>

The official duck was already inside the installed Qoder app. I extracted the yellow/orange silhouette from `qoduck-dark.png`, kept the black eyes and eyebrow, and saved it as a transparent PNG. The source-backed half was easy: change the shared logo asset in the Pillow renderer and regenerate the frames.

The first export exposed a classic incomplete rename: the mascot was Qoder, but the intro still said `CODEX`, while the code panel still contained `import codex` and `codex.reason()`. Then playback exposed a second bug: Arial did not contain the Chinese glyphs, so captions appeared as rows of square boxes. The source-backed strings became `qoder`, and every generated Chinese label moved to Hiragino Sans GB. A brand swap is not done when only the image changes; a caption is not done when the font cannot draw it.

The first seven seconds were less elegant. Their original renderer was no longer present; only the finished frames survived. I extracted the first 126 frames, found the purple mascot using a color mask, eroded away the thin purple radar lines, used the largest remaining component to recover the mascot's scale and horizontal movement, erased the old mark, and composited the duck over it. I rebuilt the baked-in labels as `QODER 接到任务`, `看起来很简单`, and `猛蹬 TOKEN 进行中`. During the white-flash transitions, I tinted both the duck and the new text with the same flash color so neither looked pasted on afterward.

Then I rendered the remaining frames from source, reused the original AAC track, and ran a full decode check. Not a glamorous edit, but a useful reminder: programmatic video is still source code. Keep the renderer, not just the MP4.

## Why does this bicycle look so familiar?

While watching the result, I kept thinking about Simon Willison's recurring [pelican riding a bicycle](https://simonwillison.net/2024/Oct/25/pelicans-on-a-bicycle/) benchmark. His original 2024 prompt was beautifully simple:

> Generate an SVG of a pelican riding a bicycle

He tried it across 16 models because the scene was likely unusual enough to test whether a model could reason about SVG geometry rather than retrieve an existing picture.

My generated cyclist has exactly the same visual grammar as many of those results: two clean circles, a triangular frame, stick limbs that are only approximately attached to the pedals, and an oversized bird-like head floating above everything. Once the Qoder duck took the seat, the resemblance became impossible to ignore.

I am beginning to suspect that model companies have a secret bicycle optimization team. Somewhere inside every frontier-model eval suite there is a single golden bike with two circles and one triangle, and the models are hill-climbing against it :)

For the record, Simon later linked a much more serious investigation titled [Are AI labs pelicanmaxxing?](https://simonwillison.net/2026/Jul/22/are-ai-labs-pelicanmaxxing/). Dylan Castillo tested 8 animals × 6 vehicles, three times each, across seven models and found no evidence that labs had specially optimized for pelicans or bicycles. The data says no. The vibes from this Qoder cyclist still say yes.

## What I learned

video-use is interesting not because it makes an LLM stare harder at pixels. It does the opposite. It finds a representation the model can operate on cheaply: transcript for language, timeline composites for selective vision, EDL for decisions, and ordinary code for rendering.

The first pass removed filler without a timeline UI. The second pass turned a sentence into 387 animated frames. The third pass recast the lead character by changing one asset and patching the few frames whose source had gone missing.

That is a surprisingly complete video workflow for a shell-capable coding agent. Also, apparently, a surprisingly competent bicycle factory.

</div>

<div class="lang-section" data-lang="zh">

今天试了一下 Browser Use 团队开源的 [video-use](https://github.com/browser-use/video-use)。我没有给它采访素材，也没有扔进去一堆旅行视频。我给的是一段故意说得磕磕巴巴的中文旁白，内容只有一件事：Codex 烧 token，然后让它把这东西剪成视频。

最后成片变成了 21.5 秒动画：Codex 骑着自行车一路狂蹬，蹬到上下文窗口开始冒烟。然后，我又把 Codex 换成了 Qoder 小黄鸭。

<figure style="margin: 2rem 0;">
  <video controls playsinline preload="metadata" poster="/images/video-use/qoder-bike.jpg" style="display:block;width:100%;border-radius:8px;border:1px dashed var(--fg, lime);">
    <source src="/videos/video-use/qoder-pedals-token.mp4" type="video/mp4" />
  </video>
  <figcaption style="margin-top:.6rem;text-align:center;opacity:.75;">最终的 Qoder 版：1280×720，18 fps，21.5 秒。</figcaption>
</figure>

## video-use 最聪明的地方，是它几乎不「看」视频

最朴素的视频 Agent 做法，是把每一帧都扔给视觉模型。短短一个视频，很快就会膨胀成几百万个高度重复的 token。

video-use 把 Browser Use 的思路搬到了剪辑上：不要把原始像素全塞给模型，先给它一个结构化界面。音频经过 ElevenLabs Scribe，得到逐字时间戳；时间戳被压成很小的 `takes_packed.md`。只有真的需要视觉判断时，`timeline_view.py` 才为指定时间段生成胶片、波形和文字标签组合图。

整个工作流朴素得很好理解：

```text
ffprobe → transcript → takes_packed.md → EDL → ffmpeg render → 自检
```

文字稿是主视图，画面只在决策点按需读取。保留哪些片段写进 `edl.json`，渲染器按 EDL 切段、在边界加短音频淡入淡出，再拼成成片。原素材不动，所有中间产物都留在 `edit/`。

这非常符合 Coding Agent 的工作方式：读几个小文本文件，写一份确定性的计划，调用现成工具，最后检查结果。

## 我故意从一条很烂的 take 开始

第一版旁白是 34.42 秒系统合成语音，故意塞了停顿、重复和自我纠正：

> 大家好，今天给大家介绍一个新东西。嗯……对，就是那个，那个 Codex。Codex 可厉害了，它，猛蹬 token……哗哗的，哗哗的。呃，不对，是嗖嗖的。

Scribe 返回了 131 条逐字记录。video-use 把它们打包，在 EDL 里选了 7 段，最后导出 26.57 秒。大约 7.8 秒废话消失了，我一次时间轴都没拖。

```text
34.42 秒 raw take
  → 131 条带时间戳的逐字记录
  → 保留 7 段
  → 26.57 秒成片
```

技术上，这次剪辑成功了。但画面只是一张飘着彩色粒子的标题卡。嘴上说 Codex 在蹬，屏幕里没有任何东西在蹬。这是一场剪辑成功，也是一场喜剧失败。

## 那就真的让 Codex 蹬起来

我把旁白改成了一个更紧的故事：

> 一个任务进来。Codex 看了一眼：简单。然后，它坐上 token 单车，开蹬。一千，十万，五十万。代码一行行长，token 一桶桶烧。上下文百分之七十八，继续蹬。百分之九十二，还蹬。百分之九十六，窗口都快冒烟了。它只说：自动续上。一百二十万 token，任务完成。

没有打开传统剪辑器，Agent 直接走了 video-use 推荐的最简单动画路线：Pillow、图片序列、FFmpeg。1280×720、18 fps、21.5 秒，换算一下就是 387 张确定性的画面。

动画最后拆成六个小场景：

1. 新任务掉到 Codex 面前；
2. Codex 骑进 token 城市，踏频一路上涨；
3. 代码面板和终端不断填满，token 计数器开始加速；
4. 上下文仪表从 78% 跳到 92%、96%，然后冒烟；
5. `AUTO EXTEND` 在超空间里启动；
6. `1.2M TOKENS` 落下来收尾。

车轮、辐条、城市、仪表、金币、烟雾、渐变和吉祥物，全是 Pillow 一帧一帧画出来的。FFmpeg 把这些帧编码成 H.264，再混入 20.42 秒旁白和 21.5 秒音效轨。

到这里，video-use 给我的感觉已经不太像「自动版 Premiere」，更像一份给 Coding Agent 用的剪辑协议。只要故事能变成文件、时间戳和代码，Agent 就可以像写网页一样发明镜头。

## 把主演从 Codex 换成 Qoder 小黄鸭

第一版到处都是紫色 Codex Logo。随后我只提了一个要求：换成 Qoder 小黄鸭。

<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;margin:2rem 0;">
  <figure style="margin:0;">
    <img src="/images/video-use/codex-bike.jpg" alt="Codex 吉祥物骑着生成的 token 自行车" style="display:block;width:100%;border-radius:8px;" />
    <figcaption style="margin-top:.4rem;text-align:center;opacity:.75;">替换前：Codex。</figcaption>
  </figure>
  <figure style="margin:0;">
    <img src="/images/video-use/qoder-bike.jpg" alt="Qoder 小黄鸭骑着生成的 token 自行车" style="display:block;width:100%;border-radius:8px;" />
    <figcaption style="margin-top:.4rem;text-align:center;opacity:.75;">替换后：Qoder 小黄鸭。</figcaption>
  </figure>
</div>

官方小黄鸭素材已经躺在本机安装的 Qoder App 里。我从 `qoduck-dark.png` 提取出黄、橙色轮廓，保留黑色眼睛和眉毛，做成透明 PNG。有源代码的后半段很好改：把 Pillow 渲染器的共享 Logo 素材指向小黄鸭，重新跑一遍就行。

第一版导出马上暴露了一个经典的「只改了一半」问题：吉祥物已经是 Qoder，片头却还写着 `CODEX`，代码面板里也仍然是 `import codex` 和 `codex.reason()`。再播放一遍，又发现第二个问题：Arial 没有中文字形，字幕全变成了一排方框。有源码的字符串统一改成 `qoder`，所有生成的中文标签改用 Hiragino Sans GB。品牌替换不能只换图片；字体画不出来，字幕也不算完成。

前 7 秒稍微狼狈一点：当初的完整渲染脚本已经不在了，只剩成片。我先按 18 fps 抽出前 126 帧，用颜色掩码找紫色 Codex 吉祥物，再腐蚀掉细细的紫色雷达线，从最大的连通区域恢复吉祥物每帧的大小和水平位移，擦掉旧图形，再把小黄鸭贴上去。烘进画面的标签则重做成 `QODER 接到任务`、`看起来很简单` 和 `猛蹬 TOKEN 进行中`。遇到白色闪场，鸭子和新文字都要叠同样的闪光颜色，不然一眼就能看出是后贴的。

后半段从源码重渲，音频直接复用原来的 AAC，最后再做一次完整解码检查。做法不优雅，但教训很实在：程序化视频也是源码。别只留 MP4，渲染器也要留。

## 这辆自行车为什么如此眼熟？

看成片时，我一直想到 Simon Willison 文章里反复出现的 [「鹈鹕骑自行车」](https://simonwillison.net/2024/Oct/25/pelicans-on-a-bicycle/)测试。他在 2024 年给 16 个模型出的题非常简单：

> Generate an SVG of a pelican riding a bicycle

他故意选这个场景，是因为训练数据里大概率没有现成的鹈鹕自行车 SVG，可以看看模型到底会不会用 SVG 做空间和几何推理。

我这次生成出来的骑手，跟那些结果有一种完全相同的视觉语法：两个很圆的轮子，一个三角车架，几根勉强碰到脚踏板的火柴腿，上面顶着一个过大的鸟类脑袋。Qoder 小黄鸭一坐上去，就更像了。

我开始怀疑模型公司内部有一支秘密自行车优化团队。所有前沿模型的 eval 里，都藏着同一辆「两个圆加一个三角」的黄金自行车，模型每天对着它 hill-climbing :)

严谨地说，Simon 后来还专门转过一项调查：[Are AI labs pelicanmaxxing?](https://simonwillison.net/2026/Jul/22/are-ai-labs-pelicanmaxxing/)。Dylan Castillo 用 8 种动物 × 6 种交通工具，在 7 个模型上各跑 3 次，没有发现模型公司专门优化鹈鹕或自行车的证据。数据说没有；看着这只 Qoder 鸭骑车的感觉，还是说有。

## 我得到的结论

video-use 有意思，不是因为它让 LLM 更努力地盯着像素，而是因为它反过来做了减法：语言交给 transcript，少量视觉判断交给 timeline composite，剪辑决定交给 EDL，画面生成交给普通代码。

第一轮，它不用时间轴 UI 就删掉了口癖。第二轮，它把一句话展开成 387 帧动画。第三轮，它靠换一张素材和补几帧没有源码的画面，完成了主演替换。

对于一个能运行 shell 的 Coding Agent，这已经是一套相当完整的视频工作流了。顺便还是一座出乎意料地成熟的自行车工厂。

</div>

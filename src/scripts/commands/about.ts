import type { Cmd } from "../types";

export const about: Cmd = {
  name: "whoami",
  brief: "who is this person?",
  run(_args, ctx) {
    ctx.out(
      `<div class="t-block t-about">` +
        `<pre class="t-mono t-ascii">` +
        ` __        ___        _        \n` +
        ` \\ \\      / / |__   _(_)___    \n` +
        `  \\ \\ /\\ / /| '_ \\ / _ \\ / __|  \n` +
        `   \\ V  V / | | | | (_) \\__ \\  \n` +
        `    \\_/\\_/  |_| |_|\\___/|___/  \n` +
        `</pre>` +
        `<div class="t-mono">` +
        `  <b>ZheNing Hu</b> — Software Developer<br/>` +
        `  Interests: Git internals · C++ · Linux · perf<br/>` +
        `  GSoC alum (Git) · loves the terminal<br/>` +
        `  More: <a href="/about" data-internal>/about</a> · ` +
        `<a href="/projects" data-internal>/projects</a> · ` +
        `<a href="/contact" data-internal>/contact</a> · ` +
        `<a href="/rss.xml" data-internal>RSS</a>` +
        `</div>` +
        `</div>`,
    );
  },
};

export const aboutAlias: Cmd = {
  name: "about",
  brief: "alias of `whoami`",
  run: about.run,
};

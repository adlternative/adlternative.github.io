import { esc, type Cmd } from "../types";

export const open: Cmd = {
  name: "open",
  brief: "jump to a post page",
  manual:
    "open <slug>\n" +
    "  Hard-navigates to /posts/<slug>/. The terminal is closed and the\n" +
    "  browser back button returns you here.",
  run(args, ctx) {
    if (!args[0]) {
      ctx.out(`<div class="t-err">open: missing slug.</div>`);
      return;
    }
    const slug = args[0];
    const post = ctx.posts.find((p) => p.slug === slug);
    if (!post) {
      ctx.out(`<div class="t-err">open: ${esc(slug)}: no such post.</div>`);
      return;
    }
    ctx.out(`<div class="t-dim">→ navigating to /posts/${esc(slug)}/ …</div>`);
    ctx.close();
    // Defer so the dim line is painted before we lose the page.
    setTimeout(() => {
      window.location.assign(`/posts/${slug}/`);
    }, 30);
  },
};

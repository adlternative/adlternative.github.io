import { esc, type Cmd } from "../types";

export const cat: Cmd = {
  name: "cat",
  brief: "show post metadata + jump link",
  manual:
    "cat <slug>\n" +
    "  Prints the post's frontmatter (title/date/tags) and an `open` hint.\n" +
    "  Tab-completes against existing post slugs.\n" +
    "  Does not render the body — use `open <slug>` to read it on the page.",
  run(args, ctx) {
    if (!args[0]) {
      ctx.out(`<div class="t-err">cat: missing slug. try <b>ls posts</b>.</div>`);
      return;
    }
    const slug = args[0];
    const post = ctx.posts.find((p) => p.slug === slug);
    if (!post) {
      ctx.out(
        `<div class="t-err">cat: ${esc(slug)}: no such post.</div>`,
      );
      return;
    }
    const tags = post.tags.length
      ? `\n  tags    : <span class="t-tag">#${post.tags
          .map((t) => esc(t))
          .join(" #")}</span>`
      : "";
    const desc = post.description
      ? `\n\n  ${esc(post.description)}…`
      : "";
    ctx.out(
      `<div class="t-block t-cat">` +
        `<pre class="t-mono">` +
        `  title   : <span class="t-title">${esc(post.title)}</span>\n` +
        `  slug    : <a class="t-slug" data-slug="${esc(post.slug)}">${esc(
          post.slug,
        )}</a>\n` +
        `  date    : ${esc(post.date)}\n` +
        `  category: ${esc(post.category)}` +
        tags +
        desc +
        `</pre>` +
        `<div class="t-hint">↳ <a class="t-slug" data-slug="${esc(
          post.slug,
        )}">open ${esc(post.slug)}</a> to read the full post.</div>` +
        `</div>`,
    );
  },
};

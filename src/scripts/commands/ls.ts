import { esc, type Cmd } from "../types";

function filterPosts(posts: Cmd extends never ? never : any[], args: string[]) {
  let result = posts.slice();
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--tag" && args[i + 1]) {
      const t = args[++i].toLowerCase();
      result = result.filter((p: any) =>
        p.tags.some((x: string) => x.toLowerCase() === t),
      );
    } else if (a === "--year" && args[i + 1]) {
      const y = args[++i];
      result = result.filter((p: any) => p.date.startsWith(y));
    }
  }
  return result;
}

export const ls: Cmd = {
  name: "ls",
  brief: "list posts; flags: --tag <name>, --year <YYYY>",
  manual:
    "ls posts                  # list every published post\n" +
    "ls posts --tag rust       # filter by tag (case-insensitive)\n" +
    "ls posts --year 2021      # filter by ISO year prefix\n" +
    "ls tags                   # show tag frequency table",
  run(args, ctx) {
    const target = args[0] ?? "posts";

    if (target === "tags") {
      const freq = new Map<string, number>();
      ctx.posts.forEach((p) =>
        p.tags.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1)),
      );
      const rows = [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(
          ([t, n]) =>
            `<span class="t-tag">#${esc(t)}</span> <span class="t-dim">x${n}</span>`,
        )
        .join("  ");
      ctx.out(`<div class="t-block">${rows || "(no tags)"}</div>`);
      return;
    }

    if (target !== "posts") {
      ctx.out(
        `<div class="t-err">ls: unknown target "${esc(
          target,
        )}". try <b>ls posts</b> or <b>ls tags</b>.</div>`,
      );
      return;
    }

    const rows = filterPosts(ctx.posts, args.slice(1));
    if (rows.length === 0) {
      ctx.out(`<div class="t-dim">(no posts match)</div>`);
      return;
    }

    const lines = rows
      .map((p: any) => {
        const tags = p.tags.length
          ? ` <span class="t-tag">#${p.tags
              .map((t: string) => esc(t))
              .join(" #")}</span>`
          : "";
        return (
          `<div class="t-row">` +
          `<span class="t-date">${esc(p.date)}</span>  ` +
          `<a class="t-slug" data-slug="${esc(p.slug)}">${esc(p.slug)}</a>  ` +
          `<span class="t-title">${esc(p.title)}</span>${tags}` +
          `</div>`
        );
      })
      .join("");

    ctx.out(
      `<div class="t-block">${lines}<div class="t-dim">— ${rows.length} post${
        rows.length === 1 ? "" : "s"
      } —</div></div>`,
    );
  },
};

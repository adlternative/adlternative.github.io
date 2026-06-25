import { esc, type Cmd } from "../types";

function highlight(haystack: string, kw: string): string {
  if (!kw) return esc(haystack);
  const lc = haystack.toLowerCase();
  const lck = kw.toLowerCase();
  let i = lc.indexOf(lck);
  if (i < 0) return esc(haystack);
  let out = "";
  let cursor = 0;
  while (i >= 0) {
    out += esc(haystack.slice(cursor, i));
    out += `<mark>${esc(haystack.slice(i, i + kw.length))}</mark>`;
    cursor = i + kw.length;
    i = lc.indexOf(lck, cursor);
  }
  out += esc(haystack.slice(cursor));
  return out;
}

export const grep: Cmd = {
  name: "grep",
  brief: "search title / tags / description for a keyword",
  manual:
    "grep <keyword>\n" +
    "  Case-insensitive substring search across post titles, tag names,\n" +
    "  and the short description excerpt baked into posts.json.\n" +
    "  Full-text body grep is intentionally not supported (keeps bundle small).",
  run(args, ctx) {
    const kw = args.join(" ").trim();
    if (!kw) {
      ctx.out(`<div class="t-err">grep: missing keyword.</div>`);
      return;
    }
    const lc = kw.toLowerCase();
    const hits = ctx.posts.filter(
      (p) =>
        p.title.toLowerCase().includes(lc) ||
        p.tags.some((t) => t.toLowerCase().includes(lc)) ||
        p.description.toLowerCase().includes(lc),
    );
    if (hits.length === 0) {
      ctx.out(`<div class="t-dim">grep: no match for "${esc(kw)}".</div>`);
      return;
    }
    const lines = hits
      .map((p) => {
        const tagsHit = p.tags.find((t) => t.toLowerCase().includes(lc));
        const tail = p.title.toLowerCase().includes(lc)
          ? highlight(p.title, kw)
          : tagsHit
            ? `<span class="t-tag">#${highlight(tagsHit, kw)}</span> ${esc(
                p.title,
              )}`
            : highlight(p.description.slice(0, 120) + "…", kw);
        return (
          `<div class="t-row">` +
          `<a class="t-slug" data-slug="${esc(p.slug)}">${esc(p.slug)}</a>: ` +
          tail +
          `</div>`
        );
      })
      .join("");
    ctx.out(
      `<div class="t-block">${lines}<div class="t-dim">— ${hits.length} match${
        hits.length === 1 ? "" : "es"
      } for "${esc(kw)}" —</div></div>`,
    );
  },
};

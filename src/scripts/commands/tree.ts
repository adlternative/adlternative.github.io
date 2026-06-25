import { esc, type Cmd } from "../types";
import type { Post } from "../types";

// Build a posts/<category>/<slug> tree from /posts.json.
type Node = {
  name: string;
  fullPath: string; // posts under root: "git/store" etc.
  kids: Map<string, Node>;
  leafTitle?: string;
};

function buildTree(posts: Post[]): Node {
  const root: Node = { name: "posts", fullPath: "", kids: new Map() };
  for (const p of posts) {
    const segments = p.slug.split("/").filter(Boolean);
    let cur = root;
    const acc: string[] = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      acc.push(seg);
      let next = cur.kids.get(seg);
      if (!next) {
        next = { name: seg, fullPath: acc.join("/"), kids: new Map() };
        cur.kids.set(seg, next);
      }
      cur = next;
      if (i === segments.length - 1) cur.leafTitle = p.title;
    }
  }
  return root;
}

function render(node: Node, prefix: string, isLast: boolean, depth: number, lines: string[]) {
  const branch = depth === 0 ? "" : isLast ? "└─ " : "├─ ";
  const label =
    node.leafTitle != null
      ? `<a class="t-slug" data-slug="${esc(node.fullPath)}">${esc(node.name)}</a> <span class="t-dim">— ${esc(node.leafTitle)}</span>`
      : `<b>${esc(node.name)}</b>`;
  lines.push(`${prefix}${branch}${label}`);

  const next = depth === 0 ? "" : prefix + (isLast ? "   " : "│  ");
  const kids = [...node.kids.values()];
  kids.forEach((k, i) => render(k, next, i === kids.length - 1, depth + 1, lines));
}

export const tree: Cmd = {
  name: "tree",
  brief: "show posts as an ASCII directory tree",
  manual:
    "tree              # full tree of every post\n" +
    "tree <category>   # subtree only (e.g. tree git)",
  run(args, ctx) {
    if (!ctx.posts.length) {
      ctx.out(`<div class="t-dim">(no posts loaded yet — try again in a moment)</div>`);
      return;
    }
    const root = buildTree(ctx.posts);
    let start: Node = root;
    if (args[0]) {
      const want = args[0].toLowerCase();
      const hit = root.kids.get(want);
      if (!hit) {
        ctx.out(`<div class="t-err">tree: no such top-level dir "${esc(args[0])}"</div>`);
        return;
      }
      start = hit;
    }
    const lines: string[] = [];
    render(start, "", true, 0, lines);
    ctx.out(`<div class="t-block"><pre class="t-mono">${lines.join("\n")}</pre></div>`);
  },
};

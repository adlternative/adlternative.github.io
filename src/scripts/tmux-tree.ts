// tmux-tree.ts — pane[3] sidebar: NERDTree-style mixed navigation.

import type { EventBus } from "./event-bus";
import { esc, type Post } from "./types";

interface TNode {
  label: string;
  type: "root" | "group" | "leaf";
  children?: TNode[];
  action?: string;
  count?: number;
  active?: boolean;
  collapsed?: boolean;
}

export function initTreePane(
  container: HTMLElement,
  bus: EventBus,
  opts: { initialTheme: string; runCommand: (cmd: string) => void },
): void {
  let theme = opts.initialTheme;
  let sel = 0;
  let flat: { node: TNode; el: HTMLElement }[] = [];
  let tree: TNode[] = [];

  function buildTree(posts: Post[]): TNode[] {
    const freq = new Map<string, number>();
    posts.forEach(p => p.tags.forEach(t => freq.set(t, (freq.get(t) ?? 0) + 1)));
    const tags: TNode[] = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([t, n]) => ({ label: `#${t}`, type: "leaf" as const, count: n, action: `ls posts --tag ${t}` }));
    if (freq.size > 12) tags.push({ label: `… (+${freq.size - 12})`, type: "leaf" as const });

    return [{
      label: "~/adl.sh", type: "root", children: [
        { label: "posts", type: "group", count: posts.length, collapsed: false, children: tags },
        { label: "pages", type: "group", collapsed: true, children: [
          { label: "about", type: "leaf", action: "open /about" },
          { label: "projects", type: "leaf", action: "open /projects" },
          { label: "contact", type: "leaf", action: "open /contact" },
        ]},
        { label: "themes", type: "group", collapsed: true, children: [
          { label: "matrix", type: "leaf", action: "theme matrix", active: theme === "matrix" },
          { label: "amber", type: "leaf", action: "theme amber", active: theme === "amber" },
          { label: "paper", type: "leaf", action: "theme paper", active: theme === "paper" },
        ]},
      ],
    }];
  }

  function render() {
    container.innerHTML = "";
    flat = [];
    walk(tree, 0);
    updateSel();
  }

  function walk(nodes: TNode[], depth: number) {
    for (const node of nodes) {
      const el = document.createElement("div");
      el.className = "t-tree-node";
      const pre = depth > 0 ? "│".repeat(depth - 1) + "├ " : "";
      const icon = (node.type === "group" || node.type === "root") ? (node.collapsed ? "▶ " : "▼ ") : "  ";
      const cnt = node.count != null ? ` (${node.count})` : "";
      const mark = node.active ? " *" : "";
      el.textContent = pre + icon + node.label + cnt + mark;
      if (node.active) el.classList.add("t-tree-active");
      const idx = flat.length;
      flat.push({ node, el });
      container.appendChild(el);
      el.addEventListener("click", () => { sel = idx; updateSel(); handleAction(node); });
      if (node.children && !node.collapsed) walk(node.children, depth + 1);
    }
  }

  function updateSel() {
    flat.forEach(({ el }, i) => el.classList.toggle("t-tree-selected", i === sel));
  }

  function handleAction(node: TNode) {
    if (node.type === "group" || node.type === "root") { node.collapsed = !node.collapsed; render(); }
    else if (node.action) opts.runCommand(node.action);
  }

  bus.on("tree-keypress", (d: { key: string }) => {
    if (d.key === "j" && sel < flat.length - 1) { sel++; updateSel(); flat[sel]?.el.scrollIntoView({ block: "nearest" }); }
    else if (d.key === "k" && sel > 0) { sel--; updateSel(); flat[sel]?.el.scrollIntoView({ block: "nearest" }); }
    else if (d.key === "Enter" && flat[sel]) handleAction(flat[sel].node);
    else if (d.key === "o" && flat[sel]) { const n = flat[sel].node; if (n.type !== "leaf") { n.collapsed = !n.collapsed; render(); } }
  });

  bus.on("theme-change", (d: { name: string }) => {
    theme = d.name;
    const r = tree[0]; if (r?.children) {
      const g = r.children.find(c => c.label === "themes");
      g?.children?.forEach(c => { c.active = c.label === theme; });
    }
    render();
  });

  bus.on("posts-ready", (d: { posts: Post[] }) => { tree = buildTree(d.posts); render(); });

  tree = buildTree([]);
  render();
}

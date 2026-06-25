// tmux-panes.ts — pane[1] help/manual + pane[2] preview content.

import type { EventBus } from "./event-bus";
import { esc, type Post } from "./types";

// ---- pane[1]: Help / Manual ----

export function initHelpPane(
  container: HTMLElement,
  bus: EventBus,
  commands: Record<string, { name: string; brief: string; manual?: string }>,
): void {
  const visible = (commands as any).__visible ?? commands;

  function renderHelp() {
    const lines = Object.values(visible)
      .map((c: any) => `<div class="t-row"><b>${esc(c.name)}</b> <span class="t-dim">${esc(c.brief)}</span></div>`)
      .join("");
    container.innerHTML = `<div class="t-block"><div class="t-dim">── commands ──</div>${lines}</div><div class="t-dim">^B ? — keys · ^B 0-3 — pane · ^B d — detach</div>`;
  }

  function renderCheatsheet() {
    const k = (key: string, desc: string) => `<div class="t-row"><b>${key}</b> ${desc}</div>`;
    container.innerHTML = `<div class="t-block"><div class="t-dim">── keys ──</div>`
      + k("⌘K/Ctrl-K", "toggle") + k("` (backtick)", "toggle") + k("Esc", "close")
      + k("^B → 0-3", "switch pane") + k("^B → ?", "cheatsheet")
      + k("^B → d", "detach") + k("Tab", "autocomplete") + k("Ctrl-L", "clear")
      + k("↑/↓", "history") + `<div class="t-dim">── sidebar ──</div>`
      + k("j/k", "move") + k("Enter", "execute") + k("o", "fold/expand") + `</div>`;
  }

  renderHelp();

  bus.on("manual", (d: { cmd: string; content: string }) => {
    container.innerHTML = `<div class="t-block"><div class="t-dim">── man ${esc(d.cmd)} ──</div><pre class="t-mono">${esc(d.content)}</pre></div><div class="t-dim" data-action="back-to-help">← back</div>`;
  });
  bus.on("show-cheatsheet", renderCheatsheet);
  container.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-action='back-to-help']")) renderHelp();
  });
}

// ---- pane[2]: Preview / Live output ----

export function initPreviewPane(container: HTMLElement, bus: EventBus): void {
  container.innerHTML = `<div class="t-dim">run a command to see preview: <b>ls posts</b> · <b>cat &lt;slug&gt;</b> · <b>grep &lt;kw&gt;</b></div>`;

  bus.on("preview", (d: { type: string; data?: any; keyword?: string }) => {
    if (d.type === "list") renderList(container, d.data);
    else if (d.type === "cat") renderCat(container, d.data);
    else if (d.type === "grep") renderGrep(container, d.data, d.keyword ?? "");
    else if (d.type === "tags") renderTags(container, d.data);
  });

  container.addEventListener("click", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>("[data-slug]");
    if (card) window.location.assign(`/posts/${card.dataset.slug}/`);
  });
}

function renderList(el: HTMLElement, posts: Post[]) {
  if (!posts.length) { el.innerHTML = `<div class="t-dim">(no posts)</div>`; return; }
  el.innerHTML = posts.map(p =>
    `<div class="t-preview-card" data-slug="${esc(p.slug)}"><span class="t-date">${esc(p.date)}</span> <span class="t-slug">${esc(p.slug)}</span> <span class="t-title">${esc(p.title)}</span></div>`
  ).join("") + `<div class="t-dim">— ${posts.length} posts — click to open</div>`;
}

function renderCat(el: HTMLElement, p: Post) {
  const tags = p.tags.map(t => `#${esc(t)}`).join(" ");
  el.innerHTML = `<div><b>${esc(p.title)}</b></div><div class="t-dim">${esc(p.date)} · ${tags}</div>${p.description ? `<div class="t-mono">${esc(p.description)}</div>` : ""}<div class="t-dim" data-slug="${esc(p.slug)}">→ click to read</div>`;
}

function renderGrep(el: HTMLElement, posts: Post[], kw: string) {
  if (!posts.length) { el.innerHTML = `<div class="t-dim">no matches for "${esc(kw)}"</div>`; return; }
  const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  el.innerHTML = posts.map(p =>
    `<div class="t-preview-card" data-slug="${esc(p.slug)}"><span class="t-date">${esc(p.date)}</span> <span class="t-title">${p.title.replace(re, "<mark>$1</mark>")}</span></div>`
  ).join("") + `<div class="t-dim">— ${posts.length} matches</div>`;
}

function renderTags(el: HTMLElement, posts: Post[]) {
  const freq = new Map<string, number>();
  posts.forEach(p => p.tags.forEach(t => freq.set(t, (freq.get(t) ?? 0) + 1)));
  el.innerHTML = [...freq.entries()].sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `<span class="t-tag">#${esc(t)}×${n}</span> `).join("") || "(no tags)";
}

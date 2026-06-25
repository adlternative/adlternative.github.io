// Pseudo-terminal dispatcher — tmux-style 4-pane edition.
// - Loads /posts.json once
// - Handles input, history, Tab completion, IME guard
// - Wires command registry to render output and theme controls
// - Integrates event bus for pane-to-pane communication
// - Manages Ctrl-B prefix keys and active pane switching
// Keep this small — no extra deps. Output HTML is responsibility of commands.

import { commands } from "./commands";
import { esc, type Ctx, type Post } from "./types";
import { createBus, type EventBus } from "./event-bus";
import { initStatusBar } from "./tmux-statusbar";
import { initHelpPane, initPreviewPane } from "./tmux-panes";
import { initTreePane } from "./tmux-tree";

const HISTORY_KEY = "zn.term.history.v1";
const THEME_KEY = "zn.term.theme.v1";
const VALID_THEMES = new Set(["matrix", "amber", "paper"]);
const DEFAULT_THEME = "matrix";

export type TerminalApi = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  openWith: (cmd: string) => void;
};

export function bootTerminal(root: HTMLElement): TerminalApi {
  const screen = root.querySelector<HTMLDivElement>(".t-screen")!;
  const input = root.querySelector<HTMLInputElement>(".t-input")!;
  const promptEl = root.querySelector<HTMLSpanElement>(".t-prompt")!;
  const statusbarEl = root.querySelector<HTMLElement>("[data-statusbar]")!;
  const helpContainer = root.querySelector<HTMLElement>(".t-help-container")!;
  const previewContainer = root.querySelector<HTMLElement>(".t-preview-container")!;
  const treeContainer = root.querySelector<HTMLElement>(".t-tree-container")!;

  // Pane elements
  const paneEls = [
    root.querySelector<HTMLElement>('[data-pane="0"]')!,
    root.querySelector<HTMLElement>('[data-pane="1"]')!,
    root.querySelector<HTMLElement>('[data-pane="2"]')!,
    root.querySelector<HTMLElement>('[data-pane="3"]')!,
  ];

  const PROMPT_HTML =
    `<span class="t-user">zhening</span>` +
    `<span class="t-dim">@</span>` +
    `<span class="t-host">adl</span>` +
    `<span class="t-dim">:</span>` +
    `<span class="t-pwd">~</span>` +
    `<span class="t-dim">$</span> `;
  promptEl.innerHTML = PROMPT_HTML;

  // --- event bus -----------------------------------------------------------
  const bus: EventBus = createBus();

  // --- active pane ---------------------------------------------------------
  let activePane = 0;

  function setActivePane(idx: number) {
    activePane = idx;
    paneEls.forEach((el, i) => {
      el.classList.toggle("t-pane-active", i === idx);
    });
    statusbar.setActivePane(idx);
    if (idx === 0) input.focus();
  }

  // Set initial active pane
  paneEls[0].classList.add("t-pane-active");

  // --- theme ---------------------------------------------------------------
  const initialTheme = (() => {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v && VALID_THEMES.has(v) ? v : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  })();
  let currentTheme = initialTheme;
  applyTheme(currentTheme);

  function applyTheme(name: string) {
    document.documentElement.setAttribute("data-term-theme", name);
  }

  // --- history -------------------------------------------------------------
  let history: string[] = [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) history = JSON.parse(raw);
  } catch {
    history = [];
  }
  let cursor = history.length;

  function persistHistory() {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-200)));
    } catch {
      /* swallow quota errors */
    }
  }

  // --- posts ---------------------------------------------------------------
  let posts: Post[] = [];
  let postsReady: Promise<void> | null = null;
  function ensurePosts(): Promise<void> {
    if (postsReady) return postsReady;
    postsReady = fetch("/posts.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Post[]) => {
        posts = data ?? [];
        // Notify tree sidebar that posts are ready
        bus.emit("posts-ready", { posts });
      })
      .catch(() => {
        posts = [];
      });
    return postsReady;
  }

  // --- ctx -----------------------------------------------------------------
  const ctx: Ctx = {
    get posts() {
      return posts;
    },
    out(html) {
      screen.insertAdjacentHTML("beforeend", html);
      screen.scrollTop = screen.scrollHeight;
    },
    clear() {
      screen.innerHTML = "";
    },
    getTheme() {
      return currentTheme;
    },
    setTheme(name) {
      if (!VALID_THEMES.has(name)) return false;
      currentTheme = name;
      applyTheme(name);
      try {
        localStorage.setItem(THEME_KEY, name);
      } catch {
        /* noop */
      }
      bus.emit("theme-change", { name });
      return true;
    },
    history() {
      return history.slice();
    },
    close() {
      api.close();
    },
  };

  // --- status bar ----------------------------------------------------------
  const statusbar = initStatusBar(statusbarEl, bus, (idx) => setActivePane(idx));

  // --- help pane -----------------------------------------------------------
  initHelpPane(helpContainer, bus, commands);

  // --- preview pane --------------------------------------------------------
  initPreviewPane(previewContainer, bus);

  // --- tree sidebar --------------------------------------------------------
  const treePaneApi = initTreePane(treeContainer, bus, {
    initialTheme: currentTheme,
    runCommand(cmd: string) {
      // Inject command into shell pane and execute
      setActivePane(0);
      input.value = "";
      ctx.out(
        `<div class="t-line"><span class="t-prompt-static">${PROMPT_HTML}</span>${esc(cmd)}</div>`,
      );
      if (!history.length || history[history.length - 1] !== cmd) history.push(cmd);
      cursor = history.length;
      persistHistory();
      ensurePosts().then(() => run(cmd));
    },
  });

  // --- banner --------------------------------------------------------------
  function renderBanner() {
    ctx.out(
      `<div class="t-block t-banner">` +
        `<pre class="t-mono t-ascii"> __ _    __ _    _ \n` +
        `/  \\ \\  / // \\  | |\n` +
        `\\_// _\\/ _\\\\_/  |_|\n` +
        `</pre>` +
        `<div class="t-mono">welcome to <b>adl.sh</b> — ZheNing Hu's interactive blog terminal.</div>` +
        `<div class="t-dim">type <b>help</b> to begin · <b>neofetch</b> · <b>ls posts</b> · <b>fortune</b> · <b>cowsay hi</b> · <b>^B ?</b> for keys.</div>` +
        `</div>`,
    );
  }
  renderBanner();

  // --- Ctrl-B prefix key handling ------------------------------------------
  let prefixActive = false;
  let prefixTimer: ReturnType<typeof setTimeout> | null = null;

  function clearPrefix() {
    prefixActive = false;
    if (prefixTimer) { clearTimeout(prefixTimer); prefixTimer = null; }
  }

  root.addEventListener("keydown", (e) => {
    // Only handle prefix logic when overlay is visible
    if (root.classList.contains("t-hidden")) return;

    // Ctrl-B sets prefix
    if (e.key.toLowerCase() === "b" && e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      prefixActive = true;
      if (prefixTimer) clearTimeout(prefixTimer);
      prefixTimer = setTimeout(clearPrefix, 1500);
      return;
    }

    if (prefixActive) {
      e.preventDefault();
      clearPrefix();

      switch (e.key) {
        case "0": setActivePane(0); break;
        case "1": setActivePane(1); break;
        case "2": setActivePane(2); break;
        case "3": setActivePane(3); break;
        case "?":
          setActivePane(1);
          bus.emit("show-cheatsheet", {});
          break;
        case "d":
          api.close();
          break;
        case ",":
          // Rename pane — toy feature, prompt in status area
          // For now just flash the titlebar
          break;
        default:
          break;
      }
      return;
    }

    // Sidebar keyboard navigation when pane[3] is active
    if (activePane === 3) {
      if (e.key === "j" || e.key === "k" || e.key === "Enter" || e.key === "o") {
        e.preventDefault();
        bus.emit("tree-keypress", { key: e.key });
        return;
      }
    }
  });

  // --- input handling ------------------------------------------------------
  let composing = false;
  input.addEventListener("compositionstart", () => {
    composing = true;
  });
  input.addEventListener("compositionend", () => {
    composing = true;
    setTimeout(() => {
      composing = false;
    }, 0);
  });

  input.addEventListener("keydown", async (e) => {
    if (composing) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const line = input.value;
      ctx.out(
        `<div class="t-line"><span class="t-prompt-static">${PROMPT_HTML}</span>${esc(
          line,
        )}</div>`,
      );
      input.value = "";
      if (line.trim()) {
        if (history[history.length - 1] !== line) history.push(line);
        cursor = history.length;
        persistHistory();
        await ensurePosts();
        await run(line);
      } else {
        cursor = history.length;
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cursor > 0) cursor--;
      input.value = history[cursor] ?? "";
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (cursor < history.length) cursor++;
      input.value = cursor === history.length ? "" : history[cursor] ?? "";
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const completed = autocomplete(input.value);
      if (completed != null) {
        input.value = completed;
        input.setSelectionRange(completed.length, completed.length);
      }
      return;
    }

    if (e.key.toLowerCase() === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      ctx.clear();
      return;
    }
  });

  function autocomplete(buf: string): string | null {
    const trimmed = buf.trimEnd();
    const parts = trimmed.split(/\s+/);
    if (parts.length <= 1) {
      const head = parts[0] ?? "";
      const visible = (commands as any).__visible ?? commands;
      const cands = Object.keys(visible).filter((c) => c.startsWith(head));
      if (cands.length === 1) return cands[0] + " ";
      if (cands.length > 1) {
        ctx.out(
          `<div class="t-dim">${cands.map((c) => esc(c)).join("  ")}</div>`,
        );
      }
      return null;
    }
    const head = parts[0];
    if (head === "cat" || head === "open") {
      const prefix = parts.slice(1).join(" ");
      const cands = posts
        .map((p) => p.slug)
        .filter((s) => s.startsWith(prefix));
      if (cands.length === 1) return `${head} ${cands[0]}`;
      if (cands.length > 1) {
        const max = 12;
        const show = cands.slice(0, max).map((c) => esc(c)).join("  ");
        const more = cands.length > max ? `  … (+${cands.length - max})` : "";
        ctx.out(`<div class="t-dim">${show}${more}</div>`);
      }
      return null;
    }
    if (head === "theme") {
      const prefix = parts[1] ?? "";
      const cands = ["matrix", "amber", "paper"].filter((c) =>
        c.startsWith(prefix),
      );
      if (cands.length === 1) return `theme ${cands[0]}`;
    }
    if (head === "help" || head === "man") {
      const prefix = parts[1] ?? "";
      const visible = (commands as any).__visible ?? commands;
      const cands = Object.keys(visible).filter((c) => c.startsWith(prefix));
      if (cands.length === 1) return `${head} ${cands[0]}`;
    }
    return null;
  }

  async function run(line: string) {
    const tokens = line.trim().split(/\s+/);
    const head = tokens[0];

    // Emit command execution to status bar
    bus.emit("cmd-exec", { cmd: line.trim() });

    // special-case "hack the planet" so it dispatches as one phrase
    if (head === "hack") {
      const cmd = commands["hack"];
      if (cmd) {
        try {
          await cmd.run(tokens.slice(1), ctx);
        } catch (err) {
          ctx.out(`<div class="t-err">${esc(String(err))}</div>`);
        }
        return;
      }
    }
    const cmd = commands[head];
    if (!cmd) {
      ctx.out(
        `<div class="t-err">command not found: ${esc(head)} — type <b>help</b></div>`,
      );
      return;
    }
    try {
      await cmd.run(tokens.slice(1), ctx);
    } catch (err) {
      ctx.out(`<div class="t-err">${esc(String(err))}</div>`);
    }

    // Emit preview events based on command type
    if (head === "ls") {
      const target = tokens[1] ?? "posts";
      if (target === "posts") {
        // Re-run filter logic to get data for preview
        const filteredPosts = filterPostsForPreview(posts, tokens.slice(2));
        bus.emit("preview", { type: "list", data: filteredPosts, cmd: line.trim() });
      } else if (target === "tags") {
        bus.emit("preview", { type: "tags", data: posts, cmd: line.trim() });
      }
    } else if (head === "cat") {
      const slug = tokens.slice(1).join(" ");
      const post = posts.find((p) => p.slug === slug);
      if (post) {
        bus.emit("preview", { type: "cat", data: post, cmd: line.trim() });
      }
    } else if (head === "grep") {
      const kw = tokens.slice(1).join(" ").toLowerCase();
      if (kw) {
        const matches = posts.filter(
          (p) =>
            p.title.toLowerCase().includes(kw) ||
            p.tags.some((t) => t.toLowerCase().includes(kw)) ||
            (p.description ?? "").toLowerCase().includes(kw),
        );
        bus.emit("preview", { type: "grep", data: matches, keyword: kw, cmd: line.trim() });
      }
    } else if (head === "help" || head === "man") {
      const cmdName = tokens[1];
      if (cmdName && commands[cmdName]) {
        bus.emit("manual", { cmd: cmdName, content: commands[cmdName].manual || commands[cmdName].brief });
      }
    } else if (head === "theme") {
      // theme-change already emitted by ctx.setTheme
    }
  }

  // Helper: filter posts (mirrors ls command logic)
  function filterPostsForPreview(allPosts: Post[], args: string[]): Post[] {
    let result = allPosts.slice();
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "--tag" && args[i + 1]) {
        const t = args[++i].toLowerCase();
        result = result.filter((p) =>
          p.tags.some((x) => x.toLowerCase() === t),
        );
      } else if (a === "--year" && args[i + 1]) {
        const y = args[++i];
        result = result.filter((p) => p.date.startsWith(y));
      }
    }
    return result;
  }

  // Clicking on any rendered slug acts like `open <slug>`.
  screen.addEventListener("click", (e) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const slugEl = target.closest<HTMLElement>("[data-slug]");
    if (slugEl) {
      e.preventDefault();
      const slug = slugEl.getAttribute("data-slug")!;
      ctx.out(`<div class="t-dim">→ open ${esc(slug)}</div>`);
      api.close();
      setTimeout(() => window.location.assign(`/posts/${slug}/`), 30);
      return;
    }
    const internal = target.closest<HTMLAnchorElement>("a[data-internal]");
    if (internal) {
      e.preventDefault();
      const href = internal.getAttribute("href");
      if (href) {
        api.close();
        setTimeout(() => window.location.assign(href), 30);
      }
    }
  });

  // Focus the input when the user clicks anywhere on the shell pane.
  const shellPane = root.querySelector('[data-pane="0"]');
  if (shellPane) {
    shellPane.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-slug]") || t.closest("a[data-internal]")) return;
      setActivePane(0);
    });
  }

  // Click on any pane to activate it
  paneEls.forEach((el, idx) => {
    el.addEventListener("mousedown", () => {
      if (activePane !== idx) setActivePane(idx);
    });
  });

  // --- open/close ----------------------------------------------------------
  let lastFocused: HTMLElement | null = null;

  const api: TerminalApi = {
    open() {
      if (!root.classList.contains("t-hidden")) return;
      lastFocused = (document.activeElement as HTMLElement) ?? null;
      root.classList.remove("t-hidden");
      root.setAttribute("aria-hidden", "false");
      void ensurePosts();
      setTimeout(() => input.focus(), 0);
    },
    close() {
      if (root.classList.contains("t-hidden")) return;
      root.classList.add("t-hidden");
      root.setAttribute("aria-hidden", "true");
      clearPrefix();
      if (lastFocused && typeof lastFocused.focus === "function") {
        try {
          lastFocused.focus();
        } catch {
          /* noop */
        }
      }
    },
    toggle() {
      if (root.classList.contains("t-hidden")) api.open();
      else api.close();
    },
    isOpen() {
      return !root.classList.contains("t-hidden");
    },
    openWith(cmd: string) {
      api.open();
      ensurePosts().then(() => {
        input.value = "";
        ctx.out(
          `<div class="t-line"><span class="t-prompt-static">${PROMPT_HTML}</span>${esc(cmd)}</div>`,
        );
        if (!history.length || history[history.length - 1] !== cmd) history.push(cmd);
        cursor = history.length;
        persistHistory();
        run(cmd);
      });
    },
  };

  return api;
}

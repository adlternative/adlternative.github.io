// Pseudo-terminal dispatcher.
// - Loads /posts.json once
// - Handles input, history, Tab completion, IME guard
// - Wires command registry to render output and theme controls
// Keep this small — no extra deps. Output HTML is responsibility of commands.

import { commands } from "./commands";
import { esc, type Ctx, type Post } from "./types";

const HISTORY_KEY = "zn.term.history.v1";
const THEME_KEY = "zn.term.theme.v1";
const VALID_THEMES = new Set(["matrix", "amber", "paper"]);
const DEFAULT_THEME = "matrix";

export type TerminalApi = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
};

export function bootTerminal(root: HTMLElement): TerminalApi {
  const screen = root.querySelector<HTMLDivElement>(".t-screen")!;
  const input = root.querySelector<HTMLInputElement>(".t-input")!;
  const promptEl = root.querySelector<HTMLSpanElement>(".t-prompt")!;
  const closeBtn = root.querySelector<HTMLButtonElement>(".t-close");

  const PROMPT_HTML =
    `<span class="t-user">zhening</span>` +
    `<span class="t-dim">@</span>` +
    `<span class="t-host">adl</span>` +
    `<span class="t-dim">:</span>` +
    `<span class="t-pwd">~</span>` +
    `<span class="t-dim">$</span> `;
  promptEl.innerHTML = PROMPT_HTML;

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
      return true;
    },
    history() {
      return history.slice();
    },
    close() {
      api.close();
    },
  };

  // --- banner --------------------------------------------------------------
  function renderBanner() {
    ctx.out(
      `<div class="t-block t-banner">` +
        `<pre class="t-mono t-ascii"> __ _    __ _    _ \n` +
        `/  \\ \\  / // \\  | |\n` +
        `\\_// _\\/ _\\\\_/  |_|\n` +
        `</pre>` +
        `<div class="t-mono">welcome to <b>adl.sh</b> — ZheNing Hu's interactive blog terminal.</div>` +
        `<div class="t-dim">type <b>help</b> to begin · <b>ls posts</b> to browse · <b>open &lt;slug&gt;</b> to read · <b>Esc</b> to leave.</div>` +
        `</div>`,
    );
  }
  renderBanner();

  // --- input handling ------------------------------------------------------
  let composing = false;
  input.addEventListener("compositionstart", () => {
    composing = true;
  });
  input.addEventListener("compositionend", () => {
    // small delay: the trailing Enter that confirms the IME selection
    // sometimes arrives as keydown right after compositionend.
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
      // place caret at end
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

  // Focus the input when the user clicks anywhere on the terminal chrome.
  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-slug]") || t.closest("a[data-internal]")) return;
    if (t.closest(".t-close")) return;
    input.focus();
  });

  // --- open/close ----------------------------------------------------------
  let lastFocused: HTMLElement | null = null;

  const api: TerminalApi = {
    open() {
      if (!root.classList.contains("t-hidden")) return;
      lastFocused = (document.activeElement as HTMLElement) ?? null;
      root.classList.remove("t-hidden");
      root.setAttribute("aria-hidden", "false");
      // Kick off posts.json fetch the moment the terminal first opens.
      void ensurePosts();
      setTimeout(() => input.focus(), 0);
    },
    close() {
      if (root.classList.contains("t-hidden")) return;
      root.classList.add("t-hidden");
      root.setAttribute("aria-hidden", "true");
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
  };

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      api.close();
    });
  }

  return api;
}

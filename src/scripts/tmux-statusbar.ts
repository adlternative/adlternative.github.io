// tmux-statusbar.ts — bottom status bar: session, pane list, last cmd, theme, clock.

import type { EventBus } from "./event-bus";

const NAMES = ["shell", "help", "preview", "tree"];

export function initStatusBar(
  el: HTMLElement,
  bus: EventBus,
  onPaneClick: (i: number) => void,
) {
  el.innerHTML = "";
  el.classList.add("t-statusbar");
  const left = document.createElement("span");
  left.className = "t-sb-left";
  const mid = document.createElement("span");
  mid.className = "t-sb-mid";
  const right = document.createElement("span");
  right.className = "t-sb-right";
  el.append(left, mid, right);

  let active = 0, lastCmd = "", theme = document.documentElement.getAttribute("data-term-theme") || "matrix";
  const btns: HTMLSpanElement[] = [];

  const ses = document.createElement("span");
  ses.className = "t-sb-session";
  ses.textContent = "[adl.sh] ";
  left.append(ses);

  for (let i = 0; i < 4; i++) {
    const b = document.createElement("span");
    b.className = "t-sb-pane";
    b.addEventListener("click", () => onPaneClick(i));
    btns.push(b);
    left.append(b);
  }

  function rPanes() {
    btns.forEach((b, i) => {
      b.textContent = `${i}:${NAMES[i]}${i === active ? "*" : ""} `;
      b.classList.toggle("t-sb-active", i === active);
    });
  }
  function rMid() { mid.textContent = lastCmd.length > 40 ? lastCmd.slice(0, 37) + "…" : lastCmd; }
  function rRight() {
    const d = new Date();
    right.textContent = `${theme} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}  ^B ?`;
  }

  rPanes(); rMid(); rRight();
  const t = setInterval(rRight, 30000);

  bus.on("cmd-exec", (d: { cmd: string }) => { lastCmd = d.cmd; rMid(); });
  bus.on("theme-change", (d: { name: string }) => { theme = d.name; rRight(); });

  return {
    setActivePane(i: number) { active = i; rPanes(); },
    setLastCmd(c: string) { lastCmd = c; rMid(); },
    setTheme(n: string) { theme = n; rRight(); },
    destroy() { clearInterval(t); },
  };
}

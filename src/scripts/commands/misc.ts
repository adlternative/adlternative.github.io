import { esc, type Cmd } from "../types";

function fmtDate(): string {
  const d = new Date();
  const z = (n: number) => n.toString().padStart(2, "0");
  const wd = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  const mo = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const tzh = z(Math.floor(Math.abs(tz) / 60));
  const tzm = z(Math.abs(tz) % 60);
  return `${wd} ${mo} ${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())} ${sign}${tzh}${tzm} ${d.getFullYear()}`;
}

export const date: Cmd = {
  name: "date",
  brief: "current local date/time (and uptime if you ask nicely)",
  manual:
    "date           # local time\n" +
    "date -u        # UTC\n" +
    "date +epoch    # unix timestamp",
  run(args, ctx) {
    if (args[0] === "-u") {
      ctx.out(`<div class="t-mono">${esc(new Date().toUTCString())}</div>`);
      return;
    }
    if (args[0] === "+epoch") {
      ctx.out(`<div class="t-mono">${Math.floor(Date.now() / 1000)}</div>`);
      return;
    }
    ctx.out(`<div class="t-mono">${esc(fmtDate())}</div>`);
  },
};

export const echo: Cmd = {
  name: "echo",
  brief: "print args back at you",
  manual: "echo hello world\necho -n no-newline\necho $RANDOM   # roll a d65535",
  run(args, ctx) {
    let n = false;
    if (args[0] === "-n") { n = true; args = args.slice(1); }
    const text = args
      .map((a) => (a === "$RANDOM" ? String(Math.floor(Math.random() * 65536)) : a))
      .join(" ");
    const line = esc(text);
    ctx.out(n ? `<span class="t-mono">${line}</span>` : `<div class="t-mono">${line}</div>`);
  },
};

export const coin: Cmd = {
  name: "coin",
  brief: "flip a coin",
  run(_args, ctx) {
    const r = Math.random() < 0.5 ? "heads" : "tails";
    ctx.out(`<div class="t-mono">🪙 → <b>${r}</b></div>`);
  },
};

export const roll: Cmd = {
  name: "roll",
  brief: "roll a die — `roll 2d6` or `roll d20`",
  manual: "roll d20\nroll 2d6\nroll 4d6  (D&D ability score-ish)",
  run(args, ctx) {
    const expr = (args[0] || "d6").toLowerCase();
    const m = /^(\d*)d(\d+)$/.exec(expr);
    if (!m) {
      ctx.out(`<div class="t-err">roll: bad expression "${esc(expr)}". try <b>roll d20</b> or <b>roll 2d6</b>.</div>`);
      return;
    }
    const count = Math.max(1, Math.min(20, parseInt(m[1] || "1", 10)));
    const faces = Math.max(2, Math.min(1000, parseInt(m[2], 10)));
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) rolls.push(1 + Math.floor(Math.random() * faces));
    const sum = rolls.reduce((a, b) => a + b, 0);
    const detail = rolls.join(" + ");
    ctx.out(
      `<div class="t-mono">🎲 ${esc(expr)} → <b>${sum}</b> <span class="t-dim">(${esc(detail)})</span></div>`,
    );
  },
};

const COFFEES = ["☕", "🫖", "🥤", "🧋"];

export const coffee: Cmd = {
  name: "coffee",
  brief: "HTCPCP/1.0 — RFC 2324 compliant",
  run(_args, ctx) {
    const cup = COFFEES[Math.floor(Math.random() * COFFEES.length)];
    ctx.out(
      `<div class="t-block">` +
        `<div class="t-mono"><b>HTTP/1.1 418 I'm a teapot</b></div>` +
        `<div class="t-dim">The requested entity body is short and stout.</div>` +
        `<div class="t-mono" style="font-size:32px;line-height:1.1">${cup}</div>` +
        `</div>`,
    );
  },
};

export const exitCmd: Cmd = {
  name: "exit",
  brief: "close the terminal (same as Esc)",
  run(_args, ctx) {
    ctx.out(`<div class="t-dim">logout</div>`);
    setTimeout(() => ctx.close(), 200);
  },
};

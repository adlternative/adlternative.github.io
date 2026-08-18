import { esc, type Cmd } from "../types";

// The blog homepage's day/night AI agent, as a terminal command.
// 06:00–18:00 → asleep; 18:00–06:00 → working.
// Behaviour mirrors the AgentHero banner so clicking the robot on the
// homepage opens this exact scene inside the real terminal overlay.

const SLEEP_ASCII = [
  "            |            ",
  "       ___________       ",
  "      |  _______  |      ",
  "      | | -   - | |      ",
  "      | |  ...  | |      ",
  "      | |_______| |      ",
  "      |___________|      ",
  "        | | | |          ",
  "      z Z z Z z          ",
];

const WORK_ASCII = [
  "            *            ",
  "            |            ",
  "       ___________       ",
  "      |  _______  |      ",
  "      | | o   o | |      ",
  "      | |  ===  | |      ",
  "      | |_______| |      ",
  "      |___________|      ",
  "        | | | |          ",
];

const BREATHE = [
  "       .---.            ",
  "      (  - -  )   z Z   ",
  "       \\  ..  /    z    ",
  "        '---'     Z z   ",
  "         |||            ",
  "      z Z z Z           ",
];

function isNight(): boolean {
  const h = new Date().getHours();
  return h < 6 || h >= 18;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export const agent: Cmd = {
  name: "agent",
  brief: "the AI agent that sleeps by day and codes by night",
  manual:
    "agent [status|--force|wake]\n\n" +
    "  (no arg)    spawn the homepage agent and see what it is up to right now.\n" +
    "  status      show a one-line process report (like the homepage `top` line).\n" +
    "  --force     try to wake the agent during daytime. results may vary.\n" +
    "  wake        alias for --force.",
  run(args, ctx) {
    const sub = args[0] ?? "";

    // --- `agent status` : compact one-liner like the homepage top line ---
    if (sub === "status") {
      const night = isNight();
      const t = nowHHMM();
      if (night) {
        ctx.out(
          `<div class="t-mono">PID 1234  zhening  <b>99%</b> ` +
            `<span class="t-cmd">running</span>  agent --work   // since ${esc(t)}</div>`,
        );
      } else {
        ctx.out(
          `<div class="t-mono">PID 1234  zhening  0.0% ` +
            `<span class="t-dim">sleeping</span>  agent --idle  // since ${esc(t)}</div>`,
        );
      }
      return;
    }

    // --- `agent --force` / `agent wake` : poke the sleeping agent ---
    if (sub === "--force" || sub === "wake") {
      if (isNight()) {
        ctx.out(
          `<div class="t-mono">agent is already wide awake — it is nighttime. ` +
            `no need to poke it.</div>`,
        );
        return;
      }
      const lines = [
        "[wake] poking the agent with a stick...",
        '[err]  agent: "five more minutes..."',
        "[err]  agent turned over and pulled the blanket up.",
        "[ok]   nothing happened. (it is a static blog, what did you expect?)",
      ];
      const block = lines
        .map((l) => {
          const cls = l.startsWith("[err]")
            ? "t-err"
            : l.startsWith("[ok]")
              ? "t-cmd"
              : "t-dim";
          return `<div class="t-mono ${cls}">${esc(l)}</div>`;
        })
        .join("");
      ctx.out(`<div class="t-block">${block}</div>`);
      return;
    }

    // --- `agent` (default) : full scene, time-aware ---
    const night = isNight();
    const ascii = (night ? WORK_ASCII : SLEEP_ASCII)
      .map((l) => esc(l))
      .join("\n");

    ctx.out(`<div class="t-block">`);
    ctx.out(`<div class="t-dim t-mono">[ok] spawning agent process...</div>`);
    ctx.out(`<pre class="t-mono t-ascii">${ascii}</pre>`);

    if (night) {
      ctx.out(
        `<div class="t-mono"><span class="t-cmd">[work]</span> ` +
          `agent online. 99% cpu. inspiration.exe is running.</div>`,
      );
      ctx.out(
        `<div class="t-mono"><span class="t-cmd">[work]</span> ` +
          `last commit: "midnight genius, do not revert"</div>`,
      );
      ctx.out(
        `<div class="t-dim">type <b>help</b> to see what else it can do ` +
          `(if it is not too busy).</div>`,
      );
    } else {
      ctx.out(
        `<div class="t-mono"><span class="t-dim">[sleep]</span> ` +
          `agent is asleep — it is daytime.</div>`,
      );
      ctx.out(
        `<div class="t-mono"><span class="t-dim">[sleep]</span> ` +
          `it politely refuses to work. try again after 18:00.</div>`,
      );
      ctx.out(
        `<div class="t-dim">run <b>agent --force</b> to poke it awake (at your own risk).</div>`,
      );
    }
    ctx.out(`</div>`);
  },
};

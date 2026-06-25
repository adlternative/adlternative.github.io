import { esc, type Cmd } from "../types";

const PLANET = [
  "                              .-=-.            ",
  "                             /     \\           ",
  "                            | () () |          ",
  "                             \\  ^  /           ",
  "                              '---'            ",
  "    H A C K   T H E   P L A N E T              ",
  "  -- Crash Override, 1995 ---------------------",
];

export const sudo: Cmd = {
  name: "sudo",
  brief: "you are not in the sudoers file",
  run(args, ctx) {
    const cmd = args.join(" ").trim();
    if (cmd === "rm -rf /" || cmd === "rm -rf /*") {
      ctx.out(
        `<div class="t-block">` +
          `<pre class="t-mono">` +
          `Deleting /  ` +
          `[████████████████████████████████] 100%</pre>` +
          `<div class="t-err">Nice try. 🪦</div>` +
          `<div class="t-dim">(this is a static blog — nothing was harmed)</div>` +
          `</div>`,
      );
      return;
    }
    if (cmd === "make me a sandwich") {
      ctx.out(`<div class="t-mono">🥪 Okay.</div>`);
      return;
    }
    ctx.out(
      `<div class="t-err">` +
        `[sudo] password for zhening: <span class="t-dim">****</span><br/>` +
        `Sorry, user zhening is not in the sudoers file. ` +
        `This incident will be reported.` +
        `</div>`,
    );
  },
};

export const vim: Cmd = {
  name: "vim",
  brief: "you can't escape this one either",
  run(_args, ctx) {
    ctx.out(
      `<div class="t-err">` +
        `你的 vim 还没退出吗？😈 (try <b>:q!</b>… nope, still here.)` +
        `</div>`,
    );
  },
};

export const hack: Cmd = {
  name: "hack",
  brief: "the planet 🌍",
  run(args, ctx) {
    if (args.join(" ").toLowerCase() === "the planet") {
      ctx.out(
        `<div class="t-block t-easter"><pre class="t-mono t-ascii">${PLANET.map(
          (l) => esc(l),
        ).join("\n")}</pre></div>`,
      );
      return;
    }
    ctx.out(`<div class="t-dim">hack what?  try: <b>hack the planet</b></div>`);
  },
};

// "The answer to life, the universe, and everything."
export const fortytwo: Cmd = {
  name: "42",
  brief: "the answer",
  run(_args, ctx) {
    ctx.out(
      `<div class="t-block">` +
        `<pre class="t-mono t-ascii">  _ _   ____  \n |_  | |___ \\ \n  | |  __) |\n  |_| /__/  \n</pre>` +
        `<div class="t-mono">life · the universe · everything.</div>` +
        `<div class="t-dim">— Douglas Adams</div>` +
        `</div>`,
    );
  },
};

// Classic Colossal Cave magic word.
export const xyzzy: Cmd = {
  name: "xyzzy",
  brief: "magic word",
  run(_args, ctx) {
    ctx.out(`<div class="t-mono">Nothing happens.</div>`);
  },
};

// "please" — politeness escalation.
export const please: Cmd = {
  name: "please",
  brief: "be polite to the shell",
  run(args, ctx) {
    const rest = args.join(" ").trim();
    if (!rest) {
      ctx.out(`<div class="t-dim">…please what?</div>`);
      return;
    }
    if (rest === "make me a sandwich") {
      ctx.out(`<div class="t-mono">🥪 Coming right up.</div>`);
      return;
    }
    ctx.out(
      `<div class="t-mono">Manners noted. Run <b>${esc(rest)}</b> yourself — I'm just a static blog.</div>`,
    );
  },
};

// Fake Matrix rain — 12 lines of random katakana-ish glyphs.
const RAIN_CHARS = "ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789Z:.\"=*+-<>¦|_";
export const matrixCmd: Cmd = {
  name: "matrix",
  brief: "follow the white rabbit",
  run(_args, ctx) {
    const cols = 40;
    const rows = 12;
    const lines: string[] = [];
    for (let r = 0; r < rows; r++) {
      let line = "";
      for (let c = 0; c < cols; c++) {
        line += RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)];
      }
      lines.push(line);
    }
    ctx.out(
      `<div class="t-block t-easter"><pre class="t-mono t-ascii" style="opacity:0.85">${lines
        .map((l) => esc(l))
        .join("\n")}</pre><div class="t-dim">  wake up, neo…</div></div>`,
    );
  },
};

// rm without sudo — refuse politely.
export const rm: Cmd = {
  name: "rm",
  brief: "no.",
  run(args, ctx) {
    const path = args.join(" ").trim() || "(nothing)";
    ctx.out(
      `<div class="t-err">rm: cannot remove '${esc(
        path,
      )}': Read-only file system.</div>` +
        `<div class="t-dim">(this is a static blog rendered at build time — paths are immutable)</div>`,
    );
  },
};

// Pretend-vim quit commands. Match exact name.
export const qBang: Cmd = {
  name: ":q",
  brief: "quit (closes terminal)",
  run(_args, ctx) {
    ctx.out(`<div class="t-dim">:q</div>`);
    setTimeout(() => ctx.close(), 150);
  },
};

export const wqBang: Cmd = {
  name: ":wq",
  brief: "write & quit — nothing to write, but okay",
  run(_args, ctx) {
    ctx.out(`<div class="t-dim">:wq <span class="t-dim">[static blog — no buffer to write]</span></div>`);
    setTimeout(() => ctx.close(), 200);
  },
};

// "make coffee" alias for the visible coffee command, but via teapot path.
export const make: Cmd = {
  name: "make",
  brief: "build something",
  run(args, ctx) {
    const target = args.join(" ").trim();
    if (target === "coffee") {
      ctx.out(`<div class="t-err">make: *** No rule to make target 'coffee'.  Stop.</div>`);
      return;
    }
    if (target === "love" || target === "war") {
      ctx.out(`<div class="t-dim">make ${esc(target)}: not implemented (politically)</div>`);
      return;
    }
    if (!target) {
      ctx.out(`<div class="t-err">make: *** No targets specified.  Stop.</div>`);
      return;
    }
    ctx.out(
      `<div class="t-mono">make: Nothing to be done for '${esc(target)}'.</div>`,
    );
  },
};

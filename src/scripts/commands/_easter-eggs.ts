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

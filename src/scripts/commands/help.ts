import { esc, type Cmd } from "../types";
import { commands } from "./index";

export const help: Cmd = {
  name: "help",
  brief: "show this list (or `man <cmd>` for details)",
  run(args, ctx) {
    if (args[0]) {
      const target = commands[args[0]];
      if (!target) {
        ctx.out(`<div class="t-err">help: no such command "${esc(args[0])}"</div>`);
        return;
      }
      const body = target.manual
        ? esc(target.manual)
        : esc(target.brief);
      ctx.out(
        `<div class="t-block"><div class="t-title">${esc(target.name)}</div>` +
          `<pre class="t-mono">${body}</pre></div>`,
      );
      return;
    }
    const visible = (commands as any).__visible ?? commands;
    const rows = Object.values(visible)
      .sort((a: any, b: any) => a.name.localeCompare(b.name))
      .map(
        (c) =>
          `<div class="t-row"><span class="t-cmd">${esc(
            c.name.padEnd(10, " "),
          )}</span> <span class="t-dim">${esc(c.brief)}</span></div>`,
      )
      .join("");
    ctx.out(
      `<div class="t-block">` +
        `<div class="t-dim">try <b>ls posts</b>, <b>grep git</b>, <b>open git/store</b>, <b>theme paper</b>. <b>man &lt;cmd&gt;</b> for details.</div>` +
        rows +
        `</div>`,
    );
  },
};

export const man: Cmd = {
  name: "man",
  brief: "alias of `help <cmd>`",
  run(args, ctx) {
    return help.run(args, ctx);
  },
};

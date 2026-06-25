import { esc, type Cmd } from "../types";

export const history: Cmd = {
  name: "history",
  brief: "show in-session command history",
  run(_args, ctx) {
    const h = ctx.history();
    if (h.length === 0) {
      ctx.out(`<div class="t-dim">(no history yet — try \`help\`)</div>`);
      return;
    }
    const rows = h
      .map(
        (line, i) =>
          `<div class="t-row"><span class="t-dim">${String(i + 1).padStart(
            4,
            " ",
          )}</span>  ${esc(line)}</div>`,
      )
      .join("");
    ctx.out(`<div class="t-block">${rows}</div>`);
  },
};

import { esc, type Cmd } from "../types";

const VALID = ["matrix", "amber", "paper"] as const;

export const theme: Cmd = {
  name: "theme",
  brief: "switch terminal theme: matrix | amber | paper",
  manual:
    "theme              # show current theme + list available\n" +
    "theme matrix       # classic black/green phosphor (default)\n" +
    "theme amber        # IBM 5151 monochrome amber\n" +
    "theme paper        # warm cream paper, editorial light mode\n" +
    "  Persists to localStorage (key: zn.term.theme.v1).",
  run(args, ctx) {
    if (!args[0]) {
      ctx.out(
        `<div class="t-block"><div>current: <b>${esc(
          ctx.getTheme(),
        )}</b></div><div class="t-dim">available: ${VALID.join(
          " | ",
        )}</div></div>`,
      );
      return;
    }
    const name = args[0].toLowerCase();
    if (!ctx.setTheme(name)) {
      ctx.out(
        `<div class="t-err">theme: unknown "${esc(
          name,
        )}". try: ${VALID.join(" | ")}</div>`,
      );
      return;
    }
    ctx.out(`<div class="t-dim">theme → ${esc(name)}</div>`);
  },
};

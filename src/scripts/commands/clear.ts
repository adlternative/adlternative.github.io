import type { Cmd } from "../types";

export const clear: Cmd = {
  name: "clear",
  brief: "wipe the screen (Ctrl+L)",
  run(_args, ctx) {
    ctx.clear();
  },
};

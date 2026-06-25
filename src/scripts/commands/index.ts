import type { Cmd } from "../types";

import { ls } from "./ls";
import { cat } from "./cat";
import { grep } from "./grep";
import { open } from "./open";
import { theme } from "./theme";
import { help, man } from "./help";
import { about, aboutAlias } from "./about";
import { clear } from "./clear";
import { history } from "./history";
import { sudo, vim, hack } from "./_easter-eggs";

// Canonical registry. Keys must match the .name field.
const list: Cmd[] = [
  help,
  man,
  ls,
  cat,
  grep,
  open,
  theme,
  about,
  aboutAlias,
  clear,
  history,
  // easter eggs intentionally not listed in `help`
  sudo,
  vim,
  hack,
];

export const commands: Record<string, Cmd> = Object.fromEntries(
  list.map((c) => [c.name, c]),
);

// Names that should NOT be advertised by `help`. We render `help` from
// the registry; easter eggs filter themselves out by setting a marker.
const HIDDEN = new Set(["man", "about", "sudo", "vim", "hack"]);

// Re-export a filtered view for `help` to consume.
(commands as any).__visible = Object.fromEntries(
  list.filter((c) => !HIDDEN.has(c.name)).map((c) => [c.name, c]),
);

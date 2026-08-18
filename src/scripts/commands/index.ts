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
import { fortune } from "./fortune";
import { cowsay } from "./cowsay";
import { tree } from "./tree";
import { neofetch } from "./neofetch";
import { date, echo, coin, roll, coffee, exitCmd } from "./misc";
import { agent } from "./agent";
import {
  sudo,
  vim,
  hack,
  fortytwo,
  xyzzy,
  please,
  matrixCmd,
  rm,
  qBang,
  wqBang,
  make,
} from "./_easter-eggs";

// Canonical registry. Keys must match the .name field.
const list: Cmd[] = [
  // visible — listed in `help`
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
  fortune,
  cowsay,
  tree,
  neofetch,
  date,
  echo,
  coin,
  roll,
  coffee,
  exitCmd,
  agent,
  // easter eggs — registered but filtered from `help`
  sudo,
  vim,
  hack,
  fortytwo,
  xyzzy,
  please,
  matrixCmd,
  rm,
  qBang,
  wqBang,
  make,
];

export const commands: Record<string, Cmd> = Object.fromEntries(
  list.map((c) => [c.name, c]),
);

// Names that should NOT be advertised by `help`.
const HIDDEN = new Set([
  "man",
  "about",
  // easter eggs
  "sudo",
  "vim",
  "hack",
  "42",
  "xyzzy",
  "please",
  "matrix",
  "rm",
  ":q",
  ":wq",
  "make",
]);

// Re-export a filtered view for `help` to consume.
(commands as any).__visible = Object.fromEntries(
  list.filter((c) => !HIDDEN.has(c.name)).map((c) => [c.name, c]),
);

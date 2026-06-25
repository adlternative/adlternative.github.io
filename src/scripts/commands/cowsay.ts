import { esc, type Cmd } from "../types";

// Wraps text into a classic cowsay speech bubble. Supports `-f tux` and `-f dragon`.
function makeBubble(text: string): string[] {
  const max = 36;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  if (!lines.length) lines.push("");

  const width = Math.max(...lines.map((l) => l.length));
  const top = " " + "_".repeat(width + 2);
  const bot = " " + "-".repeat(width + 2);
  const body = lines.map((l, i, a) => {
    const left = a.length === 1 ? "<" : i === 0 ? "/" : i === a.length - 1 ? "\\" : "|";
    const right = a.length === 1 ? ">" : i === 0 ? "\\" : i === a.length - 1 ? "/" : "|";
    return `${left} ${l.padEnd(width, " ")} ${right}`;
  });
  return [top, ...body, bot];
}

const COW = [
  "        \\   ^__^",
  "         \\  (oo)\\_______",
  "            (__)\\       )\\/\\",
  "                ||----w |",
  "                ||     ||",
];

const TUX = [
  "      \\",
  "       \\",
  "        .--.",
  "       |o_o |",
  "       |:_/ |",
  "      //   \\ \\",
  "     (|     | )",
  "    /'\\_   _/`\\",
  "    \\___)=(___/",
];

const DRAGON = [
  "      \\                    / \\  //\\",
  "       \\    |\\___/|      /   \\//  \\\\",
  "            /0  0  \\__  /    //  | \\ \\",
  "           /     /  \\/_/    //   |  \\  \\",
  "           \\ ___\\____/ /  ~~-.   |   \\   \\",
  "            \\/     ~~~~/      `. |    \\   `.",
  "                              `. \\     \\    `.",
];

export const cowsay: Cmd = {
  name: "cowsay",
  brief: "what does the cow say?",
  manual:
    "cowsay hello world\n" +
    "cowsay -f tux       hello world\n" +
    "cowsay -f dragon    rawr",
  run(args, ctx) {
    let critter = COW;
    if (args[0] === "-f" && args[1]) {
      const f = args[1];
      if (f === "tux") critter = TUX;
      else if (f === "dragon") critter = DRAGON;
      args = args.slice(2);
    }
    const text = args.join(" ").trim() || "moo.";
    const bubble = makeBubble(text);
    const out = [...bubble, ...critter].map((l) => esc(l)).join("\n");
    ctx.out(`<div class="t-block"><pre class="t-mono t-ascii">${out}</pre></div>`);
  },
};

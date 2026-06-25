import { esc, type Cmd } from "../types";

// Programmer / git / unix flavored fortunes. Keep them short; one-liners pop.
const QUOTES: { q: string; by?: string }[] = [
  { q: "Talk is cheap. Show me the code.", by: "Linus Torvalds" },
  { q: "If debugging is the process of removing bugs, then programming must be the process of putting them in.", by: "Edsger W. Dijkstra" },
  { q: "There are two hard things in computer science: cache invalidation, naming things, and off-by-one errors." },
  { q: "Premature optimization is the root of all evil.", by: "Donald Knuth" },
  { q: "Programs must be written for people to read, and only incidentally for machines to execute.", by: "Abelson & Sussman" },
  { q: "A language that doesn't affect the way you think about programming is not worth knowing.", by: "Alan Perlis" },
  { q: "git push --force is a cry for help, not a command." },
  { q: "Make it work. Make it right. Make it fast.", by: "Kent Beck" },
  { q: "First, solve the problem. Then, write the code.", by: "John Johnson" },
  { q: "Any sufficiently advanced bug is indistinguishable from a feature." },
  { q: "Real programmers count from 0." },
  { q: "There's no place like 127.0.0.1." },
  { q: "It's not a bug — it's an undocumented feature." },
  { q: "I have not failed. I've just found 10,000 ways that won't compile.", by: "Thomas Edison (apocryphal)" },
  { q: "Computers are useless. They can only give you answers.", by: "Pablo Picasso" },
  { q: "The best error message is the one that never shows up.", by: "Thomas Fuchs" },
  { q: "Weeks of coding can save you hours of planning." },
  { q: "Code never lies. Comments sometimes do.", by: "Ron Jeffries" },
  { q: "If you can't explain it to a duck, you don't understand it." },
  { q: "When in doubt, blame the cache." },
  { q: "Rebase early, rebase often. Force-push never." },
  { q: "Trust the process. Verify the diff." },
];

export const fortune: Cmd = {
  name: "fortune",
  brief: "a random programmer-ish quote",
  manual:
    "fortune          # one random quote\n" +
    "fortune -n 3     # three quotes",
  run(args, ctx) {
    let n = 1;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "-n" && args[i + 1]) n = Math.max(1, Math.min(5, parseInt(args[++i], 10) || 1));
    }
    const picked: typeof QUOTES = [];
    const pool = QUOTES.slice();
    for (let i = 0; i < n && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    const rows = picked
      .map((p) => {
        const line = `“${esc(p.q)}”`;
        const by = p.by ? `<div class="t-dim">  — ${esc(p.by)}</div>` : "";
        return `<div class="t-mono">${line}</div>${by}`;
      })
      .join("<br/>");
    ctx.out(`<div class="t-block">${rows}</div>`);
  },
};

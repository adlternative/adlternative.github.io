import { esc, type Cmd } from "../types";

// neofetch-style banner with logo + key/value column.
const LOGO = [
  "       ____  ____  ____      ",
  "      /\\  _`\\/\\  _`\\/\\  _`\\   ",
  "      \\ \\,\\L\\_\\ \\ \\/\\ \\ \\ \\/\\_\\ ",
  "       \\/_\\__ \\\\ \\ \\ \\ \\ \\ \\/_/_",
  "         /\\ \\L\\ \\ \\ \\_\\ \\ \\ \\L\\ \\",
  "         \\ `\\____\\ \\____/\\ \\____/",
  "          \\/_____/\\/___/  \\/___/ ",
];

function rowOf(label: string, value: string) {
  return `<span class="t-cmd">${esc(label.padEnd(8, " "))}</span> ${value}`;
}

function uptime(): string {
  const start = new Date("2014-01-01T00:00:00Z").getTime();
  const days = Math.floor((Date.now() - start) / 86400000);
  const y = Math.floor(days / 365);
  const d = days % 365;
  return `${y}y ${d}d (since 2014)`;
}

export const neofetch: Cmd = {
  name: "neofetch",
  brief: "system info, sort of",
  run(_args, ctx) {
    const theme = (ctx as any).getTheme?.() ?? "matrix";
    const width = window.innerWidth;
    const height = window.innerHeight;
    const lang = (navigator.language || "en").toLowerCase();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const ua = navigator.userAgent.match(/(Chrome|Firefox|Safari|Edg)\/[\d.]+/g)?.slice(-1)[0] ?? "browser";
    const postCount = (ctx as any).posts?.length ?? 0;
    const totalTags = new Set<string>();
    ((ctx as any).posts ?? []).forEach((p: any) => p.tags?.forEach((t: string) => totalTags.add(t)));

    const rows = [
      rowOf("user", `<b>zhening</b>@<b>adl.sh</b>`),
      rowOf("os",   `the web (static)`),
      rowOf("host", `Astro v4 + GitHub Pages`),
      rowOf("shell",`adl.sh v1.1`),
      rowOf("theme",`<b>${esc(theme)}</b>`),
      rowOf("res",  `${width}x${height}`),
      rowOf("lang", esc(lang)),
      rowOf("tz",   esc(tz)),
      rowOf("ua",   esc(ua)),
      rowOf("posts",`<b>${postCount}</b> across <b>${totalTags.size}</b> tags`),
      rowOf("up",   uptime()),
    ];

    const left = LOGO.map((l) => esc(l));
    const merged: string[] = [];
    const max = Math.max(left.length, rows.length);
    for (let i = 0; i < max; i++) {
      const l = (left[i] ?? "".padEnd(38, " ")).padEnd(38, " ");
      const r = rows[i] ?? "";
      merged.push(`<div class="t-mono">${l}${r}</div>`);
    }
    ctx.out(`<div class="t-block t-banner">${merged.join("")}</div>`);
  },
};

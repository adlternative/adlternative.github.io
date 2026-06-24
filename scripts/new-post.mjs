#!/usr/bin/env node
/**
 * Scaffold a new blog post.
 *
 * Usage:
 *   npm run new -- <category> "<Post Title>"
 *   npm run new -- git "Understanding the reftable format"
 *
 * Creates: src/content/blog/<category>/<slug>.md with frontmatter filled in.
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const [, , category, ...titleParts] = process.argv;

if (!category || titleParts.length === 0) {
  console.error('Usage: npm run new -- <category> "<Post Title>"');
  console.error('Example: npm run new -- git "Reftable internals"');
  process.exit(1);
}

const title = titleParts.join(" ");
// Build a slug. Keep ASCII letters/digits and CJK characters; turn everything
// else into a single dash. Astro strips "+" from slugs, so map it explicitly.
let slug = title
  .toLowerCase()
  .replace(/\+/g, "p")
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
  .replace(/^-+|-+$/g, "");

// Fallback for titles that produce an empty slug (e.g. emoji-only).
if (!slug) {
  slug = "post-" + Date.now();
}

function pad(n) {
  return String(n).padStart(2, "0");
}
const now = new Date();
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
  now.getDate(),
)} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

const dir = join(ROOT, "src", "content", "blog", category);
const file = join(dir, `${slug}.md`);

try {
  await access(file);
  console.error(`Refusing to overwrite existing file: ${file}`);
  process.exit(1);
} catch {
  // file does not exist — good
}

const content = `---
title: '${title.replace(/'/g, "\\'")}'
date: ${date}
tags: ${category}
draft: true
---

Write your post here. Remove \`draft: true\` to publish.
`;

await mkdir(dir, { recursive: true });
await writeFile(file, content, "utf8");
console.log(`Created ${file}`);
console.log(`Run "npm run dev" and visit /blog/${category}/${slug}`);

import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

const isProd = import.meta.env.PROD;

/** All non-draft posts (drafts hidden in prod, shown in dev), newest first. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) =>
    isProd ? !data.draft : true,
  );
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Top-level folder of a post slug, e.g. "git/store" -> "git". */
export function categoryOf(post: Post): string {
  return post.slug.includes("/") ? post.slug.split("/")[0] : "misc";
}

/** Astro strips "+" from slugs, so "c++" becomes "c" — map it back. */
const CATEGORY_DISPLAY: Record<string, string> = { c: "c++" };
export function categoryLabel(cat: string): string {
  return CATEGORY_DISPLAY[cat] ?? cat;
}

/** Canonical URL for a post. */
export function postUrl(post: Post): string {
  return `/posts/${post.slug}/`;
}

export function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fmtDateTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** Human-readable size like `ls -h`, e.g. 4200 -> "4.1K". */
export function fmtSize(bytes: number): string {
  const units = ["B", "K", "M", "G"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  // Whole bytes show no decimal; larger units show one decimal.
  const val = i === 0 ? String(Math.round(n)) : n.toFixed(1);
  return `${val}${units[i]}`.padStart(5, " ");
}

/**
 * A stable, tongue-in-cheek `ls -l` permission string for a post.
 * Everything is world-readable; a post gets the "executable" bit when it
 * has code-ish tags, purely for terminal flavour.
 */
export function permString(post: Post): string {
  const tags = (post.data.tags ?? []).map((t) => t.toLowerCase());
  const codey = ["c++", "linux", "git", "os", "perf", "db", "shell", "ai"];
  const exec = tags.some((t) => codey.includes(t));
  return exec ? "-rwxr-xr-x" : "-rw-r--r--";
}

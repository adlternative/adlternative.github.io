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

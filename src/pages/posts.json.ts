import type { APIRoute } from "astro";
import { getPosts, categoryOf, fmtDate } from "../utils/posts";

/**
 * Build-time endpoint: serialize the blog collection to JSON for the
 * in-browser pseudo-terminal. Body is excerpted (no full text), so the
 * payload stays well under 200KB even with 50+ posts.
 */
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const payload = posts.map((post) => {
    const excerpt = post.body
      .replace(/^---[\s\S]*?---/, " ")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[#>*_~]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);

    return {
      slug: post.slug,
      title: post.data.title,
      date: fmtDate(post.data.date),
      tags: post.data.tags,
      category: categoryOf(post),
      description: excerpt,
    };
  });

  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

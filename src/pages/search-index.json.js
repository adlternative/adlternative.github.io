import { getPosts, categoryOf, categoryLabel, postUrl, fmtDate } from "../utils/posts";

export async function GET() {
  const posts = await getPosts();
  const items = await Promise.all(
    posts.map(async (post) => {
      // Strip markdown/HTML to plain-ish text for search; cap length.
      const text = post.body
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/`[^`]*`/g, " ")
        .replace(/[#>*_~\-\[\]()!]/g, " ")
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/\s+/g, " ")
        .slice(0, 2000);
      return {
        title: post.data.title,
        url: postUrl(post),
        date: fmtDate(post.data.date),
        category: categoryLabel(categoryOf(post)),
        tags: post.data.tags,
        text,
      };
    }),
  );
  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json" },
  });
}

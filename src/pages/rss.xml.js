import rss from "@astrojs/rss";
import { getPosts, postUrl } from "../utils/posts";

export async function GET(context) {
  const posts = await getPosts();
  return rss({
    title: "ZheNing Hu's Blog",
    description: "Software developer notes on git, C++, linux, perf and more.",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      link: postUrl(post),
    })),
  });
}

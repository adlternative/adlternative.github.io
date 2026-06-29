import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    titleZh: z.string().optional(),
    // Existing posts use "YYYY-MM-DD HH:MM:SS"; coerce to Date.
    date: z.coerce.date(),
    // tags may be a single string or a list in the old posts.
    tags: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((t) => (t == null ? [] : Array.isArray(t) ? t : [t])),
    draft: z.boolean().optional().default(false),
  }),
});

export const collections = { blog };

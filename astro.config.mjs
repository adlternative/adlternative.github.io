import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://adlternative.github.io",
  markdown: {
    shikiConfig: {
      // Terminal-green theme that matches the site aesthetic
      theme: "github-dark",
      wrap: true,
    },
  },
});

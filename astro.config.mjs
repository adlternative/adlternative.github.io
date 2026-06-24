import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://adlternative.github.io",
  // We don't use Astro's image optimization, so use the passthrough service
  // and avoid pulling in sharp (whose binary download can hang on CI).
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
  markdown: {
    shikiConfig: {
      // Terminal-green theme that matches the site aesthetic
      theme: "github-dark",
      wrap: true,
    },
  },
});

# adlternative's website

My World! → https://adlternative.github.io/

A terminal-green static blog built with [Astro](https://astro.build/).
Black background, lime monospace, dashed borders — real Markdown rendering
with syntax highlighting, tags, categories and RSS.

## Branch layout

- **`source`** — the Astro source code (this branch). Edit here.
- **`gh-pages`** — built static output. Generated automatically by CI.
  Do not edit by hand.

## Writing a new post

The whole point: drop a Markdown file in and it renders automatically.

```sh
# scaffold a post (category becomes the folder + default tag)
npm run new -- git "Reftable internals"
# => src/content/blog/git/reftable-internals.md  (draft: true)
```

Or just create `src/content/blog/<category>/<slug>.md` manually with
frontmatter:

```markdown
---
title: 'My Post Title'
date: 2025-01-01 12:00:00
tags: git
---

Your content here. ```code``` blocks get syntax highlighting.
```

Remove `draft: true` (or omit it) to publish. Posts are grouped by their
top-level folder (`git`, `c++`, `linux`, `gsoc`, `life`, `perf`, ...).

## Local development

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # output to ./dist
npm run preview  # preview the production build
```

## Deploying

Push to `source`. GitHub Actions builds and publishes `dist/` to the
`gh-pages` branch, which GitHub Pages serves. Make sure repo
**Settings → Pages → Source** points at the `gh-pages` branch.

---

Originally forked from https://github.com/Denton-L/denton-l.github.io —
rebuilt on Astro while keeping the original terminal aesthetic.

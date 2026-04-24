# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Litos is an Astro 6 + React 19 + Tailwind 4 blog theme. It's a static site with MDX content collections, client-side React islands for interactive widgets, and Pagefind-powered search.

## Commands

Package manager: **pnpm** (required — there is a `pnpm-lock.yaml`).

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Astro dev server at `http://localhost:4321` |
| `pnpm build` | Runs `astro check` then `astro build`; `postbuild` invokes `pagefind --site dist` to build the search index |
| `pnpm check` | Astro/TypeScript diagnostics only (no build) |
| `pnpm preview` | Serve the built `dist/` locally |
| `pnpm format` | Prettier check |
| `pnpm format:write` | Prettier write (cached) |

Env vars live in `.env` (see `.env.example`). The default comment system (Giscus) needs no env vars — `repoId` and `categoryId` in `src/config.ts` are public identifiers generated at https://giscus.app.

There is no unit test runner configured. "Tests" here mean `astro check` + a clean `pnpm build`.

## Path Alias

`~/*` → `src/*` (configured in `tsconfig.json`). Always import via `~/...` rather than relative paths when crossing directories.

## Architecture

### Content → Pages

Content collections are defined in `src/content.config.ts` and loaded with Astro's `glob` loader:

- `posts` — `src/content/posts/**/*.{md,mdx}`. Zod schema includes `draft`, `pinned`, `recommend`, `postType`, `coverLayout`, `license`, and auto-transforms `ogImage` to use `cover` when `POSTS_CONFIG.ogImageUseCover` is true.
- `projects` — `src/content/projects/**/*.{md,mdx}`.

Pages consume collections through helpers in `src/lib/data.ts` (`getAllPosts`, `getPinnedPosts`, `getNumPosts`, `getAllTags`, `getAllProjects`) which filter drafts and sort by `updatedDate ?? pubDate` descending.

Static routes:

- `src/pages/posts/[...page].astro` — paginated list (page size from `POSTS_CONFIG.postPageConfig.size`)
- `src/pages/posts/[...id].astro` — single post; passes `prev`/`next` via `getStaticPaths`
- `src/pages/tags/[tag]/...` — tag filter pages
- `src/pages/{rss.xml,atom.xml}.js` — feeds generated in `src/lib/feed.ts`

### Post Rendering Pipeline

A single post route picks a layout at render time:

```
frontmatter.postType ?? POSTS_CONFIG.postType
  → 'metaOnly' | 'coverSplit' | 'coverTop'
  → src/components/posts/layouts/{MetaOnly,CoverSplit,CoverTop}.astro
```

Post *cards* in lists are separate: `src/components/posts/card/List.astro` dispatches on `PostCardType` (`compact | image | time-line | minimal | cover`) per page config. If you add a new card type or layout, update both the dispatch map in `List.astro` and the `PostCardType` / `PostType` unions in `src/types.ts`.

### Markdown/MDX Plugins

All remark/rehype wiring is centralized in `plugins/index.ts` and registered in `astro.config.ts`. Astro's built-in Shiki is disabled (`syntaxHighlight: false`) in favor of Expressive Code configured in `ec.config.mjs` (Catppuccin macchiato/latte, `.dark` selector).

Custom plugins in `plugins/`:

- `remark-reading-time.ts` — sets `minutesRead` and `wordCount` on `file.data.astro.frontmatter`, surfaced via `remarkPluginFrontmatter` in post routes
- `remark-lqip.js` — low-quality image placeholders (paired with `src/styles/lqip.css`)
- `remark-github-card.ts` — turns GitHub repo references into cards (paired with `src/styles/github-card.css`)

`remark-directive-sugar` adds `:badge`, `:link`, `:image`, `:video` directives (see `plugins/index.ts` for config). Math is rendered via `remark-math` + `rehype-katex` (KaTeX CSS must be loaded — check `Head.astro`).

### Configuration

`src/config.ts` is the single source of truth for site metadata, feature toggles, navigation, social links, skills showcase, posts/projects/photos/tags page config, comment system, and analytics. Types live in `src/types.ts`. Prefer editing config over hardcoding into components.

### Photos

`src/lib/photos.ts` uses `import.meta.glob` (eager) to auto-import every image under `src/assets/photos/**/*.{webp,jpg,jpeg,png}`, then groups them by directory name. Adding a new photo group means:

1. Drop images into `src/assets/photos/YYYY-MM-DD-slug/`
2. Add a `PhotoData` entry to `PhotosList` with matching `dir` and per-image `variant[]`

### Client Islands

Interactive React components (e.g. `GithubContributions.tsx`, `ThemeToggle.tsx`, `PhotoGalleryModal.tsx`, `Tooltip.tsx`) are hydrated with Astro directives — most commonly `client:load`. Prefer `client:visible` or `client:idle` where possible to avoid shipping JS for above-the-fold-only widgets. State is shared via `nanostores` + `@nanostores/react` (see `src/stores/theme.ts`).

### Styling

Tailwind 4 via `@tailwindcss/vite`. Global styles in `src/styles/global.css` + feature-specific sheets (`markdown.css`, `lqip.css`, `github-card.css`) imported at the top of `Layout.astro`. Icons use `@iconify/tailwind4` — write `icon-[ri--github-fill]` as a className; browse sets at https://icon-sets.iconify.design/.

### Prettier

Config in `.prettierrc`: no semis, single quotes, 140 width, `prettier-plugin-astro` loaded. `.astro` files use the Astro parser with `astroAllowShorthand: true`.

## Gotchas

- `astro build` runs `astro check` first — type errors will block the build, not just `pnpm check`.
- The `transition` flag in `SITE` toggles Astro View Transitions on the root layout; individual pages can opt out with `disableViewTransition`.
- Dark mode uses a `.dark` class on `<html>` (not `media` query), and Expressive Code themes are keyed to this via `themeCssSelector` in `ec.config.mjs`.
- Pagefind needs a completed build to produce the search index — dev server search will be empty until `pnpm build` runs.

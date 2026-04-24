import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import robotsTxt from 'astro-robots-txt'
import expressiveCode from 'astro-expressive-code'
import { remarkPlugins, rehypePlugins } from './plugins'
import { SITE } from './src/config'

export default defineConfig({
  site: SITE.website,
  base: SITE.base,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Vite default is 500. 800 leaves headroom for motion + floating-ui chunks
      // without hiding a runaway bundle on the next upgrade.
      chunkSizeWarningLimit: 800,
    },
  },
  markdown: {
    syntaxHighlight: false,
    remarkPlugins,
    rehypePlugins,
  },
  // extendMarkdownConfig: true is the default; setting it explicitly documents that .mdx
  // files share the remark/rehype plugin list declared above.
  integrations: [expressiveCode(), mdx({ extendMarkdownConfig: true }), react(), sitemap(), robotsTxt()],
})

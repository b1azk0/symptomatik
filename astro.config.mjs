// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// NOTE: Astro 5/6 removed `output: 'hybrid'`. Equivalent intent (mostly static,
// API routes on-demand) is achieved with `output: 'server'` + per-page
// `export const prerender = true`. Static pages opt-in; SSR routes available
// for S2+ API work without any config change.
export default defineConfig({
  site: 'https://symptomatik.com',
  output: 'server',
  adapter: cloudflare({
    imageService: 'compile',
    platformProxy: { enabled: true },
  }),
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [react(), mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl', 'es'],
    routing: { prefixDefaultLocale: false },
  },
});

// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

// NOTE: Astro 6 removed `output: 'hybrid'`. For a 95%-SSG site with a few future
// API routes (S2+), `output: 'static'` is the cleaner default — pages prerender
// automatically; only API routes opt out via `export const prerender = false`.
// The Cloudflare adapter still enables server routes when prerender is disabled.
export default defineConfig({
  site: 'https://symptomatik.com',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
  }),
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [react(), mdx()],
  vite: {
    // @ts-expect-error — @tailwindcss/vite plugin typings vs Vite's PluginOption: works at runtime
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl', 'es'],
    routing: { prefixDefaultLocale: false },
  },
});

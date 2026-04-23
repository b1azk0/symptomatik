// @ts-check
import { defineConfig } from 'astro/config';
import { execSync } from 'node:child_process';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import sitemap from './src/integrations/sitemap.ts';

/** @type {import('astro').AstroIntegration} */
const pagefindIntegration = {
  name: 'symptomatik:pagefind',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const site = dir.pathname;
      logger.info(`Running pagefind against ${site}`);
      try {
        execSync(
          `pnpm pagefind --site "${site}" --glob "{medical-tests/**/*.html,pl/badania/**/*.html}"`,
          { stdio: 'inherit', shell: '/bin/sh' },
        );
      } catch (err) {
        logger.error('Pagefind indexing failed');
        throw err;
      }
    },
  },
};

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
  integrations: [react(), mdx(), sitemap({ site: 'https://symptomatik.com' }), pagefindIntegration],
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl', 'es'],
    routing: { prefixDefaultLocale: false },
  },
});

// Minimal Astro config for vitest — no CF adapter (it conflicts with the
// vitest environment). Used only when running `pnpm test`.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://symptomatik.com',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pl', 'es'],
    routing: { prefixDefaultLocale: false },
  },
});

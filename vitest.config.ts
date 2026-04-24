import { getViteConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

export default getViteConfig(
  {
    test: {
      environment: 'happy-dom',
      globals: false,
      include: ['tests/unit/**/*.test.ts'],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        'astro:content': fileURLToPath(new URL('./tests/stubs/astro-content.ts', import.meta.url)),
      },
    },
  },
  // Use a minimal Astro config without the CF adapter, which conflicts with
  // the vitest environment. Only .astro file compilation matters for tests.
  { configFile: 'astro.config.test.mjs' },
);

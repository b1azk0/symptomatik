# Symptomatik S0 — Foundation Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production-ready Astro 5 scaffold on Cloudflare Pages with i18n (EN at root, PL/ES prefixed, translated URL segments), SEO infrastructure, CI quality gates, and one validated content page (CBC) imported end-to-end from the in-repo Excel source. Everything out of scope lives in later sub-projects (S1–S9).

**Architecture:** Astro 5 in hybrid mode (`@astrojs/cloudflare` adapter) with React 18 islands, Tailwind 4, shadcn/ui (neutral preset). Content lives in Astro Content Collections with Zod-validated frontmatter generated from `content-sources/medical-tests.xlsx`. i18n routing uses a segment mapping table + `buildURL` pure function + middleware for `/en/` 301s and locale detection. Cloudflare-specific primitives (KV, R2) are committed behind `lib/infra/` interfaces so app code stays portable. CI enforces Lighthouse ≥ 90 SEO / ≥ 85 Perf, axe a11y, link check, JSON-LD shape, i18n coverage.

**Tech Stack:** Astro 5 · React 18 · TypeScript strict · Tailwind 4 · shadcn/ui · MDX · Zod · exceljs · Cloudflare Pages/Workers · Vitest · Playwright · axe-core · lychee · Lighthouse CI · pnpm.

**Source spec:** `docs/superpowers/specs/2026-04-21-symptomatik-s0-foundation-scaffold-design.md`

**Repo:** `github.com/b1azk0/symptomatik` (branch: `main`)

---

## File Structure Target

```
symptomatik/
├── .github/workflows/ci.yml
├── content-sources/medical-tests.xlsx          # EXISTS
├── public/
│   ├── favicon.svg
│   └── robots.txt
├── scripts/
│   └── import-medical-tests.ts
├── src/
│   ├── components/
│   │   ├── BaseLayout.astro
│   │   ├── ContentLayout.astro
│   │   ├── SEOHead.astro
│   │   ├── MedicalDisclaimer.astro
│   │   ├── LanguageSwitcher.astro
│   │   ├── BreadcrumbNav.astro
│   │   └── CookieConsent.tsx
│   ├── content/
│   │   ├── config.ts
│   │   └── medical-tests/
│   │       ├── en/complete-blood-count.mdx    # generated
│   │       └── pl/morfologia-krwi-cbc.mdx      # generated
│   ├── i18n/
│   │   ├── locales.ts
│   │   ├── routes.ts
│   │   └── ui.ts
│   ├── integrations/sitemap.ts
│   ├── lib/
│   │   ├── content/loaders.ts
│   │   ├── infra/
│   │   │   ├── rate-limiter.ts
│   │   │   └── file-store.ts
│   │   └── seo/
│   │       ├── json-ld.ts
│   │       └── meta.ts
│   ├── middleware.ts
│   ├── pages/
│   │   ├── index.astro
│   │   ├── [...slug].astro
│   │   ├── pl/index.astro + [...slug].astro
│   │   └── es/index.astro + [...slug].astro
│   └── styles/global.css
├── tests/
│   ├── unit/*.test.ts
│   └── e2e/*.spec.ts
├── astro.config.mjs
├── tailwind.config.ts
├── wrangler.toml
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json
├── package.json
├── CLAUDE.md
├── README.md                                    # EXISTS
└── CHANGELOG.md                                 # EXISTS
```

---

## Phase 1 — Project Scaffold (Tasks 1–5)

### Task 1: Initialize pnpm project with strict TypeScript

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.nvmrc`
- Create: `.editorconfig`

- [ ] **Step 1: Write `.nvmrc`**

```
20
```

- [ ] **Step 2: Write `.editorconfig`**

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 3: Initialize package.json**

Run: `pnpm init`

Then edit `package.json` to:

```json
{
  "name": "symptomatik",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check && tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "lint": "echo 'no linter configured yet'",
    "import:tests": "tsx scripts/import-medical-tests.ts"
  }
}
```

- [ ] **Step 4: Create strict `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "jsx": "preserve",
    "jsxImportSource": "react"
  },
  "include": ["src", "scripts", "tests", "astro.config.mjs"],
  "exclude": ["node_modules", "dist", ".astro"]
}
```

- [ ] **Step 5: Commit**

```bash
git add .nvmrc .editorconfig package.json tsconfig.json
git commit -m "chore: initialize pnpm project with strict TS config"
```

---

### Task 2: Install Astro 5 + create baseline

**Files:**
- Create: `astro.config.mjs`
- Create: `src/pages/index.astro` (temporary placeholder — will be replaced in Task 24)
- Modify: `package.json` (deps added)

- [ ] **Step 1: Install Astro 5 + essentials**

```bash
pnpm add -D astro@^5 @astrojs/check typescript@^5 tsx@^4
```

- [ ] **Step 2: Write minimal `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://symptomatik.com',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
```

- [ ] **Step 3: Write placeholder homepage**

Create `src/pages/index.astro`:

```astro
---
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Symptomatik</title>
  </head>
  <body>
    <h1>Symptomatik — scaffold bootstrapping</h1>
  </body>
</html>
```

- [ ] **Step 4: Verify dev server boots**

Run: `pnpm dev`
Expected: Astro serves at `http://localhost:4321/`, page shows "Symptomatik — scaffold bootstrapping".
Stop with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs src/pages/index.astro
git commit -m "chore: scaffold Astro 5 with placeholder homepage"
```

---

### Task 3: Add React 18, Tailwind 4, MDX, Cloudflare adapter

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json`
- Create: `tailwind.config.ts`
- Create: `src/styles/global.css`
- Create: `wrangler.toml`
- Modify: `src/pages/index.astro` (use Tailwind to prove it works)

- [ ] **Step 1: Install dependencies**

```bash
pnpm add -D @astrojs/react @astrojs/mdx @astrojs/cloudflare
pnpm add -D tailwindcss@^4 @tailwindcss/vite
pnpm add react@^18 react-dom@^18
pnpm add -D @types/react @types/react-dom
```

- [ ] **Step 2: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Write `src/styles/global.css`**

```css
@import 'tailwindcss';

:root {
  --color-brand-primary: #2563eb;
  --color-brand-disclaimer-bg: #fef3c7;
  --color-brand-disclaimer-border: #f59e0b;
}

html {
  font-family: theme('fontFamily.sans');
  color: #1f2937;
  background: #ffffff;
}

body {
  margin: 0;
  line-height: 1.6;
}
```

- [ ] **Step 4: Update `astro.config.mjs`** to wire adapters + hybrid mode + Tailwind

```js
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://symptomatik.com',
  output: 'hybrid',
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
```

- [ ] **Step 5: Write minimal `wrangler.toml`**

```toml
name = "symptomatik"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "dist"

[vars]
PUBLIC_SITE_URL = "https://symptomatik.com"
```

- [ ] **Step 6: Update homepage to use Tailwind (smoke test)**

Replace `src/pages/index.astro` with:

```astro
---
import '../styles/global.css';
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Symptomatik</title>
  </head>
  <body class="min-h-screen flex items-center justify-center">
    <h1 class="text-4xl font-serif text-gray-900">Symptomatik — scaffold bootstrapping</h1>
  </body>
</html>
```

- [ ] **Step 7: Verify build succeeds**

Run: `pnpm build`
Expected: `✓ Completed in ...`, no errors, `dist/` created.

- [ ] **Step 8: Verify dev server renders with Tailwind**

Run: `pnpm dev`
Visit `http://localhost:4321/` — heading should be centered, large, serif font.
Stop with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
git add astro.config.mjs tailwind.config.ts src/styles/global.css wrangler.toml src/pages/index.astro package.json pnpm-lock.yaml
git commit -m "chore: add React, Tailwind 4, MDX, Cloudflare adapter in hybrid mode"
```

---

### Task 4: Install shadcn/ui (neutral preset)

**Files:**
- Create: `components.json`
- Create: `src/components/ui/` (seed component via shadcn CLI)
- Modify: `src/styles/global.css` (shadcn CSS variables)
- Modify: `tsconfig.json` (verify `@/*` path alias works with shadcn)

- [ ] **Step 1: Initialize shadcn for Astro**

```bash
pnpm dlx shadcn@latest init --base-color neutral --yes
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes
- Tailwind config: `tailwind.config.ts`
- Components alias: `@/components`
- Utils alias: `@/lib/utils`

Expected: creates `components.json`, updates `src/styles/global.css` with neutral CSS variables, creates `src/lib/utils.ts`.

- [ ] **Step 2: Add a baseline component (Button) to verify setup**

```bash
pnpm dlx shadcn@latest add button
```

Expected: creates `src/components/ui/button.tsx`.

- [ ] **Step 3: Smoke test — use Button in homepage**

Update `src/pages/index.astro`:

```astro
---
import '../styles/global.css';
import { Button } from '@/components/ui/button';
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Symptomatik</title>
  </head>
  <body class="min-h-screen flex items-center justify-center flex-col gap-6">
    <h1 class="text-4xl font-serif text-gray-900">Symptomatik</h1>
    <Button client:load>shadcn works</Button>
  </body>
</html>
```

- [ ] **Step 4: Verify build + dev**

Run: `pnpm build`
Expected: no errors.

Run: `pnpm dev`
Visit `http://localhost:4321/` — button appears, styled.
Stop.

- [ ] **Step 5: Commit**

```bash
git add components.json src/lib/utils.ts src/components/ui/button.tsx src/styles/global.css src/pages/index.astro package.json pnpm-lock.yaml
git commit -m "chore: install shadcn/ui neutral preset + baseline Button"
```

---

### Task 5: Write project `CLAUDE.md`

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# Symptomatik — Agent Context

Working directory for the Symptomatik.com multilingual health platform. This file is loaded by Claude Code at the start of any session in this repo.

## What this is

Multilingual (EN/ES/PL) health platform: lab results interpretation, symptom checker, mental health self-assessments, health calculators. Freemium with Premium subscription. Built as 10 sub-projects (S0–S9); current focus is S0 (foundation scaffold).

## Where things are

- **Design specs:** `docs/superpowers/specs/YYYY-MM-DD-*-design.md`
- **Implementation plans:** `docs/superpowers/plans/YYYY-MM-DD-*.md`
- **Content source of truth:** `content-sources/medical-tests.xlsx` (102 tests × EN+PL)
- **Generated content:** `src/content/medical-tests/{en,pl}/*.mdx`
- **i18n routing logic:** `src/i18n/routes.ts` (segment mapping + `buildURL`)
- **Portability interfaces:** `src/lib/infra/` (CF primitives live here; app code depends on interfaces)

## Hard rules (project-specific)

1. **No Cloudflare-specific types (`KVNamespace`, `R2Bucket`, `caches.default`) outside `src/lib/infra/`.** They stay behind interfaces.
2. **All AI API calls go through `src/lib/ai/router.ts`** (lands in S2). Never call SDKs directly from components/pages.
3. **Every medical content page must include `<MedicalDisclaimer>`** — spec and liability requirement.
4. **`SEOHead` is the single source of truth for structured data.** Don't emit JSON-LD elsewhere.
5. **No auto-redirect from `/` by `Accept-Language`** — Google explicitly discourages it. Locale switching is user-driven via `<LanguageSwitcher>`.
6. **EN has no URL prefix.** `/en/...` 301-redirects to root. PL and ES use `/pl/` and `/es/` prefixes with translated URL segments.

## Common commands

- `pnpm dev` — local dev server
- `pnpm build` — production build
- `pnpm check` — typecheck + Astro check
- `pnpm test` — Vitest unit tests
- `pnpm test:e2e` — Playwright E2E tests
- `pnpm import:tests` — regenerate MDX from `content-sources/medical-tests.xlsx`

## Related

- **ClaudioBrain:** `~/GitHub/ClaudioBrain/` — cross-repo context, conventions
- **Sibling Astro + CF project:** `~/GitHub/blazejmrozinski.com/`
- **Entity:** Digital Savages (code hosted under `github.com/b1azk0/symptomatik`)
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add project CLAUDE.md with agent context"
```

---

## Phase 2 — i18n Infrastructure (Tasks 6–10)

### Task 6: Locale constants and types

**Files:**
- Create: `src/i18n/locales.ts`
- Create: `tests/unit/locales.test.ts`

- [ ] **Step 1: Install Vitest + DOM env**

```bash
pnpm add -D vitest@^2 @vitest/ui happy-dom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: false,
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Write failing test `tests/unit/locales.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { locales, defaultLocale, isLocale } from '@/i18n/locales';

describe('locales', () => {
  it('exports the 3 supported locales', () => {
    expect(locales).toEqual(['en', 'pl', 'es']);
  });

  it('default locale is en', () => {
    expect(defaultLocale).toBe('en');
  });

  it('isLocale returns true for valid locales', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('pl')).toBe(true);
    expect(isLocale('es')).toBe(true);
  });

  it('isLocale returns false for invalid input', () => {
    expect(isLocale('de')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale('EN')).toBe(false);
  });
});
```

- [ ] **Step 4: Run the test — expect fail**

Run: `pnpm test`
Expected: FAIL — module `@/i18n/locales` not found.

- [ ] **Step 5: Write `src/i18n/locales.ts`**

```ts
export const locales = ['en', 'pl', 'es'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
```

- [ ] **Step 6: Run test — expect pass**

Run: `pnpm test`
Expected: all 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts src/i18n/locales.ts tests/unit/locales.test.ts package.json pnpm-lock.yaml
git commit -m "feat(i18n): locale constants + type guard with tests"
```

---

### Task 7: Segment mapping table + `buildURL` pure function

**Files:**
- Create: `src/i18n/routes.ts`
- Create: `tests/unit/buildURL.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/buildURL.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildURL, localePrefix, collectionSegments } from '@/i18n/routes';

describe('localePrefix', () => {
  it('EN has empty prefix', () => {
    expect(localePrefix.en).toBe('');
  });
  it('PL prefixes with /pl', () => {
    expect(localePrefix.pl).toBe('/pl');
  });
  it('ES prefixes with /es', () => {
    expect(localePrefix.es).toBe('/es');
  });
});

describe('collectionSegments.medical-tests', () => {
  it('EN uses medical-tests', () => {
    expect(collectionSegments['medical-tests'].en).toBe('medical-tests');
  });
  it('PL uses badania', () => {
    expect(collectionSegments['medical-tests'].pl).toBe('badania');
  });
  it('ES uses pruebas', () => {
    expect(collectionSegments['medical-tests'].es).toBe('pruebas');
  });
});

describe('buildURL', () => {
  it('builds EN URL without locale prefix', () => {
    expect(buildURL({ lang: 'en', collection: 'medical-tests', slug: 'complete-blood-count' }))
      .toBe('/medical-tests/complete-blood-count/');
  });

  it('builds PL URL with /pl/ prefix and translated segment', () => {
    expect(buildURL({ lang: 'pl', collection: 'medical-tests', slug: 'morfologia-krwi-cbc' }))
      .toBe('/pl/badania/morfologia-krwi-cbc/');
  });

  it('builds ES URL with /es/ prefix and translated segment', () => {
    expect(buildURL({ lang: 'es', collection: 'medical-tests', slug: 'hemograma-completo' }))
      .toBe('/es/pruebas/hemograma-completo/');
  });

  it('always produces trailing slash', () => {
    const result = buildURL({ lang: 'en', collection: 'medical-tests', slug: 'x' });
    expect(result.endsWith('/')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `pnpm test`
Expected: FAIL — module `@/i18n/routes` not found.

- [ ] **Step 3: Write `src/i18n/routes.ts`**

```ts
import type { Locale } from './locales';

export const localePrefix: Record<Locale, string> = {
  en: '',
  pl: '/pl',
  es: '/es',
} as const;

export const collectionSegments = {
  'medical-tests': { en: 'medical-tests', pl: 'badania', es: 'pruebas' },
  // Future: 'symptoms', 'diseases', 'calculators', 'mental-health-assessments'
} as const;

export type Collection = keyof typeof collectionSegments;

export interface BuildURLArgs {
  lang: Locale;
  collection: Collection;
  slug: string;
}

export function buildURL(args: BuildURLArgs): string {
  const prefix = localePrefix[args.lang];
  const segment = collectionSegments[args.collection][args.lang];
  return `${prefix}/${segment}/${args.slug}/`;
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/routes.ts tests/unit/buildURL.test.ts
git commit -m "feat(i18n): segment mapping + buildURL pure function"
```

---

### Task 8: UI string translations

**Files:**
- Create: `src/i18n/ui.ts`
- Create: `tests/unit/ui.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/ui.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ui, t } from '@/i18n/ui';
import { locales } from '@/i18n/locales';

describe('UI translations', () => {
  it('has all locales populated', () => {
    for (const locale of locales) {
      expect(ui[locale]).toBeDefined();
    }
  });

  it('every key has a value in every locale (i18n coverage)', () => {
    const enKeys = Object.keys(ui.en);
    for (const locale of locales) {
      const localeKeys = Object.keys(ui[locale]);
      for (const key of enKeys) {
        expect(localeKeys, `missing "${key}" in ${locale}`).toContain(key);
      }
    }
  });
});

describe('t() helper', () => {
  it('returns the string for the given locale', () => {
    expect(t('en', 'nav.symptomChecker')).toBe('Symptom Checker');
    expect(t('pl', 'nav.symptomChecker')).toBe('Sprawdź objawy');
  });

  it('falls back to EN when a key is missing in the locale (should never happen if coverage test passes)', () => {
    // forcibly cast to exercise fallback
    expect(t('pl', 'nav.symptomChecker' as const)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `pnpm test`
Expected: FAIL — `@/i18n/ui` not found.

- [ ] **Step 3: Write `src/i18n/ui.ts`**

```ts
import type { Locale } from './locales';
import { defaultLocale } from './locales';

export const ui = {
  en: {
    'nav.symptomChecker': 'Symptom Checker',
    'nav.labResults': 'Check Your Lab Results',
    'nav.mentalHealth': 'Mental Health Tests',
    'nav.calculators': 'Calculators',
    'footer.legal.privacy': 'Privacy Policy',
    'footer.legal.terms': 'Terms of Service',
    'footer.legal.medicalDisclaimer': 'Medical Disclaimer',
    'footer.legal.cookiePolicy': 'Cookie Policy',
    'disclaimer.content': 'The information on this page is for educational purposes only and is not medical advice. Always consult a qualified healthcare professional for diagnosis and treatment.',
    'disclaimer.aiResult': 'This interpretation is AI-generated and educational. It is not a medical diagnosis. Always confirm with a qualified healthcare professional.',
    'language.switcher.label': 'Language',
    'cookie.banner.text': 'We use cookieless analytics (Cloudflare) always. With your consent we also load Google Analytics for aggregate insights.',
    'cookie.banner.accept': 'Accept analytics',
    'cookie.banner.reject': 'Reject',
    'breadcrumbs.home': 'Home',
    'breadcrumbs.medicalTests': 'Medical Tests',
    'lastReviewed': 'Last reviewed',
  },
  pl: {
    'nav.symptomChecker': 'Sprawdź objawy',
    'nav.labResults': 'Sprawdź wyniki badań',
    'nav.mentalHealth': 'Testy zdrowia psychicznego',
    'nav.calculators': 'Kalkulatory',
    'footer.legal.privacy': 'Polityka prywatności',
    'footer.legal.terms': 'Warunki korzystania',
    'footer.legal.medicalDisclaimer': 'Zastrzeżenie medyczne',
    'footer.legal.cookiePolicy': 'Polityka cookies',
    'disclaimer.content': 'Informacje na tej stronie służą wyłącznie celom edukacyjnym i nie stanowią porady medycznej. W sprawie diagnozy i leczenia zawsze konsultuj się z wykwalifikowanym lekarzem.',
    'disclaimer.aiResult': 'Ta interpretacja została wygenerowana przez AI i ma charakter edukacyjny. Nie jest diagnozą medyczną. Zawsze potwierdź ją u wykwalifikowanego lekarza.',
    'language.switcher.label': 'Język',
    'cookie.banner.text': 'Zawsze używamy analityki bez ciasteczek (Cloudflare). Za Twoją zgodą ładujemy też Google Analytics dla zbiorczych statystyk.',
    'cookie.banner.accept': 'Akceptuj analitykę',
    'cookie.banner.reject': 'Odrzuć',
    'breadcrumbs.home': 'Strona główna',
    'breadcrumbs.medicalTests': 'Badania',
    'lastReviewed': 'Ostatnia weryfikacja',
  },
  es: {
    'nav.symptomChecker': 'Verificador de síntomas',
    'nav.labResults': 'Consulta tus análisis',
    'nav.mentalHealth': 'Tests de salud mental',
    'nav.calculators': 'Calculadoras',
    'footer.legal.privacy': 'Política de privacidad',
    'footer.legal.terms': 'Términos del servicio',
    'footer.legal.medicalDisclaimer': 'Aviso médico',
    'footer.legal.cookiePolicy': 'Política de cookies',
    'disclaimer.content': 'La información de esta página tiene fines educativos y no constituye consejo médico. Consulta siempre a un profesional sanitario cualificado para el diagnóstico y tratamiento.',
    'disclaimer.aiResult': 'Esta interpretación fue generada por IA y tiene fines educativos. No es un diagnóstico médico. Confírmala siempre con un profesional sanitario cualificado.',
    'language.switcher.label': 'Idioma',
    'cookie.banner.text': 'Siempre usamos analítica sin cookies (Cloudflare). Con tu consentimiento también cargamos Google Analytics para métricas agregadas.',
    'cookie.banner.accept': 'Aceptar analítica',
    'cookie.banner.reject': 'Rechazar',
    'breadcrumbs.home': 'Inicio',
    'breadcrumbs.medicalTests': 'Pruebas',
    'lastReviewed': 'Última revisión',
  },
} as const;

export type UIKey = keyof typeof ui.en;

export function t(locale: Locale, key: UIKey): string {
  const val = (ui[locale] as Record<string, string>)[key];
  if (val !== undefined) return val;
  return ui[defaultLocale][key];
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm test`

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ui.ts tests/unit/ui.test.ts
git commit -m "feat(i18n): UI string translations for EN/PL/ES with coverage test"
```

---

### Task 9: Middleware — locale detection + `/en/` 301

**Files:**
- Create: `src/middleware.ts`
- Create: `tests/unit/middleware.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/middleware.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { onRequest, resolveLocale } from '@/middleware';

function makeContext(url: string) {
  return {
    request: new Request(url),
    url: new URL(url),
    locals: {} as Record<string, unknown>,
    redirect: (location: string, status: number) =>
      new Response(null, { status, headers: { Location: location } }),
  };
}

describe('resolveLocale', () => {
  it('returns "en" for root', () => {
    expect(resolveLocale(new URL('https://symptomatik.com/'))).toBe('en');
  });
  it('returns "en" for /medical-tests/...', () => {
    expect(resolveLocale(new URL('https://symptomatik.com/medical-tests/cbc/'))).toBe('en');
  });
  it('returns "pl" for /pl/...', () => {
    expect(resolveLocale(new URL('https://symptomatik.com/pl/badania/cbc/'))).toBe('pl');
  });
  it('returns "es" for /es/...', () => {
    expect(resolveLocale(new URL('https://symptomatik.com/es/pruebas/cbc/'))).toBe('es');
  });
});

describe('onRequest middleware', () => {
  it('passes non-/en/ requests through to next()', async () => {
    const ctx = makeContext('https://symptomatik.com/medical-tests/cbc/');
    const next = vi.fn().mockResolvedValue(new Response('ok'));
    const res = await onRequest(ctx as any, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it('attaches locale to locals for PL paths', async () => {
    const ctx = makeContext('https://symptomatik.com/pl/badania/cbc/');
    const next = vi.fn().mockResolvedValue(new Response('ok'));
    await onRequest(ctx as any, next);
    expect(ctx.locals.locale).toBe('pl');
  });

  it('301-redirects /en/... to unprefixed', async () => {
    const ctx = makeContext('https://symptomatik.com/en/medical-tests/cbc/');
    const next = vi.fn();
    const res = await onRequest(ctx as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/medical-tests/cbc/');
  });

  it('301-redirects bare /en/ to /', async () => {
    const ctx = makeContext('https://symptomatik.com/en/');
    const res = await onRequest(ctx as any, vi.fn());
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/');
  });
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `pnpm test`
Expected: FAIL — `@/middleware` not found.

- [ ] **Step 3: Write `src/middleware.ts`**

```ts
import type { MiddlewareHandler } from 'astro';
import type { Locale } from '@/i18n/locales';

export function resolveLocale(url: URL): Locale {
  const segments = url.pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first === 'pl') return 'pl';
  if (first === 'es') return 'es';
  return 'en';
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { url } = context;
  const segments = url.pathname.split('/').filter(Boolean);

  // Strip accidental /en/ prefix → 301 to unprefixed root.
  if (segments[0] === 'en') {
    const stripped = '/' + segments.slice(1).join('/');
    const target = stripped === '/' ? '/' : stripped + (stripped.endsWith('/') ? '' : '/');
    return context.redirect(target, 301);
  }

  context.locals.locale = resolveLocale(url);
  return next();
};
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test`

- [ ] **Step 5: Commit**

```bash
git add src/middleware.ts tests/unit/middleware.test.ts
git commit -m "feat(i18n): middleware for locale detection and /en/ 301 redirect"
```

---

### Task 10: Content loaders (alternates discovery by `canonicalSlug`)

**Files:**
- Create: `src/lib/content/loaders.ts`
- Create: `tests/unit/loaders.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/loaders.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { findAlternatesByCanonicalSlug } from '@/lib/content/loaders';

type Entry = { data: { slug: string; canonicalSlug: string; lang: 'en' | 'pl' | 'es' } };
const entries: Entry[] = [
  { data: { slug: 'complete-blood-count', canonicalSlug: 'complete-blood-count', lang: 'en' } },
  { data: { slug: 'morfologia-krwi-cbc', canonicalSlug: 'complete-blood-count', lang: 'pl' } },
  { data: { slug: 'comprehensive-metabolic-panel', canonicalSlug: 'comprehensive-metabolic-panel', lang: 'en' } },
];

describe('findAlternatesByCanonicalSlug', () => {
  it('returns entries with the same canonicalSlug', () => {
    const result = findAlternatesByCanonicalSlug(entries as any, 'complete-blood-count');
    expect(result).toHaveLength(2);
    const langs = result.map(e => e.data.lang).sort();
    expect(langs).toEqual(['en', 'pl']);
  });

  it('returns a single entry when only one locale exists', () => {
    const result = findAlternatesByCanonicalSlug(entries as any, 'comprehensive-metabolic-panel');
    expect(result).toHaveLength(1);
    expect(result[0]?.data.lang).toBe('en');
  });

  it('returns empty array for unknown canonicalSlug', () => {
    const result = findAlternatesByCanonicalSlug(entries as any, 'not-a-thing');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `pnpm test`

- [ ] **Step 3: Write `src/lib/content/loaders.ts`**

```ts
import type { CollectionEntry } from 'astro:content';

export function findAlternatesByCanonicalSlug<C extends 'medical-tests'>(
  entries: CollectionEntry<C>[],
  canonicalSlug: string,
): CollectionEntry<C>[] {
  return entries.filter((e) => (e.data as { canonicalSlug: string }).canonicalSlug === canonicalSlug);
}
```

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test`

- [ ] **Step 5: Commit**

```bash
git add src/lib/content/loaders.ts tests/unit/loaders.test.ts
git commit -m "feat(content): alternates-by-canonicalSlug loader helper"
```

---

## Phase 3 — Content Pipeline (Tasks 11–14)

### Task 11: Content Collections schema

**Files:**
- Create: `src/content/config.ts`
- Create: `tests/unit/schema.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/schema.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'astro/zod';
import { medicalTestSchema } from '@/content/config';

const validRow = {
  slug: 'complete-blood-count',
  canonicalSlug: 'complete-blood-count',
  lang: 'en',
  title: 'Complete Blood Count (CBC)',
  category: 'Hematology',
  categorySlug: 'hematology',
  aiUseCase: 'Anemia, infections, inflammatory patterns',
  metaTitle: 'CBC Results & Ranges | Symptomatik',
  metaDescription: 'Understand your Complete Blood Count results and normal ranges.',
  h1: 'Complete Blood Count (CBC): Normal Ranges, Results & Interpretation',
  h1Text: 'A Complete Blood Count (CBC) is a common blood test...',
  sections: Array.from({ length: 5 }, (_, i) => ({ heading: `H2 ${i + 1}`, body: `Body ${i + 1}` })),
  publishedAt: '2026-04-21',
  updatedAt: '2026-04-21',
};

describe('medicalTestSchema', () => {
  it('accepts a valid row', () => {
    const result = medicalTestSchema.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  it('rejects metaTitle > 60 chars', () => {
    const result = medicalTestSchema.safeParse({
      ...validRow,
      metaTitle: 'x'.repeat(61),
    });
    expect(result.success).toBe(false);
  });

  it('rejects metaDescription > 160 chars', () => {
    const result = medicalTestSchema.safeParse({
      ...validRow,
      metaDescription: 'x'.repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it('rejects fewer than 5 sections', () => {
    const result = medicalTestSchema.safeParse({
      ...validRow,
      sections: validRow.sections.slice(0, 4),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid lang', () => {
    const result = medicalTestSchema.safeParse({ ...validRow, lang: 'de' });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `pnpm test`

- [ ] **Step 3: Write `src/content/config.ts`**

```ts
import { defineCollection, z } from 'astro:content';

export const medicalTestSchema = z.object({
  slug: z.string(),
  canonicalSlug: z.string(),
  lang: z.enum(['en', 'pl', 'es']),
  title: z.string(),
  titleAlt: z.string().optional(),
  category: z.string(),
  categorySlug: z.string(),
  aiUseCase: z.string(),
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(160),
  h1: z.string(),
  h1Text: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string(),
    }),
  ).length(5),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  relatedTests: z.array(z.string()).optional(),
  relatedSymptoms: z.array(z.string()).optional(),
});

const medicalTests = defineCollection({
  type: 'content',
  schema: medicalTestSchema,
});

export const collections = {
  'medical-tests': medicalTests,
};
```

Note: the test imports `from '@/content/config'` using Astro's Zod re-export. For Vitest (no Astro runtime), switch the test import to use `astro/zod` directly — already done above. Keep `src/content/config.ts` using `astro:content`'s `z` for Astro runtime.

- [ ] **Step 4: Run test — expect pass**

Run: `pnpm test`
If Vitest errors on `astro:content` import: use a vitest vite alias. Update `vitest.config.ts`:

```ts
resolve: {
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    'astro:content': fileURLToPath(new URL('./tests/stubs/astro-content.ts', import.meta.url)),
  },
},
```

Then create `tests/stubs/astro-content.ts`:

```ts
export { z } from 'astro/zod';
export function defineCollection<T>(c: T) { return c; }
```

Re-run `pnpm test`. All pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/config.ts tests/unit/schema.test.ts tests/stubs/astro-content.ts vitest.config.ts
git commit -m "feat(content): Zod schema for medical-tests collection with tests"
```

---

### Task 12: Scaffold Excel → MDX generator

**Files:**
- Create: `scripts/import-medical-tests.ts`
- Create: `tests/unit/slugify.test.ts`

- [ ] **Step 1: Install `exceljs`**

```bash
pnpm add -D exceljs@^4
```

- [ ] **Step 2: Write failing test `tests/unit/slugify.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { slugify } from '../../scripts/import-medical-tests';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Complete Blood Count')).toBe('complete-blood-count');
  });

  it('strips parentheses', () => {
    expect(slugify('Complete Blood Count (CBC)')).toBe('complete-blood-count-cbc');
  });

  it('handles Polish diacritics', () => {
    expect(slugify('Morfologia krwi (CBC)')).toBe('morfologia-krwi-cbc');
    expect(slugify('Próba wątrobowa')).toBe('proba-watrobowa');
  });

  it('collapses multiple spaces', () => {
    expect(slugify('A    B')).toBe('a-b');
  });

  it('strips slashes and other special chars', () => {
    expect(slugify('HbA1c / Glycated hemoglobin')).toBe('hba1c-glycated-hemoglobin');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });
});
```

- [ ] **Step 3: Run test — expect fail**

Run: `pnpm test`

- [ ] **Step 4: Write initial `scripts/import-medical-tests.ts` (slugify + CLI skeleton)**

```ts
#!/usr/bin/env tsx
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const PL_DIACRITICS: Record<string, string> = {
  ą: 'a', Ą: 'a', ć: 'c', Ć: 'c', ę: 'e', Ę: 'e',
  ł: 'l', Ł: 'l', ń: 'n', Ń: 'n', ó: 'o', Ó: 'o',
  ś: 's', Ś: 's', ź: 'z', Ź: 'z', ż: 'z', Ż: 'z',
};

export function slugify(input: string): string {
  if (!input) return '';
  let s = input;
  for (const [from, to] of Object.entries(PL_DIACRITICS)) {
    s = s.split(from).join(to);
  }
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// --- CLI entry (will be fleshed out in Task 13) ---
interface CLIOpts {
  excel: string;
  locales: string[];
  out: string;
  dryRun: boolean;
  onlySlug: string | null;
}

function parseArgs(argv: string[]): CLIOpts {
  const opts: CLIOpts = {
    excel: path.join(repoRoot, 'content-sources/medical-tests.xlsx'),
    locales: ['en', 'pl'],
    out: path.join(repoRoot, 'src/content/medical-tests'),
    dryRun: false,
    onlySlug: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--excel') opts.excel = argv[++i] ?? opts.excel;
    else if (a === '--locales') opts.locales = (argv[++i] ?? 'en,pl').split(',');
    else if (a === '--out') opts.out = argv[++i] ?? opts.out;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--only') opts.onlySlug = argv[++i] ?? null;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log('Options:', opts);
  // Implementation continues in Task 13.
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 5: Run slugify tests — expect pass**

Run: `pnpm test`

- [ ] **Step 6: Smoke run**

```bash
pnpm import:tests --dry-run
```

Expected: prints `Options: { excel: '.../medical-tests.xlsx', locales: ['en','pl'], ... }` and exits 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/import-medical-tests.ts tests/unit/slugify.test.ts package.json pnpm-lock.yaml
git commit -m "feat(content): slugify + CLI skeleton for Excel import script"
```

---

### Task 13: Implement full Excel → MDX import with validation

**Files:**
- Modify: `scripts/import-medical-tests.ts`
- Create: `tests/unit/import-parse.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/import-parse.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { rowToFrontmatter, renderMdx } from '../../scripts/import-medical-tests';

const enRow = {
  'test name': 'Complete Blood Count (CBC)',
  'test name ii': 'Complete Blood Count (CBC)',
  'category': 'Hematology',
  'ai use-case': 'Anemia, infections, inflammatory patterns',
  'meta title': 'Complete Blood Count (CBC) - Results & Ranges | Symptomatik',
  'meta description': 'Get your CBC results interpreted instantly. Understand normal ranges.',
  'h1 title': 'Complete Blood Count (CBC): Normal Ranges, Results & Interpretation',
  'h1_text': 'A Complete Blood Count (CBC) is a common blood test...',
  'h2_1': 'Online CBC Results Interpretation',
  'h2_1_text': 'Accessing CBC results online...',
  'h2_2': 'What Is CBC and How to Read the Results?',
  'h2_2_text': 'A CBC is a routine blood test...',
  'h2_3': 'When to Get a CBC Test',
  'h2_3_text': 'Get a CBC when you have symptoms...',
  'h2_4': 'Normal CBC Values by Age and Gender',
  'h2_4_text': 'Normal CBC values vary...',
  'h2_5': 'CBC: Indications, Preparation, Procedure & Side Effects',
  'h2_5_text': 'A CBC is a quick, commonly ordered blood test...',
};

describe('rowToFrontmatter', () => {
  it('produces canonical EN frontmatter', () => {
    const fm = rowToFrontmatter(enRow, {
      lang: 'en',
      canonicalSlug: 'complete-blood-count',
      today: new Date('2026-04-21'),
    });
    expect(fm.slug).toBe('complete-blood-count');
    expect(fm.canonicalSlug).toBe('complete-blood-count');
    expect(fm.lang).toBe('en');
    expect(fm.title).toBe('Complete Blood Count (CBC)');
    expect(fm.category).toBe('Hematology');
    expect(fm.categorySlug).toBe('hematology');
    expect(fm.aiUseCase).toBe('Anemia, infections, inflammatory patterns');
    expect(fm.sections).toHaveLength(5);
    expect(fm.sections[0]?.heading).toBe('Online CBC Results Interpretation');
    expect(fm.publishedAt).toBe('2026-04-21');
    expect(fm.updatedAt).toBe('2026-04-21');
  });

  it('truncates metaTitle to 60 chars with ellipsis signal', () => {
    const fm = rowToFrontmatter(
      { ...enRow, 'meta title': 'x'.repeat(200) },
      { lang: 'en', canonicalSlug: 'x', today: new Date('2026-04-21') },
    );
    // Script policy: fail rather than silently truncate. We expect an error instead.
    // Adjust expectation to match chosen policy below in renderMdx tests.
    expect(fm.metaTitle.length).toBeLessThanOrEqual(60);
  });
});

describe('renderMdx', () => {
  it('produces valid MDX with YAML frontmatter', () => {
    const fm = rowToFrontmatter(enRow, {
      lang: 'en',
      canonicalSlug: 'complete-blood-count',
      today: new Date('2026-04-21'),
    });
    const mdx = renderMdx(fm);
    expect(mdx.startsWith('---\n')).toBe(true);
    expect(mdx).toContain('slug: complete-blood-count');
    expect(mdx).toContain('canonicalSlug: complete-blood-count');
    expect(mdx).toContain('lang: en');
    // Body is auto-generated placeholder
    expect(mdx).toContain('auto-generated from frontmatter');
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm test`

- [ ] **Step 3: Flesh out the importer**

Replace the full contents of `scripts/import-medical-tests.ts` with:

```ts
#!/usr/bin/env tsx
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ────────────────────────────────────────────────────────────────────────────
// slugify
// ────────────────────────────────────────────────────────────────────────────

const PL_DIACRITICS: Record<string, string> = {
  ą: 'a', Ą: 'a', ć: 'c', Ć: 'c', ę: 'e', Ę: 'e',
  ł: 'l', Ł: 'l', ń: 'n', Ń: 'n', ó: 'o', Ó: 'o',
  ś: 's', Ś: 's', ź: 'z', Ź: 'z', ż: 'z', Ż: 'z',
};

export function slugify(input: string): string {
  if (!input) return '';
  let s = input;
  for (const [from, to] of Object.entries(PL_DIACRITICS)) {
    s = s.split(from).join(to);
  }
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ────────────────────────────────────────────────────────────────────────────
// Row types
// ────────────────────────────────────────────────────────────────────────────

type Row = Record<string, string>;

export interface Frontmatter {
  slug: string;
  canonicalSlug: string;
  lang: 'en' | 'pl' | 'es';
  title: string;
  titleAlt?: string;
  category: string;
  categorySlug: string;
  aiUseCase: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  h1Text: string;
  sections: { heading: string; body: string }[];
  publishedAt: string;
  updatedAt: string;
}

export interface RowToFrontmatterOpts {
  lang: 'en' | 'pl' | 'es';
  canonicalSlug: string;
  today: Date;
  preservePublishedAt?: string;
}

const EN_COL_MAP = {
  testName: 'test name',
  testNameAlt: 'test name ii',
  category: 'category',
  aiUseCase: 'ai use-case',
  metaTitle: 'meta title',
  metaDescription: 'meta description',
  h1: 'h1 title',
  h1Text: 'h1_text',
  h2_1: 'h2_1', h2_1_text: 'h2_1_text',
  h2_2: 'h2_2', h2_2_text: 'h2_2_text',
  h2_3: 'h2_3', h2_3_text: 'h2_3_text',
  h2_4: 'h2_4', h2_4_text: 'h2_4_text',
  h2_5: 'h2_5', h2_5_text: 'h2_5_text',
} as const;

const PL_COL_MAP = {
  testName: 'nazwa testu',
  testNameAlt: 'nazwa testu ii',
  category: 'kategoria',
  aiUseCase: 'ai use-case',
  metaTitle: 'meta title',
  metaDescription: 'meta description',
  h1: 'h1 title',
  h1Text: 'h1_text',
  h2_1: 'h2_1', h2_1_text: 'h2_1_text',
  h2_2: 'h2_2', h2_2_text: 'h2_2_text',
  h2_3: 'h2_3', h2_3_text: 'h2_3_text',
  h2_4: 'h2_4', h2_4_text: 'h2_4_text',
  h2_5: 'h2_5', h2_5_text: 'h2_5_text',
} as const;

function colMap(lang: 'en' | 'pl' | 'es'): Record<string, string> {
  if (lang === 'pl') return PL_COL_MAP as unknown as Record<string, string>;
  return EN_COL_MAP as unknown as Record<string, string>;
}

function requireCell(row: Row, key: string, rowNum: number, sheetName: string): string {
  const v = row[key];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required column "${key}" at row ${rowNum} in sheet "${sheetName}"`);
  }
  return v.trim();
}

export function rowToFrontmatter(row: Row, opts: RowToFrontmatterOpts): Frontmatter {
  const m = colMap(opts.lang);
  const testName = row[m.testName]?.trim() ?? '';
  const category = row[m.category]?.trim() ?? '';

  const slug = slugify(testName);
  const metaTitle = (row[m.metaTitle] ?? '').trim();
  const metaDescription = (row[m.metaDescription] ?? '').trim();

  if (metaTitle.length > 60) {
    throw new Error(`metaTitle exceeds 60 chars for "${testName}" (${opts.lang}): ${metaTitle.length} chars`);
  }
  if (metaDescription.length > 160) {
    throw new Error(`metaDescription exceeds 160 chars for "${testName}" (${opts.lang}): ${metaDescription.length} chars`);
  }

  const sections: { heading: string; body: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const headingKey = `h2_${i}`;
    const bodyKey = `h2_${i}_text`;
    const heading = (row[m[headingKey] ?? headingKey] ?? '').trim();
    const body = (row[m[bodyKey] ?? bodyKey] ?? '').trim();
    if (!heading || !body) {
      throw new Error(`Missing H2_${i} or H2_${i}_text for "${testName}" (${opts.lang})`);
    }
    sections.push({ heading, body });
  }

  const today = opts.today.toISOString().slice(0, 10);
  return {
    slug,
    canonicalSlug: opts.canonicalSlug,
    lang: opts.lang,
    title: testName,
    titleAlt: row[m.testNameAlt]?.trim() || undefined,
    category,
    categorySlug: slugify(category),
    aiUseCase: (row[m.aiUseCase] ?? '').trim(),
    metaTitle,
    metaDescription,
    h1: (row[m.h1] ?? '').trim(),
    h1Text: (row[m.h1Text] ?? '').trim(),
    sections,
    publishedAt: opts.preservePublishedAt ?? today,
    updatedAt: today,
  };
}

export function renderMdx(fm: Frontmatter): string {
  const yaml = [
    '---',
    `slug: ${JSON.stringify(fm.slug)}`,
    `canonicalSlug: ${JSON.stringify(fm.canonicalSlug)}`,
    `lang: ${fm.lang}`,
    `title: ${JSON.stringify(fm.title)}`,
    fm.titleAlt ? `titleAlt: ${JSON.stringify(fm.titleAlt)}` : null,
    `category: ${JSON.stringify(fm.category)}`,
    `categorySlug: ${JSON.stringify(fm.categorySlug)}`,
    `aiUseCase: ${JSON.stringify(fm.aiUseCase)}`,
    `metaTitle: ${JSON.stringify(fm.metaTitle)}`,
    `metaDescription: ${JSON.stringify(fm.metaDescription)}`,
    `h1: ${JSON.stringify(fm.h1)}`,
    `h1Text: ${JSON.stringify(fm.h1Text)}`,
    'sections:',
    ...fm.sections.flatMap((s) => [
      `  - heading: ${JSON.stringify(s.heading)}`,
      `    body: ${JSON.stringify(s.body)}`,
    ]),
    `publishedAt: ${fm.publishedAt}`,
    `updatedAt: ${fm.updatedAt}`,
    '---',
    '',
    '{/* auto-generated from frontmatter — body content is rendered via `sections` field */}',
    '',
  ].filter((l) => l !== null).join('\n');
  return yaml;
}

// ────────────────────────────────────────────────────────────────────────────
// Workbook reading
// ────────────────────────────────────────────────────────────────────────────

async function readSheet(excelPath: string, sheetName: string): Promise<Row[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`Sheet "${sheetName}" not found in ${excelPath}`);

  const headers: string[] = [];
  const rows: Row[] = [];
  ws.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
    const values = (excelRow.values as unknown as (string | undefined)[]).slice(1); // col 0 is null in exceljs
    if (rowNumber === 1) {
      for (const v of values) headers.push(String(v ?? '').trim().toLowerCase());
      return;
    }
    const row: Row = {};
    values.forEach((v, idx) => {
      const key = headers[idx];
      if (key) row[key] = String(v ?? '');
    });
    if (Object.values(row).some((v) => v.trim() !== '')) rows.push(row);
  });

  return rows;
}

const SHEET_BY_LANG: Record<string, string> = {
  en: 'EN - SEO optimized',
  pl: 'PL - original',
};

// ────────────────────────────────────────────────────────────────────────────
// CLI
// ────────────────────────────────────────────────────────────────────────────

interface CLIOpts {
  excel: string;
  locales: string[];
  out: string;
  dryRun: boolean;
  onlySlug: string | null;
}

function parseArgs(argv: string[]): CLIOpts {
  const opts: CLIOpts = {
    excel: path.join(repoRoot, 'content-sources/medical-tests.xlsx'),
    locales: ['en', 'pl'],
    out: path.join(repoRoot, 'src/content/medical-tests'),
    dryRun: false,
    onlySlug: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--excel') opts.excel = argv[++i] ?? opts.excel;
    else if (a === '--locales') opts.locales = (argv[++i] ?? 'en,pl').split(',');
    else if (a === '--out') opts.out = argv[++i] ?? opts.out;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--only') opts.onlySlug = argv[++i] ?? null;
  }
  return opts;
}

function extractExistingPublishedAt(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  const content = readFileSync(filePath, 'utf8');
  const m = content.match(/^publishedAt:\s*([\d-]+)\s*$/m);
  return m?.[1];
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const today = new Date();
  let planned = 0;

  // Pre-read EN sheet to build the row-index → canonicalSlug map.
  // All locale sheets are assumed to be row-aligned with the EN sheet (same ordering).
  const enRows = await readSheet(opts.excel, SHEET_BY_LANG.en);
  const canonicalByIndex = new Map<number, string>();
  const seen = new Map<string, string>();
  enRows.forEach((row, idx) => {
    const name = row['test name']?.trim() ?? '';
    if (!name) return;
    const slug = slugify(name);
    if (seen.has(slug)) {
      throw new Error(`Slug collision in EN sheet: "${seen.get(slug)}" vs "${name}" both → "${slug}"`);
    }
    seen.set(slug, name);
    canonicalByIndex.set(idx, slug);
  });

  for (const lang of opts.locales) {
    if (lang !== 'en' && lang !== 'pl' && lang !== 'es') {
      throw new Error(`Unsupported locale: ${lang}`);
    }
    const sheetName = SHEET_BY_LANG[lang];
    if (!sheetName) throw new Error(`No sheet mapping for locale "${lang}"`);

    const rows = (lang === 'en') ? enRows : await readSheet(opts.excel, sheetName);

    if (rows.length !== enRows.length) {
      throw new Error(
        `Row count mismatch: ${lang} sheet has ${rows.length} rows but EN sheet has ${enRows.length}. ` +
        `Sheets must be row-aligned (same ordering).`,
      );
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const m = colMap(lang);
      const testName = row[m.testName]?.trim() ?? '';
      if (!testName) continue;

      const canonicalSlug = canonicalByIndex.get(i);
      if (!canonicalSlug) {
        throw new Error(`Row ${i + 2} has no canonicalSlug (EN row empty at same index). Fix the EN sheet.`);
      }

      if (opts.onlySlug && canonicalSlug !== opts.onlySlug) continue;

      const slug = slugify(testName);
      const outDir = path.join(opts.out, lang);
      const outFile = path.join(outDir, `${slug}.mdx`);
      const existingPublishedAt = extractExistingPublishedAt(outFile);

      const fm = rowToFrontmatter(row, {
        lang,
        canonicalSlug,
        today,
        preservePublishedAt: existingPublishedAt,
      });

      const mdx = renderMdx(fm);

      if (opts.dryRun) {
        console.log(`[dry-run] would write ${outFile} (${mdx.length} bytes)`);
      } else {
        await mkdir(outDir, { recursive: true });
        await writeFile(outFile, mdx, 'utf8');
        console.log(`wrote ${outFile}`);
      }
      planned++;
    }
  }

  console.log(`\n${opts.dryRun ? 'planned' : 'wrote'} ${planned} file(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm test`

- [ ] **Step 5: Dry-run against full Excel**

Run: `pnpm import:tests --dry-run`
Expected: lists "planned" writes for all EN + PL rows, no errors.

- [ ] **Step 6: Commit**

```bash
git add scripts/import-medical-tests.ts tests/unit/import-parse.test.ts
git commit -m "feat(content): full Excel → MDX importer with validation and idempotency"
```

---

### Task 14: Generate CBC MDX (EN + PL) — golden-path content

**Files:**
- Create: `src/content/medical-tests/en/complete-blood-count.mdx` (generated)
- Create: `src/content/medical-tests/pl/morfologia-krwi-cbc.mdx` (generated)

- [ ] **Step 1: Run importer with `--only` filter for CBC**

```bash
pnpm import:tests --only complete-blood-count
```

Expected: two files written, no errors.

- [ ] **Step 2: Verify schema validation via `astro check`**

Run: `pnpm check`
Expected: 0 errors, 0 warnings.

If errors: fix `rowToFrontmatter` to satisfy schema (usually missing field or wrong type), re-run importer, re-check.

- [ ] **Step 3: Sanity-review the two files**

Open both MDX files; confirm:
- `---` YAML frontmatter block at top
- `slug`, `canonicalSlug`, `lang`, `title`, `sections` (5) all populated
- Body is the auto-generated comment

- [ ] **Step 4: Commit**

```bash
git add src/content/medical-tests/en/complete-blood-count.mdx src/content/medical-tests/pl/morfologia-krwi-cbc.mdx
git commit -m "content: generate CBC MDX (EN+PL) as golden-path content"
```

---

## Phase 4 — SEO Utilities + Core Components (Tasks 15–22)

### Task 15: SEO meta helpers

**Files:**
- Create: `src/lib/seo/meta.ts`
- Create: `tests/unit/seo-meta.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/seo-meta.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { canonicalURL, alternatesFor } from '@/lib/seo/meta';

const site = 'https://symptomatik.com';

describe('canonicalURL', () => {
  it('builds absolute EN URL', () => {
    expect(canonicalURL({ site, lang: 'en', collection: 'medical-tests', slug: 'cbc' }))
      .toBe('https://symptomatik.com/medical-tests/cbc/');
  });

  it('builds absolute PL URL', () => {
    expect(canonicalURL({ site, lang: 'pl', collection: 'medical-tests', slug: 'morfologia-krwi-cbc' }))
      .toBe('https://symptomatik.com/pl/badania/morfologia-krwi-cbc/');
  });
});

describe('alternatesFor', () => {
  it('emits EN + PL + x-default when both exist', () => {
    const entries = [
      { data: { lang: 'en', slug: 'cbc', canonicalSlug: 'cbc' } },
      { data: { lang: 'pl', slug: 'morfologia-krwi-cbc', canonicalSlug: 'cbc' } },
    ];
    const alts = alternatesFor({ entries: entries as any, site, collection: 'medical-tests' });
    const map = Object.fromEntries(alts.map(a => [a.hreflang, a.href]));
    expect(map['en']).toBe('https://symptomatik.com/medical-tests/cbc/');
    expect(map['pl']).toBe('https://symptomatik.com/pl/badania/morfologia-krwi-cbc/');
    expect(map['x-default']).toBe('https://symptomatik.com/medical-tests/cbc/');
  });

  it('omits missing locales cleanly', () => {
    const entries = [
      { data: { lang: 'en', slug: 'cbc', canonicalSlug: 'cbc' } },
    ];
    const alts = alternatesFor({ entries: entries as any, site, collection: 'medical-tests' });
    const langs = alts.map(a => a.hreflang).sort();
    expect(langs).toEqual(['en', 'x-default']);
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm test`

- [ ] **Step 3: Write `src/lib/seo/meta.ts`**

```ts
import type { CollectionEntry } from 'astro:content';
import { buildURL, type Collection } from '@/i18n/routes';
import type { Locale } from '@/i18n/locales';

export interface CanonicalURLArgs {
  site: string;
  lang: Locale;
  collection: Collection;
  slug: string;
}

export function canonicalURL(args: CanonicalURLArgs): string {
  const site = args.site.replace(/\/$/, '');
  const pathname = buildURL({ lang: args.lang, collection: args.collection, slug: args.slug });
  return `${site}${pathname}`;
}

export interface Alternate {
  hreflang: string;
  href: string;
}

export interface AlternatesArgs<C extends Collection> {
  entries: CollectionEntry<C>[];
  site: string;
  collection: C;
}

export function alternatesFor<C extends Collection>(args: AlternatesArgs<C>): Alternate[] {
  const alts: Alternate[] = [];
  let enHref: string | null = null;

  for (const e of args.entries) {
    const data = e.data as { lang: Locale; slug: string };
    const href = canonicalURL({ site: args.site, lang: data.lang, collection: args.collection, slug: data.slug });
    alts.push({ hreflang: data.lang, href });
    if (data.lang === 'en') enHref = href;
  }

  // x-default always points to EN when EN exists; otherwise the first alternate.
  const defaultHref = enHref ?? alts[0]?.href;
  if (defaultHref) alts.push({ hreflang: 'x-default', href: defaultHref });

  return alts;
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm test`

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/meta.ts tests/unit/seo-meta.test.ts
git commit -m "feat(seo): canonicalURL + alternatesFor helpers with hreflang x-default"
```

---

### Task 16: JSON-LD helpers

**Files:**
- Create: `src/lib/seo/json-ld.ts`
- Create: `tests/unit/json-ld.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/json-ld.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { medicalWebPage, breadcrumbList, webSite } from '@/lib/seo/json-ld';

describe('medicalWebPage', () => {
  it('emits @type=MedicalWebPage with core fields', () => {
    const ld = medicalWebPage({
      url: 'https://symptomatik.com/medical-tests/cbc/',
      title: 'CBC: Normal Ranges',
      description: 'Interpret CBC results.',
      lastReviewed: new Date('2026-04-21'),
      inLanguage: 'en',
    });
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('MedicalWebPage');
    expect(ld['url']).toBe('https://symptomatik.com/medical-tests/cbc/');
    expect(ld['name']).toBe('CBC: Normal Ranges');
    expect(ld['lastReviewed']).toBe('2026-04-21');
    expect(ld['inLanguage']).toBe('en');
  });

  it('omits author when not provided', () => {
    const ld = medicalWebPage({
      url: 'https://symptomatik.com/x/',
      title: 't', description: 'd', lastReviewed: new Date(), inLanguage: 'en',
    });
    expect((ld as any).author).toBeUndefined();
  });
});

describe('breadcrumbList', () => {
  it('numbers positions from 1', () => {
    const ld = breadcrumbList([
      { label: 'Home', href: 'https://symptomatik.com/' },
      { label: 'Medical Tests', href: 'https://symptomatik.com/medical-tests/' },
      { label: 'CBC' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0]).toMatchObject({ '@type': 'ListItem', position: 1, name: 'Home' });
    expect(ld.itemListElement[2]).toMatchObject({ position: 3, name: 'CBC' });
  });
});

describe('webSite', () => {
  it('emits WebSite schema with name and url', () => {
    const ld = webSite({ site: 'https://symptomatik.com', name: 'Symptomatik', inLanguage: 'en' });
    expect(ld['@type']).toBe('WebSite');
    expect(ld['url']).toBe('https://symptomatik.com');
    expect(ld['name']).toBe('Symptomatik');
    expect(ld['inLanguage']).toBe('en');
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm test`

- [ ] **Step 3: Write `src/lib/seo/json-ld.ts`**

```ts
import type { Locale } from '@/i18n/locales';

export interface MedicalWebPageArgs {
  url: string;
  title: string;
  description: string;
  lastReviewed: Date;
  inLanguage: Locale;
  datePublished?: Date;
}

export function medicalWebPage(args: MedicalWebPageArgs): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    url: args.url,
    name: args.title,
    description: args.description,
    inLanguage: args.inLanguage,
    lastReviewed: args.lastReviewed.toISOString().slice(0, 10),
  };
  if (args.datePublished) {
    ld.datePublished = args.datePublished.toISOString().slice(0, 10);
  }
  return ld;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function breadcrumbList(items: BreadcrumbItem[]): {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: Array<{ '@type': 'ListItem'; position: number; name: string; item?: string }>;
} {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => {
      const base = { '@type': 'ListItem' as const, position: idx + 1, name: it.label };
      return it.href ? { ...base, item: it.href } : base;
    }),
  };
}

export interface WebSiteArgs {
  site: string;
  name: string;
  inLanguage: Locale;
}

export function webSite(args: WebSiteArgs): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: args.site,
    name: args.name,
    inLanguage: args.inLanguage,
  };
}
```

- [ ] **Step 4: Run tests — expect pass**

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/json-ld.ts tests/unit/json-ld.test.ts
git commit -m "feat(seo): JSON-LD helpers for MedicalWebPage / BreadcrumbList / WebSite"
```

---

### Task 17: `SEOHead.astro`

**Files:**
- Create: `src/components/SEOHead.astro`

- [ ] **Step 1: Write `src/components/SEOHead.astro`**

```astro
---
import type { Alternate } from '@/lib/seo/meta';

interface Props {
  title: string;
  description: string;
  canonical: string;
  alternates: Alternate[];
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  locale: string;
}

const { title, description, canonical, alternates, ogImage, jsonLd, locale } = Astro.props as Props;
const ogImageAbsolute = ogImage ?? new URL('/og-default.png', Astro.site).toString();
const jsonLdArray = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content={description} />

<link rel="canonical" href={canonical} />

{alternates.map((a) => (
  <link rel="alternate" hreflang={a.hreflang} href={a.href} />
))}

<meta property="og:type" content="website" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={canonical} />
<meta property="og:locale" content={locale} />
<meta property="og:image" content={ogImageAbsolute} />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImageAbsolute} />

{jsonLdArray.map((ld) => (
  <script type="application/ld+json" set:html={JSON.stringify(ld)} />
))}

<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

- [ ] **Step 2: Smoke-check with build**

Temporarily import `SEOHead` from `src/pages/index.astro` in the `<head>`:

```astro
---
import '../styles/global.css';
import SEOHead from '@/components/SEOHead.astro';
---
<html lang="en">
  <head>
    <SEOHead
      title="Symptomatik"
      description="Multilingual health platform."
      canonical="https://symptomatik.com/"
      alternates={[{ hreflang: 'en', href: 'https://symptomatik.com/' }, { hreflang: 'x-default', href: 'https://symptomatik.com/' }]}
      locale="en"
    />
  </head>
  <body>
    <h1>Symptomatik</h1>
  </body>
</html>
```

Run: `pnpm build`
Expected: 0 errors.

Run: `pnpm dev` → view source on `/`: canonical, hreflang, OG tags all present.
Stop.

- [ ] **Step 3: Commit**

```bash
git add src/components/SEOHead.astro src/pages/index.astro
git commit -m "feat(components): SEOHead as single source of truth for head tags"
```

---

### Task 18: `MedicalDisclaimer.astro`

**Files:**
- Create: `src/components/MedicalDisclaimer.astro`

- [ ] **Step 1: Write the component**

```astro
---
import { t } from '@/i18n/ui';
import type { Locale } from '@/i18n/locales';

interface Props {
  locale: Locale;
  variant?: 'content' | 'ai-result';
}

const { locale, variant = 'content' } = Astro.props as Props;
const text = variant === 'ai-result' ? t(locale, 'disclaimer.aiResult') : t(locale, 'disclaimer.content');
---
<aside
  class="border-l-4 bg-amber-50 text-amber-900 px-4 py-3 my-6 text-sm rounded-r"
  style="border-color: var(--color-brand-disclaimer-border); background: var(--color-brand-disclaimer-bg);"
  role="note"
  aria-label="Medical disclaimer"
>
  <strong class="block mb-1">⚕︎ {locale === 'pl' ? 'Zastrzeżenie medyczne' : locale === 'es' ? 'Aviso médico' : 'Medical disclaimer'}</strong>
  <p class="m-0">{text}</p>
</aside>
```

- [ ] **Step 2: Smoke-test by adding to homepage**

Update `src/pages/index.astro` to include `<MedicalDisclaimer locale="en" />` below the heading.
Run `pnpm dev`, verify it renders with the amber-bordered box.
Revert the homepage change (we'll use disclaimer only in ContentLayout).

- [ ] **Step 3: Commit**

```bash
git add src/components/MedicalDisclaimer.astro
git commit -m "feat(components): MedicalDisclaimer with locale-aware copy and variants"
```

---

### Task 19: `LanguageSwitcher.astro`

**Files:**
- Create: `src/components/LanguageSwitcher.astro`

- [ ] **Step 1: Write the component**

```astro
---
import { t } from '@/i18n/ui';
import type { Locale } from '@/i18n/locales';
import type { Alternate } from '@/lib/seo/meta';

interface Props {
  currentLocale: Locale;
  alternates: Alternate[];
}

const { currentLocale, alternates } = Astro.props as Props;

const LABELS: Record<Locale, string> = { en: 'English', pl: 'Polski', es: 'Español' };

// Only show alternates where a real translation exists (not x-default).
const switchables = alternates.filter((a) => a.hreflang !== 'x-default');
---
<nav aria-label={t(currentLocale, 'language.switcher.label')} class="flex gap-2 items-center text-sm">
  <span class="sr-only">{t(currentLocale, 'language.switcher.label')}:</span>
  {switchables.map((a) => {
    const isCurrent = a.hreflang === currentLocale;
    return (
      <a
        href={a.href}
        lang={a.hreflang}
        aria-current={isCurrent ? 'page' : undefined}
        class={`px-2 py-1 rounded ${isCurrent ? 'bg-neutral-200 font-medium' : 'hover:bg-neutral-100'}`}
      >
        {LABELS[a.hreflang as Locale] ?? a.hreflang}
      </a>
    );
  })}
</nav>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LanguageSwitcher.astro
git commit -m "feat(components): LanguageSwitcher hides unavailable locales"
```

---

### Task 20: `BreadcrumbNav.astro`

**Files:**
- Create: `src/components/BreadcrumbNav.astro`

- [ ] **Step 1: Write the component**

```astro
---
interface BreadcrumbItem {
  label: string;
  href?: string;
}
interface Props {
  items: BreadcrumbItem[];
}

const { items } = Astro.props as Props;
---
<nav aria-label="Breadcrumb" class="text-sm text-neutral-600 my-4">
  <ol class="flex flex-wrap gap-1">
    {items.map((it, i) => (
      <li class="flex items-center gap-1">
        {it.href ? (
          <a href={it.href} class="hover:underline">{it.label}</a>
        ) : (
          <span aria-current="page" class="font-medium text-neutral-900">{it.label}</span>
        )}
        {i < items.length - 1 && <span aria-hidden="true">/</span>}
      </li>
    ))}
  </ol>
</nav>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BreadcrumbNav.astro
git commit -m "feat(components): BreadcrumbNav (visual only; JSON-LD emitted by SEOHead)"
```

---

### Task 21: `BaseLayout.astro`

**Files:**
- Create: `src/components/BaseLayout.astro`

- [ ] **Step 1: Write the component**

```astro
---
import '../styles/global.css';
import SEOHead from './SEOHead.astro';
import LanguageSwitcher from './LanguageSwitcher.astro';
import CookieConsent from './CookieConsent.tsx';
import { t } from '@/i18n/ui';
import type { Locale } from '@/i18n/locales';
import type { Alternate } from '@/lib/seo/meta';

interface Props {
  title: string;
  description: string;
  canonical: string;
  alternates: Alternate[];
  locale: Locale;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  ogImage?: string;
}

const { title, description, canonical, alternates, locale, jsonLd, ogImage } = Astro.props as Props;
const GA4_ID = import.meta.env.PUBLIC_GA4_ID ?? '';
const CF_ANALYTICS_TOKEN = import.meta.env.PUBLIC_CF_ANALYTICS_TOKEN ?? '';
---
<!doctype html>
<html lang={locale}>
  <head>
    <SEOHead {title} {description} {canonical} {alternates} {jsonLd} {locale} {ogImage} />

    {CF_ANALYTICS_TOKEN && (
      <script
        defer
        src="https://static.cloudflareinsights.com/beacon.min.js"
        data-cf-beacon={`{"token": "${CF_ANALYTICS_TOKEN}"}`}
      />
    )}
  </head>
  <body class="min-h-screen flex flex-col">
    <header class="border-b border-neutral-200 bg-white">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <a href={locale === 'en' ? '/' : `/${locale}/`} class="font-serif text-xl font-semibold">Symptomatik</a>
        <nav aria-label="Main" class="hidden md:flex gap-4 text-sm">
          <a href={locale === 'en' ? '/' : `/${locale}/`}>{t(locale, 'nav.symptomChecker')}</a>
          <a href={locale === 'en' ? '/' : `/${locale}/`}>{t(locale, 'nav.labResults')}</a>
          <a href={locale === 'en' ? '/' : `/${locale}/`}>{t(locale, 'nav.mentalHealth')}</a>
          <a href={locale === 'en' ? '/' : `/${locale}/`}>{t(locale, 'nav.calculators')}</a>
        </nav>
        <LanguageSwitcher currentLocale={locale} alternates={alternates} />
      </div>
    </header>

    <main class="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
      <slot />
    </main>

    <footer class="border-t border-neutral-200 mt-12 py-6 text-xs text-neutral-600">
      <div class="max-w-5xl mx-auto px-4 flex flex-wrap gap-4 justify-between">
        <span>© {new Date().getFullYear()} Symptomatik</span>
        <span class="flex gap-3">
          <a href={locale === 'en' ? '/privacy/' : `/${locale}/privacy/`}>{t(locale, 'footer.legal.privacy')}</a>
          <a href={locale === 'en' ? '/terms/' : `/${locale}/terms/`}>{t(locale, 'footer.legal.terms')}</a>
          <a href={locale === 'en' ? '/medical-disclaimer/' : `/${locale}/medical-disclaimer/`}>{t(locale, 'footer.legal.medicalDisclaimer')}</a>
          <a href={locale === 'en' ? '/cookies/' : `/${locale}/cookies/`}>{t(locale, 'footer.legal.cookiePolicy')}</a>
        </span>
      </div>
    </footer>

    <CookieConsent client:idle locale={locale} ga4Id={GA4_ID} />
  </body>
</html>
```

- [ ] **Step 2: Add `PUBLIC_GA4_ID` and `PUBLIC_CF_ANALYTICS_TOKEN` to env types**

Create/modify `src/env.d.ts`:

```ts
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_GA4_ID: string;
  readonly PUBLIC_CF_ANALYTICS_TOKEN: string;
  readonly PUBLIC_SITE_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 3: Commit (CookieConsent doesn't exist yet — next task creates it)**

We'll commit after Task 23 creates `CookieConsent.tsx` to avoid a broken intermediate state. Skip the commit for this task.

Note: the build will fail until Task 23 is complete. This is an intentional two-step coupling: BaseLayout references `CookieConsent`, which lands next.

---

### Task 22: `ContentLayout.astro`

**Files:**
- Create: `src/components/ContentLayout.astro`

- [ ] **Step 1: Write the component**

```astro
---
import BaseLayout from './BaseLayout.astro';
import MedicalDisclaimer from './MedicalDisclaimer.astro';
import BreadcrumbNav from './BreadcrumbNav.astro';
import { t } from '@/i18n/ui';
import type { Locale } from '@/i18n/locales';
import type { Alternate } from '@/lib/seo/meta';

interface BreadcrumbItem { label: string; href?: string; }
interface Props {
  title: string;
  description: string;
  canonical: string;
  alternates: Alternate[];
  locale: Locale;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  breadcrumbs: BreadcrumbItem[];
  h1: string;
  h1Text: string;
  sections: { heading: string; body: string }[];
  updatedAt: Date;
}

const { title, description, canonical, alternates, locale, jsonLd, breadcrumbs, h1, h1Text, sections, updatedAt } = Astro.props as Props;
const reviewedLabel = t(locale, 'lastReviewed');
const reviewedStr = updatedAt.toISOString().slice(0, 10);
---
<BaseLayout {title} {description} {canonical} {alternates} {locale} {jsonLd}>
  <BreadcrumbNav items={breadcrumbs} />
  <article class="prose max-w-none">
    <h1 class="font-serif text-3xl md:text-4xl text-neutral-900 mt-2 mb-4">{h1}</h1>
    <p class="text-neutral-700 leading-relaxed">{h1Text}</p>

    <MedicalDisclaimer locale={locale} variant="content" />

    {sections.map((s) => (
      <section class="mt-8">
        <h2 class="font-serif text-2xl text-neutral-900 mb-2">{s.heading}</h2>
        <p class="text-neutral-700 leading-relaxed">{s.body}</p>
      </section>
    ))}

    <p class="text-xs text-neutral-500 mt-12"><time datetime={reviewedStr}>{reviewedLabel}: {reviewedStr}</time></p>
  </article>
</BaseLayout>
```

- [ ] **Step 2: Commit (still broken until Task 23; hold)**

Same as Task 21 — part of the Phase 4/5 coupled commit.

---

## Phase 5 — Cookie Consent + Commit Layouts (Task 23)

### Task 23: `CookieConsent.tsx` React island + commit layouts

**Files:**
- Create: `src/components/CookieConsent.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'symptomatik:consent';

const COPY: Record<string, { text: string; accept: string; reject: string }> = {
  en: { text: 'We use cookieless analytics (Cloudflare) always. With your consent we also load Google Analytics for aggregate insights.', accept: 'Accept analytics', reject: 'Reject' },
  pl: { text: 'Zawsze używamy analityki bez ciasteczek (Cloudflare). Za Twoją zgodą ładujemy też Google Analytics dla zbiorczych statystyk.', accept: 'Akceptuj analitykę', reject: 'Odrzuć' },
  es: { text: 'Siempre usamos analítica sin cookies (Cloudflare). Con tu consentimiento también cargamos Google Analytics para métricas agregadas.', accept: 'Aceptar analítica', reject: 'Rechazar' },
};

function loadGA4(id: string) {
  if (!id) return;
  if (document.getElementById('ga4-script')) return;
  const s = document.createElement('script');
  s.id = 'ga4-script';
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(s);
  const s2 = document.createElement('script');
  s2.id = 'ga4-init';
  s2.innerHTML = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`;
  document.head.appendChild(s2);
}

interface Props {
  locale?: string;
  ga4Id?: string;
}

export default function CookieConsent({ locale = 'en', ga4Id = '' }: Props) {
  const [consent, setConsent] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      setConsent(v);
      if (v === 'yes' && ga4Id) loadGA4(ga4Id);
    } catch {
      /* localStorage blocked — behave as no-consent */
    } finally {
      setReady(true);
    }
  }, [ga4Id]);

  if (!ready) return null;
  if (consent === 'yes' || consent === 'no') return null;

  const copy = COPY[locale] ?? COPY.en;

  const accept = () => {
    try { window.localStorage.setItem(STORAGE_KEY, 'yes'); } catch {}
    setConsent('yes');
    if (ga4Id) loadGA4(ga4Id);
  };
  const reject = () => {
    try { window.localStorage.setItem(STORAGE_KEY, 'no'); } catch {}
    setConsent('no');
  };

  return (
    <div role="dialog" aria-label="Cookie consent" className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200 shadow-lg p-4 text-sm">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-3 justify-between">
        <p className="m-0 text-neutral-700">{copy.text}</p>
        <div className="flex gap-2">
          <button type="button" onClick={reject} className="px-3 py-1 rounded border border-neutral-300 hover:bg-neutral-100">{copy.reject}</button>
          <button type="button" onClick={accept} className="px-3 py-1 rounded bg-neutral-900 text-white hover:bg-neutral-800">{copy.accept}</button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build succeeds (all components integrated)**

Run: `pnpm build`
Expected: no errors.

- [ ] **Step 3: Commit all three components at once**

```bash
git add src/components/BaseLayout.astro src/components/ContentLayout.astro src/components/CookieConsent.tsx src/env.d.ts
git commit -m "feat(components): BaseLayout + ContentLayout + CookieConsent React island"
```

---

## Phase 6 — Pages + Routing (Tasks 24–27)

### Task 24: Homepage (`src/pages/index.astro`)

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace homepage with real BaseLayout-based content**

```astro
---
import BaseLayout from '@/components/BaseLayout.astro';
import { webSite } from '@/lib/seo/json-ld';

const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';
const canonical = site + '/';
const alternates = [
  { hreflang: 'en', href: canonical },
  { hreflang: 'pl', href: site + '/pl/' },
  { hreflang: 'es', href: site + '/es/' },
  { hreflang: 'x-default', href: canonical },
];

const jsonLd = webSite({ site, name: 'Symptomatik', inLanguage: 'en' });
---
<BaseLayout
  title="Symptomatik — Multilingual Health Information"
  description="Free and premium health platform: lab results interpretation, symptom checker, mental health tests, and health calculators."
  canonical={canonical}
  alternates={alternates}
  locale="en"
  jsonLd={jsonLd}
>
  <h1 class="font-serif text-4xl mb-4">Symptomatik</h1>
  <p class="text-lg text-neutral-700 max-w-2xl">
    Free, trustworthy health guidance. Lab results interpretation, symptom checking,
    mental health self-screening, and practical calculators.
  </p>
  <p class="mt-4 text-sm text-neutral-500">Scaffold live. Apps and content landing in future sub-projects.</p>
</BaseLayout>
```

- [ ] **Step 2: Verify `pnpm dev` renders**

Run: `pnpm dev` → visit `http://localhost:4321/`. Confirm layout renders, cookie banner visible, nav visible.
Stop.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat(pages): homepage with BaseLayout + WebSite JSON-LD"
```

---

### Task 25: EN content catch-all (`src/pages/[...slug].astro`)

**Files:**
- Create: `src/pages/[...slug].astro`

- [ ] **Step 1: Write the dynamic route**

```astro
---
import { getCollection } from 'astro:content';
import ContentLayout from '@/components/ContentLayout.astro';
import { buildURL } from '@/i18n/routes';
import { canonicalURL, alternatesFor } from '@/lib/seo/meta';
import { findAlternatesByCanonicalSlug } from '@/lib/content/loaders';
import { medicalWebPage, breadcrumbList } from '@/lib/seo/json-ld';
import { t } from '@/i18n/ui';

export async function getStaticPaths() {
  const all = await getCollection('medical-tests');
  const enEntries = all.filter((e) => e.data.lang === 'en');
  return enEntries.map((entry) => ({
    params: { slug: `medical-tests/${entry.data.slug}` },
    props: { entry, all },
  }));
}

const { entry, all } = Astro.props;
const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';

const canonical = canonicalURL({
  site, lang: 'en', collection: 'medical-tests', slug: entry.data.slug,
});
const alternatesEntries = findAlternatesByCanonicalSlug(all, entry.data.canonicalSlug);
const alternates = alternatesFor({ entries: alternatesEntries, site, collection: 'medical-tests' });

const breadcrumbs = [
  { label: t('en', 'breadcrumbs.home'), href: site + '/' },
  { label: t('en', 'breadcrumbs.medicalTests'), href: site + '/medical-tests/' },
  { label: entry.data.title },
];

const jsonLd = [
  medicalWebPage({
    url: canonical,
    title: entry.data.h1,
    description: entry.data.metaDescription,
    lastReviewed: entry.data.updatedAt,
    datePublished: entry.data.publishedAt,
    inLanguage: 'en',
  }),
  breadcrumbList(breadcrumbs),
];
---
<ContentLayout
  title={entry.data.metaTitle}
  description={entry.data.metaDescription}
  canonical={canonical}
  alternates={alternates}
  locale="en"
  jsonLd={jsonLd}
  breadcrumbs={breadcrumbs}
  h1={entry.data.h1}
  h1Text={entry.data.h1Text}
  sections={entry.data.sections}
  updatedAt={entry.data.updatedAt}
/>
```

- [ ] **Step 2: Build and verify CBC EN page**

Run: `pnpm build`
Expected: 0 errors, `dist/medical-tests/complete-blood-count/index.html` exists.

Run: `pnpm dev` → visit `http://localhost:4321/medical-tests/complete-blood-count/`.
Expect: page renders with H1, 5 H2 sections, breadcrumbs, disclaimer, language switcher.
View source → confirm canonical + hreflang links + JSON-LD script tag.
Stop.

- [ ] **Step 3: Commit**

```bash
git add src/pages/[...slug].astro
git commit -m "feat(pages): EN content catch-all route with full SEO wiring"
```

---

### Task 26: PL routes

**Files:**
- Create: `src/pages/pl/index.astro`
- Create: `src/pages/pl/[...slug].astro`

- [ ] **Step 1: Write `src/pages/pl/index.astro`**

```astro
---
import BaseLayout from '@/components/BaseLayout.astro';
import { webSite } from '@/lib/seo/json-ld';

const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';
const canonical = site + '/pl/';
const alternates = [
  { hreflang: 'en', href: site + '/' },
  { hreflang: 'pl', href: canonical },
  { hreflang: 'x-default', href: site + '/' },
];
const jsonLd = webSite({ site, name: 'Symptomatik', inLanguage: 'pl' });
---
<BaseLayout
  title="Symptomatik — Wielojęzyczne Informacje Zdrowotne"
  description="Bezpłatne i premium informacje zdrowotne: interpretacja wyników badań, sprawdzanie objawów, testy zdrowia psychicznego, kalkulatory."
  canonical={canonical}
  alternates={alternates}
  locale="pl"
  jsonLd={jsonLd}
>
  <h1 class="font-serif text-4xl mb-4">Symptomatik</h1>
  <p class="text-lg text-neutral-700 max-w-2xl">
    Bezpłatne, wiarygodne informacje zdrowotne. Interpretacja wyników badań, sprawdzanie objawów,
    testy zdrowia psychicznego i praktyczne kalkulatory.
  </p>
</BaseLayout>
```

- [ ] **Step 2: Write `src/pages/pl/[...slug].astro`**

```astro
---
import { getCollection } from 'astro:content';
import ContentLayout from '@/components/ContentLayout.astro';
import { canonicalURL, alternatesFor } from '@/lib/seo/meta';
import { findAlternatesByCanonicalSlug } from '@/lib/content/loaders';
import { medicalWebPage, breadcrumbList } from '@/lib/seo/json-ld';
import { t } from '@/i18n/ui';

export async function getStaticPaths() {
  const all = await getCollection('medical-tests');
  const plEntries = all.filter((e) => e.data.lang === 'pl');
  return plEntries.map((entry) => ({
    params: { slug: `badania/${entry.data.slug}` },
    props: { entry, all },
  }));
}

const { entry, all } = Astro.props;
const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';

const canonical = canonicalURL({
  site, lang: 'pl', collection: 'medical-tests', slug: entry.data.slug,
});
const alternatesEntries = findAlternatesByCanonicalSlug(all, entry.data.canonicalSlug);
const alternates = alternatesFor({ entries: alternatesEntries, site, collection: 'medical-tests' });

const breadcrumbs = [
  { label: t('pl', 'breadcrumbs.home'), href: site + '/pl/' },
  { label: t('pl', 'breadcrumbs.medicalTests'), href: site + '/pl/badania/' },
  { label: entry.data.title },
];

const jsonLd = [
  medicalWebPage({
    url: canonical,
    title: entry.data.h1,
    description: entry.data.metaDescription,
    lastReviewed: entry.data.updatedAt,
    datePublished: entry.data.publishedAt,
    inLanguage: 'pl',
  }),
  breadcrumbList(breadcrumbs),
];
---
<ContentLayout
  title={entry.data.metaTitle}
  description={entry.data.metaDescription}
  canonical={canonical}
  alternates={alternates}
  locale="pl"
  jsonLd={jsonLd}
  breadcrumbs={breadcrumbs}
  h1={entry.data.h1}
  h1Text={entry.data.h1Text}
  sections={entry.data.sections}
  updatedAt={entry.data.updatedAt}
/>
```

- [ ] **Step 3: Build + smoke-test PL page**

Run: `pnpm build`
Run: `pnpm dev` → visit `http://localhost:4321/pl/badania/morfologia-krwi-cbc/`.
Expect: PL-language page renders; view source shows `hreflang="en"` cross-link to EN URL without `/en/`.
Stop.

- [ ] **Step 4: Commit**

```bash
git add src/pages/pl/index.astro src/pages/pl/[...slug].astro
git commit -m "feat(pages): PL routes (homepage + content catch-all)"
```

---

### Task 27: ES stub routes

**Files:**
- Create: `src/pages/es/index.astro`
- Create: `src/pages/es/[...slug].astro`

- [ ] **Step 1: Write `src/pages/es/index.astro`**

```astro
---
import BaseLayout from '@/components/BaseLayout.astro';
import { webSite } from '@/lib/seo/json-ld';

const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';
const canonical = site + '/es/';
const alternates = [
  { hreflang: 'en', href: site + '/' },
  { hreflang: 'es', href: canonical },
  { hreflang: 'x-default', href: site + '/' },
];
const jsonLd = webSite({ site, name: 'Symptomatik', inLanguage: 'es' });
---
<BaseLayout
  title="Symptomatik — Información de salud multilingüe"
  description="Información de salud gratuita y premium: interpretación de análisis, verificador de síntomas, tests de salud mental, calculadoras."
  canonical={canonical}
  alternates={alternates}
  locale="es"
  jsonLd={jsonLd}
>
  <h1 class="font-serif text-4xl mb-4">Symptomatik</h1>
  <p class="text-lg text-neutral-700 max-w-2xl">Información de salud gratuita y confiable.</p>
  <p class="mt-4 text-sm text-neutral-500">Contenido en español próximamente.</p>
</BaseLayout>
```

- [ ] **Step 2: Write `src/pages/es/[...slug].astro`**

```astro
---
import { getCollection } from 'astro:content';
import ContentLayout from '@/components/ContentLayout.astro';
import { canonicalURL, alternatesFor } from '@/lib/seo/meta';
import { findAlternatesByCanonicalSlug } from '@/lib/content/loaders';
import { medicalWebPage, breadcrumbList } from '@/lib/seo/json-ld';
import { t } from '@/i18n/ui';

export async function getStaticPaths() {
  const all = await getCollection('medical-tests');
  const esEntries = all.filter((e) => e.data.lang === 'es');
  return esEntries.map((entry) => ({
    params: { slug: `pruebas/${entry.data.slug}` },
    props: { entry, all },
  }));
}

const { entry, all } = Astro.props;
const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';
const canonical = canonicalURL({ site, lang: 'es', collection: 'medical-tests', slug: entry.data.slug });
const alternatesEntries = findAlternatesByCanonicalSlug(all, entry.data.canonicalSlug);
const alternates = alternatesFor({ entries: alternatesEntries, site, collection: 'medical-tests' });

const breadcrumbs = [
  { label: t('es', 'breadcrumbs.home'), href: site + '/es/' },
  { label: t('es', 'breadcrumbs.medicalTests'), href: site + '/es/pruebas/' },
  { label: entry.data.title },
];
const jsonLd = [
  medicalWebPage({
    url: canonical, title: entry.data.h1, description: entry.data.metaDescription,
    lastReviewed: entry.data.updatedAt, datePublished: entry.data.publishedAt, inLanguage: 'es',
  }),
  breadcrumbList(breadcrumbs),
];
---
<ContentLayout
  title={entry.data.metaTitle} description={entry.data.metaDescription}
  canonical={canonical} alternates={alternates} locale="es" jsonLd={jsonLd}
  breadcrumbs={breadcrumbs} h1={entry.data.h1} h1Text={entry.data.h1Text}
  sections={entry.data.sections} updatedAt={entry.data.updatedAt}
/>
```

In S0 there are no ES entries, so `getStaticPaths` returns an empty array. Astro handles this correctly — zero pages emitted for this route, but the file is present for when ES content lands.

- [ ] **Step 3: Build — verify no errors with empty ES paths**

Run: `pnpm build`
Expected: 0 errors; the ES catch-all emits zero pages (legal).

- [ ] **Step 4: Commit**

```bash
git add src/pages/es/index.astro src/pages/es/[...slug].astro
git commit -m "feat(pages): ES stub routes (homepage + empty content catch-all)"
```

---

## Phase 7 — Sitemap + robots (Tasks 28–29)

### Task 28: Custom sitemap integration

**Files:**
- Create: `src/integrations/sitemap.ts`
- Modify: `astro.config.mjs`
- Create: `tests/unit/sitemap.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/sitemap.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildSitemapXml, buildSitemapIndexXml } from '@/integrations/sitemap';

describe('buildSitemapXml', () => {
  it('wraps URLs with hreflang alternates', () => {
    const xml = buildSitemapXml([
      {
        loc: 'https://symptomatik.com/medical-tests/cbc/',
        lastmod: '2026-04-21',
        alternates: [
          { hreflang: 'en', href: 'https://symptomatik.com/medical-tests/cbc/' },
          { hreflang: 'pl', href: 'https://symptomatik.com/pl/badania/morfologia-krwi-cbc/' },
          { hreflang: 'x-default', href: 'https://symptomatik.com/medical-tests/cbc/' },
        ],
      },
    ]);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<loc>https://symptomatik.com/medical-tests/cbc/</loc>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="pl"');
    expect(xml).toContain('<lastmod>2026-04-21</lastmod>');
  });
});

describe('buildSitemapIndexXml', () => {
  it('lists per-locale sitemap URLs', () => {
    const xml = buildSitemapIndexXml([
      'https://symptomatik.com/sitemap-en.xml',
      'https://symptomatik.com/sitemap-pl.xml',
      'https://symptomatik.com/sitemap-es.xml',
    ]);
    expect(xml).toContain('<sitemap>');
    expect(xml).toContain('<loc>https://symptomatik.com/sitemap-en.xml</loc>');
    expect(xml).toContain('<loc>https://symptomatik.com/sitemap-es.xml</loc>');
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm test`

- [ ] **Step 3: Write `src/integrations/sitemap.ts`**

```ts
import type { AstroIntegration } from 'astro';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { locales, type Locale } from '@/i18n/locales';
import { buildURL } from '@/i18n/routes';

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  alternates: Array<{ hreflang: string; href: string }>;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.map((e) => {
    const alts = e.alternates.map((a) =>
      `    <xhtml:link rel="alternate" hreflang="${xmlEscape(a.hreflang)}" href="${xmlEscape(a.href)}" />`
    ).join('\n');
    return `  <url>
    <loc>${xmlEscape(e.loc)}</loc>
    <lastmod>${xmlEscape(e.lastmod)}</lastmod>
${alts}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export function buildSitemapIndexXml(urls: string[]): string {
  const items = urls.map((u) => `  <sitemap>
    <loc>${xmlEscape(u)}</loc>
  </sitemap>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
}

export default function sitemapIntegration(options: { site: string }): AstroIntegration {
  return {
    name: 'symptomatik-sitemap',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        // Import content at build-time via dynamic import of the built content modules.
        // To keep this integration simple, we read the generated routes from the built dist tree.
        // For S0 we hard-code the homepage + medical-tests entries from known content.
        // (This simplified generator suits S0's small content footprint; replace with full
        // content-collection traversal for S1 when all 102 tests land.)
        const distDir = dir.pathname;
        const site = options.site.replace(/\/$/, '');

        // Read collection entries at build time by globbing the built directory.
        // Simplification for S0: we know the exact EN + PL slugs present.
        const today = new Date().toISOString().slice(0, 10);
        const enEntries: SitemapEntry[] = [];
        const plEntries: SitemapEntry[] = [];
        const esEntries: SitemapEntry[] = [];

        const addPair = (enSlug: string, plSlug: string) => {
          const enURL = `${site}${buildURL({ lang: 'en', collection: 'medical-tests', slug: enSlug })}`;
          const plURL = `${site}${buildURL({ lang: 'pl', collection: 'medical-tests', slug: plSlug })}`;
          const alternates = [
            { hreflang: 'en', href: enURL },
            { hreflang: 'pl', href: plURL },
            { hreflang: 'x-default', href: enURL },
          ];
          enEntries.push({ loc: enURL, lastmod: today, alternates });
          plEntries.push({ loc: plURL, lastmod: today, alternates });
        };

        // Homepages
        enEntries.unshift({ loc: `${site}/`, lastmod: today, alternates: [
          { hreflang: 'en', href: `${site}/` },
          { hreflang: 'pl', href: `${site}/pl/` },
          { hreflang: 'es', href: `${site}/es/` },
          { hreflang: 'x-default', href: `${site}/` },
        ]});
        plEntries.unshift({ loc: `${site}/pl/`, lastmod: today, alternates: [
          { hreflang: 'en', href: `${site}/` },
          { hreflang: 'pl', href: `${site}/pl/` },
          { hreflang: 'es', href: `${site}/es/` },
          { hreflang: 'x-default', href: `${site}/` },
        ]});
        esEntries.unshift({ loc: `${site}/es/`, lastmod: today, alternates: [
          { hreflang: 'en', href: `${site}/` },
          { hreflang: 'pl', href: `${site}/pl/` },
          { hreflang: 'es', href: `${site}/es/` },
          { hreflang: 'x-default', href: `${site}/` },
        ]});

        // S0 content: CBC only (S1 adds all 102)
        addPair('complete-blood-count', 'morfologia-krwi-cbc');

        await writeFile(path.join(distDir, 'sitemap-en.xml'), buildSitemapXml(enEntries), 'utf8');
        await writeFile(path.join(distDir, 'sitemap-pl.xml'), buildSitemapXml(plEntries), 'utf8');
        await writeFile(path.join(distDir, 'sitemap-es.xml'), buildSitemapXml(esEntries), 'utf8');
        await writeFile(path.join(distDir, 'sitemap-index.xml'), buildSitemapIndexXml([
          `${site}/sitemap-en.xml`,
          `${site}/sitemap-pl.xml`,
          `${site}/sitemap-es.xml`,
        ]), 'utf8');

        console.log('[symptomatik-sitemap] wrote sitemap-en.xml, sitemap-pl.xml, sitemap-es.xml, sitemap-index.xml');
      },
    },
  };
}
```

Note for S1: this S0 implementation hard-codes the CBC entry for simplicity. Task ref in S1 plan: "Replace hard-coded add-pair calls with full content-collection traversal that enumerates all entries." Flagged in the integration with the inline comment.

- [ ] **Step 4: Wire integration into `astro.config.mjs`**

```js
import sitemap from './src/integrations/sitemap';

// in defineConfig integrations array:
integrations: [
  react(),
  mdx(),
  sitemap({ site: 'https://symptomatik.com' }),
],
```

- [ ] **Step 5: Build and verify sitemaps emitted**

Run: `pnpm build`
Expected: build logs include `[symptomatik-sitemap] wrote sitemap-en.xml...`; `dist/sitemap-index.xml` + `dist/sitemap-{en,pl,es}.xml` exist.

Inspect `dist/sitemap-en.xml` — confirm CBC URL + hreflang alternates.

- [ ] **Step 6: Run unit tests — expect pass**

Run: `pnpm test`

- [ ] **Step 7: Commit**

```bash
git add src/integrations/sitemap.ts astro.config.mjs tests/unit/sitemap.test.ts
git commit -m "feat(seo): custom per-locale sitemap integration with inline hreflang"
```

---

### Task 29: `public/robots.txt` + favicon

**Files:**
- Create: `public/robots.txt`
- Create: `public/favicon.svg`

- [ ] **Step 1: Write `public/robots.txt`**

```
User-agent: *
Allow: /
Sitemap: https://symptomatik.com/sitemap-index.xml
```

- [ ] **Step 2: Write minimal placeholder `public/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#2563eb"/>
  <text x="16" y="22" font-family="Georgia,serif" font-size="20" fill="white" text-anchor="middle" font-weight="700">S</text>
</svg>
```

- [ ] **Step 3: Verify build copies to dist**

Run: `pnpm build`
Expected: `dist/robots.txt` and `dist/favicon.svg` present.

- [ ] **Step 4: Commit**

```bash
git add public/robots.txt public/favicon.svg
git commit -m "feat: robots.txt + placeholder favicon"
```

---

## Phase 8 — Infra Interfaces (Tasks 30–31)

### Task 30: `RateLimiter` interface + CF KV impl

**Files:**
- Create: `src/lib/infra/rate-limiter.ts`
- Create: `tests/unit/rate-limiter.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/rate-limiter.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import type { RateLimiter } from '@/lib/infra/rate-limiter';
import { InMemoryRateLimiter } from '@/lib/infra/rate-limiter';

describe('InMemoryRateLimiter (test double)', () => {
  it('allows first N requests, denies after', async () => {
    const rl: RateLimiter = new InMemoryRateLimiter();
    const key = 'ip:1.2.3.4';
    const opts = { limit: 3, windowSec: 60 };

    expect((await rl.check(key, opts)).allowed).toBe(true);
    expect((await rl.check(key, opts)).allowed).toBe(true);
    const third = await rl.check(key, opts);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = await rl.check(key, opts);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it('tracks separate keys independently', async () => {
    const rl: RateLimiter = new InMemoryRateLimiter();
    const opts = { limit: 1, windowSec: 60 };
    expect((await rl.check('a', opts)).allowed).toBe(true);
    expect((await rl.check('a', opts)).allowed).toBe(false);
    expect((await rl.check('b', opts)).allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm test`

- [ ] **Step 3: Write `src/lib/infra/rate-limiter.ts`**

```ts
export interface RateLimiter {
  check(key: string, opts: { limit: number; windowSec: number }):
    Promise<{ allowed: boolean; remaining: number }>;
}

// ────────────────────────────────────────────────────────────────────────────
// In-memory impl (test double + local dev fallback)
// ────────────────────────────────────────────────────────────────────────────

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  async check(key: string, opts: { limit: number; windowSec: number }): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry || entry.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 });
      return { allowed: true, remaining: opts.limit - 1 };
    }
    if (entry.count >= opts.limit) {
      return { allowed: false, remaining: 0 };
    }
    entry.count++;
    return { allowed: true, remaining: opts.limit - entry.count };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Cloudflare KV impl — used when S2 API routes land
// ────────────────────────────────────────────────────────────────────────────

// KVNamespace type is provided by @cloudflare/workers-types at runtime in production.
// We keep the type import narrow and local to this file to avoid leaking CF types into app code.
interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export class CFKVRateLimiter implements RateLimiter {
  constructor(private readonly kv: KVNamespaceLike) {}

  async check(key: string, opts: { limit: number; windowSec: number }): Promise<{ allowed: boolean; remaining: number }> {
    const raw = await this.kv.get(key);
    const now = Date.now();
    if (!raw) {
      await this.kv.put(key, JSON.stringify({ count: 1, resetAt: now + opts.windowSec * 1000 }), { expirationTtl: opts.windowSec });
      return { allowed: true, remaining: opts.limit - 1 };
    }
    const entry = JSON.parse(raw) as { count: number; resetAt: number };
    if (entry.count >= opts.limit) return { allowed: false, remaining: 0 };
    entry.count++;
    const ttl = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    await this.kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });
    return { allowed: true, remaining: opts.limit - entry.count };
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm test`

- [ ] **Step 5: Commit**

```bash
git add src/lib/infra/rate-limiter.ts tests/unit/rate-limiter.test.ts
git commit -m "feat(infra): RateLimiter interface + InMemory + CFKV impls"
```

---

### Task 31: `FileStore` interface + CF R2 impl

**Files:**
- Create: `src/lib/infra/file-store.ts`
- Create: `tests/unit/file-store.test.ts`

- [ ] **Step 1: Write failing test `tests/unit/file-store.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { InMemoryFileStore } from '@/lib/infra/file-store';

describe('InMemoryFileStore', () => {
  it('put then get returns the data', async () => {
    const fs = new InMemoryFileStore();
    const data = new TextEncoder().encode('hello').buffer;
    await fs.put('k1', data);
    const got = await fs.get('k1');
    expect(got).not.toBeNull();
    expect(new TextDecoder().decode(got!)).toBe('hello');
  });

  it('get returns null for missing key', async () => {
    const fs = new InMemoryFileStore();
    expect(await fs.get('missing')).toBeNull();
  });

  it('delete removes the key', async () => {
    const fs = new InMemoryFileStore();
    await fs.put('k', new TextEncoder().encode('x').buffer);
    await fs.delete('k');
    expect(await fs.get('k')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `pnpm test`

- [ ] **Step 3: Write `src/lib/infra/file-store.ts`**

```ts
export interface FileStore {
  put(key: string, data: ArrayBuffer, opts?: { contentType?: string }): Promise<void>;
  get(key: string): Promise<ArrayBuffer | null>;
  delete(key: string): Promise<void>;
}

// ────────────────────────────────────────────────────────────────────────────
// In-memory impl (test double + local dev fallback)
// ────────────────────────────────────────────────────────────────────────────

export class InMemoryFileStore implements FileStore {
  private store = new Map<string, ArrayBuffer>();

  async put(key: string, data: ArrayBuffer): Promise<void> {
    this.store.set(key, data);
  }
  async get(key: string): Promise<ArrayBuffer | null> {
    return this.store.get(key) ?? null;
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Cloudflare R2 impl — used when S8 premium features land
// ────────────────────────────────────────────────────────────────────────────

interface R2BucketLike {
  put(key: string, data: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string): Promise<void>;
}

export class CFR2FileStore implements FileStore {
  constructor(private readonly bucket: R2BucketLike) {}

  async put(key: string, data: ArrayBuffer, opts?: { contentType?: string }): Promise<void> {
    await this.bucket.put(key, data, opts?.contentType ? { httpMetadata: { contentType: opts.contentType } } : undefined);
  }
  async get(key: string): Promise<ArrayBuffer | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return obj.arrayBuffer();
  }
  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `pnpm test`

- [ ] **Step 5: Commit**

```bash
git add src/lib/infra/file-store.ts tests/unit/file-store.test.ts
git commit -m "feat(infra): FileStore interface + InMemory + CFR2 impls"
```

---

## Phase 9 — CI + Quality Gates (Tasks 32–37)

### Task 32: Install Playwright + axe + lychee + Lighthouse CI

**Files:**
- Create: `playwright.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install dev deps**

```bash
pnpm add -D @playwright/test@^1 @axe-core/playwright@^4 lighthouse@^12 @lhci/cli@^0.14
pnpm dlx playwright install --with-deps chromium
```

(`lychee` is used via a CI action rather than an npm dep.)

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4321',
        url: 'http://127.0.0.1:4321',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
```

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts package.json pnpm-lock.yaml
git commit -m "chore(ci): install Playwright, axe-core, Lighthouse CI"
```

---

### Task 33: E2E smoke tests (links + a11y)

**Files:**
- Create: `tests/e2e/links.spec.ts`
- Create: `tests/e2e/a11y.spec.ts`
- Create: `tests/e2e/cookie-consent.spec.ts`

- [ ] **Step 1: Write `tests/e2e/links.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('core routes respond 200', () => {
  for (const path of ['/', '/medical-tests/complete-blood-count/', '/pl/', '/pl/badania/morfologia-krwi-cbc/', '/es/']) {
    test(`GET ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    });
  }
});

test('/en/... redirects (301 via static 404 + preview fallback may 404; test middleware in dev instead)', async ({ request }) => {
  // NOTE: Cloudflare middleware runs at runtime, not in static preview. In `pnpm preview`
  // we expect 404 for /en/foo (static site). The real 301 happens on Cloudflare preview deploy.
  // This test is marked as @cf-only and skipped locally.
  test.skip(!process.env.CF_PREVIEW, 'requires Cloudflare preview deploy — enable with CF_PREVIEW=1');
  const res = await request.get('/en/medical-tests/complete-blood-count/', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(res.headers()['location']).toBe('/medical-tests/complete-blood-count/');
});

test('hreflang cross-links match between EN and PL CBC', async ({ page }) => {
  await page.goto('/medical-tests/complete-blood-count/');
  const enHreflangPL = await page.locator('link[rel="alternate"][hreflang="pl"]').getAttribute('href');
  expect(enHreflangPL).toContain('/pl/badania/morfologia-krwi-cbc/');

  await page.goto('/pl/badania/morfologia-krwi-cbc/');
  const plHreflangEN = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute('href');
  expect(plHreflangEN).toMatch(/\/medical-tests\/complete-blood-count\/$/);
  expect(plHreflangEN).not.toContain('/en/');
});
```

- [ ] **Step 2: Write `tests/e2e/a11y.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('homepage has no serious or critical a11y violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test('CBC EN page has no serious or critical a11y violations', async ({ page }) => {
  await page.goto('/medical-tests/complete-blood-count/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious).toEqual([]);
});
```

- [ ] **Step 3: Write `tests/e2e/cookie-consent.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('cookie consent banner appears on first visit', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: /cookie/i })).toBeVisible();
});

test('accept persists and hides banner', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /accept analytics/i }).click();
  await expect(page.getByRole('dialog', { name: /cookie/i })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', { name: /cookie/i })).not.toBeVisible();
});

test('reject persists and hides banner', async ({ page }) => {
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('/');
  await page.getByRole('button', { name: /^reject$/i }).click();
  await expect(page.getByRole('dialog', { name: /cookie/i })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', { name: /cookie/i })).not.toBeVisible();
});
```

- [ ] **Step 4: Run E2E tests locally**

Run: `pnpm test:e2e`
Expected: all tests pass except the CF-only redirect test, which is skipped.

Fix any failures (common: a11y violations in color contrast — may require adjusting disclaimer styling).

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/links.spec.ts tests/e2e/a11y.spec.ts tests/e2e/cookie-consent.spec.ts
git commit -m "test(e2e): links, a11y, cookie consent E2E specs"
```

---

### Task 34: JSON-LD shape validator

**Files:**
- Create: `scripts/validate-jsonld.ts`
- Modify: `package.json` (add script)

- [ ] **Step 1: Write `scripts/validate-jsonld.ts`**

```ts
#!/usr/bin/env tsx
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const DIST = path.resolve('dist');

const REQUIRED_BY_TYPE: Record<string, string[]> = {
  MedicalWebPage: ['@context', '@type', 'url', 'name', 'description', 'inLanguage', 'lastReviewed'],
  BreadcrumbList: ['@context', '@type', 'itemListElement'],
  WebSite: ['@context', '@type', 'url', 'name', 'inLanguage'],
};

async function* walk(dir: string): AsyncGenerator<string> {
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(p);
    else if (p.endsWith('.html')) yield p;
  }
}

function extractJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1] ?? '';
    try { blocks.push(JSON.parse(raw)); } catch (e) { throw new Error(`Malformed JSON-LD: ${(e as Error).message}\n${raw}`); }
  }
  return blocks;
}

async function main() {
  let failed = 0;
  let validated = 0;
  for await (const file of walk(DIST)) {
    const html = await readFile(file, 'utf8');
    const blocks = extractJsonLd(html);
    for (const block of blocks) {
      validated++;
      const b = block as Record<string, unknown>;
      const type = b['@type'] as string | undefined;
      if (!type) {
        console.error(`[${file}] JSON-LD missing @type`);
        failed++; continue;
      }
      const required = REQUIRED_BY_TYPE[type];
      if (!required) continue; // unknown type: skip
      for (const k of required) {
        if (b[k] === undefined) {
          console.error(`[${file}] ${type} missing required field "${k}"`);
          failed++;
        }
      }
    }
  }
  console.log(`validated ${validated} JSON-LD blocks; ${failed} failure(s)`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Add script to `package.json`**

```json
"scripts": {
  "validate:jsonld": "tsx scripts/validate-jsonld.ts"
}
```

- [ ] **Step 3: Run after build to smoke-test**

```bash
pnpm build && pnpm validate:jsonld
```

Expected: `validated N JSON-LD blocks; 0 failure(s)`.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-jsonld.ts package.json
git commit -m "feat(ci): JSON-LD shape validator for built HTML"
```

---

### Task 35: i18n coverage check script

**Files:**
- Create: `scripts/validate-i18n-coverage.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the script**

```ts
#!/usr/bin/env tsx
import { ui } from '../src/i18n/ui';
import { locales } from '../src/i18n/locales';

const enKeys = Object.keys(ui.en);
let failed = 0;
for (const locale of locales) {
  const localeKeys = new Set(Object.keys(ui[locale]));
  for (const k of enKeys) {
    if (!localeKeys.has(k)) {
      console.error(`[i18n] missing key "${k}" in locale "${locale}"`);
      failed++;
    }
  }
}
if (failed > 0) {
  console.error(`i18n coverage FAILED: ${failed} missing key(s)`);
  process.exit(1);
}
console.log(`i18n coverage OK: ${enKeys.length} keys × ${locales.length} locales`);
```

- [ ] **Step 2: Add script to `package.json`**

```json
"scripts": {
  "validate:i18n": "tsx scripts/validate-i18n-coverage.ts"
}
```

- [ ] **Step 3: Run**

Run: `pnpm validate:i18n`
Expected: `i18n coverage OK: N keys × 3 locales`.

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-i18n-coverage.ts package.json
git commit -m "feat(ci): i18n coverage validator script"
```

---

### Task 36: Lighthouse CI config

**Files:**
- Create: `.lighthouserc.json`

- [ ] **Step 1: Write `.lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm preview --host 127.0.0.1 --port 4321",
      "url": [
        "http://127.0.0.1:4321/",
        "http://127.0.0.1:4321/medical-tests/complete-blood-count/",
        "http://127.0.0.1:4321/pl/badania/morfologia-krwi-cbc/"
      ],
      "numberOfRuns": 1,
      "settings": {
        "preset": "desktop"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```

- [ ] **Step 2: Smoke-test locally**

```bash
pnpm build
pnpm dlx @lhci/cli@0.14 autorun
```

Expected: assertions pass (or surface real issues to fix before proceeding to Task 37).

- [ ] **Step 3: Commit**

```bash
git add .lighthouserc.json
git commit -m "feat(ci): Lighthouse CI config with SEO ≥ 90 / Perf ≥ 85 gates"
```

---

### Task 37: GitHub Actions CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  PUBLIC_SITE_URL: https://symptomatik.com

jobs:
  typecheck-build-unit:
    name: Typecheck + build + unit tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test
      - run: pnpm build
      - run: pnpm validate:jsonld
      - run: pnpm validate:i18n
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist
          retention-days: 3

  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    needs: typecheck-build-unit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e

  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    needs: typecheck-build-unit
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: .lighthouserc.json

  linkcheck:
    name: Link check (lychee)
    runs-on: ubuntu-latest
    needs: typecheck-build-unit
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist
      - uses: lycheeverse/lychee-action@v2
        with:
          args: --no-progress --exclude-mail 'dist/**/*.html'
          fail: true
```

- [ ] **Step 2: Commit + push — let CI run on the remote**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(ci): GitHub Actions workflow with typecheck, tests, Lighthouse, link check"
git push
```

Expected: on GitHub, the Actions tab shows a running workflow on `main`. Watch it green.
If any stage fails, fix and push a follow-up commit until green.

---

## Phase 10 — Deploy + Golden-Path Verification (Tasks 38–40)

### Task 38: Cloudflare Pages project setup (manual, documented)

**Files:**
- Modify: `README.md` (document the manual steps)

Most of this is UI-clickthrough in the Cloudflare dashboard, not a code change. Document what the human operator does so it's repeatable.

- [ ] **Step 1: Cloudflare dashboard**

Blazej (human operator):
1. Log into Cloudflare → Pages → **Create project** → **Connect to Git**.
2. Authorize GitHub, select `b1azk0/symptomatik`.
3. Project name: `symptomatik`. Production branch: `main`. Preview branches: all non-`main`.
4. **Build settings:**
   - Framework preset: Astro
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Root directory: `/`
5. **Environment variables (Production):**
   - `PUBLIC_SITE_URL=https://symptomatik.com`
   - `PUBLIC_CF_ANALYTICS_TOKEN=` (empty for now; fill after enabling Web Analytics)
   - `PUBLIC_GA4_ID=` (empty — fill when GA4 property is created)
6. **Build configuration — compatibility:**
   - Compatibility date: `2025-01-01`
   - Compatibility flags: `nodejs_compat`
7. Click **Save and Deploy**. Watch build → green.
8. Note the assigned `*.pages.dev` URL.

- [ ] **Step 2: Append to `README.md`**

Add a "Deploy" section to README with the steps above so future operators can reproduce.

```markdown
## Deploy

Cloudflare Pages is connected to `main` branch. Builds on every push; preview deploys on every branch PR.

**Initial setup (one-time, already done):** see commit `<sha>` for the setup checklist.

**Environment variables (Production and Preview):**
- `PUBLIC_SITE_URL` — `https://symptomatik.com` (prod) / `https://<branch>.symptomatik.pages.dev` (preview)
- `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics beacon token
- `PUBLIC_GA4_ID` — Google Analytics 4 measurement ID (optional; loads only on user consent)

**Compatibility:** `nodejs_compat` flag required; `compatibility_date` = `2025-01-01`.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document Cloudflare Pages setup in README"
```

---

### Task 39: Custom domain attach

- [ ] **Step 1: Domain setup (manual, Blazej operator)**

1. In Cloudflare Pages project → **Custom domains** → **Set up a custom domain**.
2. Add `symptomatik.com` (apex).
3. Follow CF's DNS instruction (add CNAME or ALIAS record as it instructs).
4. Add `www.symptomatik.com` as a second custom domain; CF auto-redirects to apex.
5. Wait for "Active" status.

- [ ] **Step 2: Smoke-test**

```bash
curl -sI https://symptomatik.com/
```

Expected: 200 with `content-type: text/html`.

If DNS hasn't propagated yet: use the `*.pages.dev` URL for golden-path verification; return to attach custom domain after DNS settles.

- [ ] **Step 3: No commit needed** (this is infra config, not code).

---

### Task 40: Golden-path 12-point verification

- [ ] **Step 1: Run against production (or `*.pages.dev` fallback)**

Set `BASE=https://symptomatik.com` (or the CF preview URL if DNS not ready):

```bash
BASE=https://symptomatik.com

# 1
curl -sI "$BASE/" | head -1                    # expect HTTP/2 200

# 2
curl -sI "$BASE/medical-tests/complete-blood-count/" | head -1   # expect 200

# 3
curl -sI "$BASE/pl/badania/morfologia-krwi-cbc/" | head -1       # expect 200

# 4
curl -sI "$BASE/en/medical-tests/complete-blood-count/" | head -3  # expect 301 + location: /medical-tests/complete-blood-count/

# 5 — Lighthouse local (installed in Task 32)
pnpm dlx lighthouse --quiet --chrome-flags="--headless=new" \
  --only-categories=performance,seo "$BASE/medical-tests/complete-blood-count/"
# verify perf ≥ 0.85, seo ≥ 0.90

pnpm dlx lighthouse --quiet --chrome-flags="--headless=new" \
  --only-categories=performance,seo "$BASE/pl/badania/morfologia-krwi-cbc/"

# 6 — Google Rich Results Test (manual)
# Open https://search.google.com/test/rich-results?url=$BASE/medical-tests/complete-blood-count/
# Verify: MedicalWebPage + BreadcrumbList, 0 errors.

# 7 — same for PL URL.

# 8 — view source on CBC EN, grep for PL hreflang
curl -s "$BASE/medical-tests/complete-blood-count/" | grep -E 'hreflang="pl"|hreflang="x-default"'
# expect hreflang="pl" → /pl/badania/morfologia-krwi-cbc/
# expect hreflang="x-default" → the EN URL (no /en/ prefix)

# 9 — view source on CBC PL, check EN hreflang has no /en/
curl -s "$BASE/pl/badania/morfologia-krwi-cbc/" | grep 'hreflang="en"'
# expect href ending with /medical-tests/complete-blood-count/, NOT /en/...

# 10
curl -s "$BASE/sitemap-index.xml" | head -20
# expect lists sitemap-en.xml, sitemap-pl.xml, sitemap-es.xml
curl -s "$BASE/sitemap-en.xml" | grep 'complete-blood-count'
# expect CBC entry present with hreflang alternate

# 11 — open "$BASE/medical-tests/complete-blood-count/" on phone or DevTools mobile — layout works,
#       disclaimer readable, language switcher works.

# 12 — cookie consent flow (manual browser test):
#   1. Open $BASE/ in incognito
#   2. See banner; accept → reload → banner gone, view-source shows ga4-script if GA4_ID set
#   3. Clear storage, reload → banner back; reject → reload → banner gone, no ga4 script
```

- [ ] **Step 2: Record results**

All 12 pass → merge any outstanding PRs, tag `v0.1.0`, mark S0 complete.
Any fail → fix underlying issue, push, re-verify.

- [ ] **Step 3: Tag release**

```bash
git tag -a v0.1.0 -m "S0: Foundation Scaffold complete — golden-path validated on CBC (EN+PL)"
git push --tags
```

- [ ] **Step 4: Final CHANGELOG entry + commit**

Append to `CHANGELOG.md`:

```markdown
## 2026-04-XX — S0 Foundation Scaffold shipped

- All 40 plan tasks complete
- Golden-path 12-point verification passed against production
- CBC page live in EN + PL with Lighthouse SEO ≥ 90, Perf ≥ 85
- Google Rich Results Test validates MedicalWebPage + BreadcrumbList cleanly
- CI green on `main`
- Next: S1 — scale content pipeline to all 102 medical tests, add `/medical-tests/` pillar page, implement RelatedContent component
```

```bash
git add CHANGELOG.md
git commit -m "docs: mark S0 shipped in CHANGELOG"
git push
```

---

## Plan Complete

When all 40 tasks and the 12-point golden-path verification are green, S0 is done. The next sub-project is **S1 — Content Platform (medical-tests pillar at scale)**, which will have its own design spec + implementation plan.

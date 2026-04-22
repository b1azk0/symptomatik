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
7. **Astro 6 output mode:** `output: 'static'` (default SSG). API routes opt out with `export const prerender = false`.

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

# Symptomatik.com

Multilingual (EN/ES/PL) health platform: lab results interpretation, symptom checker, mental health self-assessments, and health calculators. Freemium with Premium subscription.

**Status:** S0 + S1 **shipped** · v0.2.0 · Production live at https://symptomatik.com
**Entity:** Digital Savages
**Remote:** `github.com/b1azk0/symptomatik` (hosted under Blazej's personal GitHub; entity-owned by Digital Savages)
**Active branch:** `main`

## Decomposition

The full platform is being built as 10 sub-projects (S0–S9), each with its own design spec → implementation plan → execution cycle.

| # | Sub-project | Status |
|---|---|---|
| **S0** | **Foundation Scaffold** | ✅ **Shipped** — 40/40 tasks · tagged `v0.1.0` · golden-path verified against production. Spec: [docs/superpowers/specs/2026-04-21-…-design.md](docs/superpowers/specs/2026-04-21-symptomatik-s0-foundation-scaffold-design.md), Plan: [docs/superpowers/plans/2026-04-21-….md](docs/superpowers/plans/2026-04-21-symptomatik-s0-foundation-scaffold.md) |
| **S1** | **Content platform — medical-tests pillar** | ✅ **Shipped** — 51/51 tests × EN+PL · 12 categories × EN+PL · pillar pages EN+PL · Pagefind search · tagged `v0.2.0` · golden-path verified. Spec: [docs/superpowers/specs/2026-04-23-…-design.md](docs/superpowers/specs/2026-04-23-symptomatik-s1-content-platform-design.md), Plan: [docs/superpowers/plans/2026-04-23-….md](docs/superpowers/plans/2026-04-23-symptomatik-s1-content-platform.md) |
| S2 | AI routing layer (multi-LLM router) | Not started |
| S3 | App: Lab Results Interpreter (free tier) | Not started |
| S4 | App: Symptom Checker (free tier) | Not started |
| S5 | App: Mental Health Assessments (22 validated instruments) | Not started |
| S6 | App: Health Calculators | Not started |
| S7 | Auth + Billing (Clerk/Auth.js + Stripe + Supabase) | Not started |
| S8 | Premium features (PDF/OCR upload, image analysis, digital consultation) | Not started |
| S9 | Content pillars at scale (symptoms, diseases, medicines, supplements, etc.) | Not started |

## Planned Stack

- Astro 5 + React 18 islands
- Tailwind 4 + shadcn/ui
- Cloudflare Pages + Workers (with portability discipline — KV/R2 behind `lib/infra/` interfaces so we can migrate parts to Hetzner later)
- TypeScript strict mode
- Content: Astro Content Collections + MDX, Zod schemas
- CI: GitHub Actions (typecheck, build, Lighthouse ≥ 90 SEO, axe a11y, link check, JSON-LD validation, i18n coverage)

Full detail in the S0 design spec.

## What shipped in feat/og-cards

1. **OG cards:** 279 unique 1200×630 PNGs generated at build time via satori → resvg → sharp pipeline. Every public LP (homes, pillar, category indexes, test pages) gets a per-page social preview image. Legal pages explicitly opt out and use `/og-default.png`.
2. **`pnpm generate:og`** — new script (`scripts/generate-og-cards.ts`). Reads per-category illustration + accent from `src/i18n/categories.ts`, renders via satori, writes to `public/og/`. Hash-based cache at `scripts/.og-cache.json` keeps incremental builds fast.
3. **`prebuild` pipeline** now runs `import:tests && generate:og` before `astro build`, so OG cards are always regenerated alongside MDX content.

## What shipped in S1

1. **Content scale:** 51 medical-tests imported from Excel source × EN + PL = 102 test detail pages (up from the single CBC page in S0).
2. **Pillar pages live:**
   - `/medical-tests/` (EN) · `/pl/badania/` (PL) — warm anatomical hero illustration, "Start here" 3-card featured section, 12-category browse grid
3. **Category index pages live:** 12 EN + 12 PL = 24 pages. Each with category-specific illustration, per-category test listing, and a "Related categories" / "Powiązane kategorie" section linking to 3 sibling categories.
4. **Pillar search:** Pagefind 1.5.2 indexes 102 medical-tests pages at build time (postbuild hook in `astro.config.mjs`). Search UI loads lazily on the pillar page via React island. Scoped to medical-tests only; not site-wide.
5. **Illustration set v1:** 13 custom illustrations (12 category + 1 pillar hero) generated via Pencil MCP per the locked style brief (`docs/design/illustration-brief.md`) — flat pastel editorial, per-category palette, WebP-optimized 13–23 KB each.
6. **RelatedContent component** embedded on every test detail page via `ContentLayout`. Curated-then-siblings algorithm (up to 5), gracefully hidden when fewer than 3 candidates sourceable.
7. **JSON-LD extensions:** `CollectionPage` + `ItemList` helpers added for pillar + category pages. Every new route validates via `pnpm validate:jsonld` (285 blocks, 0 failures).
8. **LanguageSwitcher refactor:** discreet `EN / ES / PL` mono-font treatment, always renders all three codes, falls back to locale home when a specific translation doesn't exist.
9. **i18n expansion:** `t()` now supports `{name}` token interpolation. 29 new keys across EN/PL/ES including `pillar.*` + `category.*` strings. Locale-aware plural formatting (`formatTestCount` via `Intl.PluralRules` — 3-form Slavic paradigm for PL).
10. **Tests:** 149 Vitest unit + 21 Playwright E2E all green in CI (up from 62 + 11 at S0). New coverage: pillar + search + navigation + hreflang specs, plurals, t-interpolation, category card localization, plus the existing a11y / links / cookie-consent suites.
11. **CI gates extended:** Lighthouse now covers pillar + category routes (7 total); JSON-LD validator covers CollectionPage + ItemList; i18n coverage verifies 13 EN↔PL route pairs; new `validate-reconcile-drift` soft gate surfaces when Excel importer would produce different output than committed.
12. **Sitemap:** per-locale sitemaps now include pillar + all 12 category routes in addition to test-detail pages (65 EN, 64 PL, 1 ES entry).

**Known limitations (accepted for S1, revisit in S2+):**
- Excel source has reconcile drift — `pnpm validate:reconcile-drift` warns that ~30+ PL MDX files would change on re-import. Soft-gate only, doesn't fail CI. Blazej to correct source Excel using the reconciliation workbook and rerun import in a follow-up.
- ES pillar + category pages intentionally not built; ES content stubs from S0 remain the only Spanish surface. Same language switcher falls back to `/es/` home when a PL/EN alternate doesn't have an ES counterpart.
- 4 categories don't have MDX content in PL (heart has 1 test in EN only). The affected pillar/category page shows 11 cards in PL vs. 12 in EN; fixed when PL content lands.

## What shipped in S0

1. **Production:** https://symptomatik.com (Cloudflare Workers-with-Assets, apex + www)
2. **Pages live:**
   - `/` + `/pl/` + `/es/` (locale homepages)
   - `/medical-tests/complete-blood-count-cbc/` + `/pl/badania/morfologia-krwi-cbc/` (first medical content, imported from Excel source)
   - 4 legal pages × 3 locales = 12 pages: Privacy, Terms, Medical Disclaimer, Cookies — with localized URL slugs per locale (`/pl/polityka-prywatnosci/`, `/es/privacidad/`, etc.)
   - `/sitemap-index.xml` + per-locale sitemaps + `robots.txt`
3. **Golden-path verified:** all 12 checks green (see CHANGELOG). Lighthouse CBC EN: perf 96 / SEO 100. PL: perf 100 / SEO 100.
4. **Tests:** 62 Vitest unit + 11 Playwright E2E all green in CI.
5. **Known limitations (accepted for S0):**
   - No mobile hamburger menu — header nav hidden <768px because links are placeholders until S3+ ships real pages.
   - ES content is stubs-only; EN + PL are the real multilingual experience.
   - Excel source has 3 duplicate test names, row-misalignment after row ~100, overlong meta values on some rows (flagged for S1).
6. **Legal pages flagged for human attorney review** before public marketing launch — see CHANGELOG.

## Astro + Cloudflare notes (landed during implementation)

- **Astro 6, not 5** — forced by `@astrojs/cloudflare@13` peer dep
- **`output: 'static'`** (not `'hybrid'` — removed in Astro 6) — pages prerender by default, future API routes opt out with `export const prerender = false`
- **`src/content.config.ts`** (not `src/content/config.ts`) — Astro 6's Content Layer API requires it at the top-level content config path
- **`@config '../../tailwind.config.ts'`** in `global.css` — Tailwind 4 requires the directive to pick up the JS config file
- **Sitemap output** lands in `dist/client/` because the Cloudflare adapter moves static assets there post-build — served at the site root on CF Pages deploys

## Deploy

Cloudflare Pages is connected to `main` branch. Builds on every push; preview deploys on every non-`main` branch.

**Initial setup (one-time):**
1. Cloudflare → Workers & Pages → Create → Pages → Connect to Git
2. Repo: `b1azk0/symptomatik`; project name: `symptomatik`; production branch: `main`
3. Framework preset: Astro; build command: `pnpm build`; output directory: `dist`; root: `/`
4. Preview branches: "All non-Production branches"
5. Compatibility date `2025-01-01`, flag `nodejs_compat`

**Environment variables (Production and Preview):**
- `PUBLIC_SITE_URL` — `https://symptomatik.com` (prod) / `https://<branch>.symptomatik.pages.dev` (preview)
- `PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics beacon token (fill after enabling Web Analytics)
- `PUBLIC_GA4_ID` — Google Analytics 4 measurement ID (optional; loads only on user consent)

## Sources

- **Source spec:** `Symptomatik_-_Website_Agent_Spec_v1.pdf` (user's Downloads folder — external to repo)
- **Content source:** [`content-sources/medical-tests.xlsx`](content-sources/medical-tests.xlsx) — 102 medical test landing pages in EN + PL, in-repo for reproducibility
- **ES content:** Not yet produced; routing scaffolded, content comes via LLM-assisted translation in a later sub-project

## Related

- [ClaudioBrain](../ClaudioBrain/) — cross-repo context, project registry, conventions
- [blazejmrozinski.com](../blazejmrozinski.com/) — sibling Astro + Cloudflare project, reference patterns

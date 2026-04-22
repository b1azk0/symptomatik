# Symptomatik.com

Multilingual (EN/ES/PL) health platform: lab results interpretation, symptom checker, mental health self-assessments, and health calculators. Freemium with Premium subscription.

**Status:** S0 **shipped** · v0.1.0 · Production live at https://symptomatik.com
**Entity:** Digital Savages
**Remote:** `github.com/b1azk0/symptomatik` (hosted under Blazej's personal GitHub; entity-owned by Digital Savages)
**Active branch:** `main`

## Decomposition

The full platform is being built as 10 sub-projects (S0–S9), each with its own design spec → implementation plan → execution cycle.

| # | Sub-project | Status |
|---|---|---|
| **S0** | **Foundation Scaffold** | ✅ **Shipped** — 40/40 tasks · tagged `v0.1.0` · golden-path verified against production. Spec: [docs/superpowers/specs/2026-04-21-…-design.md](docs/superpowers/specs/2026-04-21-symptomatik-s0-foundation-scaffold-design.md), Plan: [docs/superpowers/plans/2026-04-21-….md](docs/superpowers/plans/2026-04-21-symptomatik-s0-foundation-scaffold.md) |
| S1 | Content platform — medical-tests pillar (102 tests × EN+PL) | Not started |
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

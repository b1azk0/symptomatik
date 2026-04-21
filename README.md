# Symptomatik.com

Multilingual (EN/ES/PL) health platform: lab results interpretation, symptom checker, mental health self-assessments, and health calculators. Freemium with Premium subscription.

**Status:** S0 in progress — **37/40 tasks complete** on branch `s0-foundation`. Code, tests, CI config all shipped. Waiting on Cloudflare Pages dashboard setup (T38) before we can run golden-path verification (T40).
**Entity:** Digital Savages
**Remote:** `github.com/b1azk0/symptomatik` (hosted under Blazej's personal GitHub; entity-owned by Digital Savages)
**Active branch:** `s0-foundation` (will merge to `main` after S0 golden-path verification)

## Decomposition

The full platform is being built as 10 sub-projects (S0–S9), each with its own design spec → implementation plan → execution cycle.

| # | Sub-project | Status |
|---|---|---|
| **S0** | **Foundation Scaffold** | **In progress, 37/40 tasks** on `s0-foundation` branch. Remaining: CF Pages dashboard setup (T38), custom domain attach (T39), golden-path verification (T40). Spec: [docs/superpowers/specs/2026-04-21-…-design.md](docs/superpowers/specs/2026-04-21-symptomatik-s0-foundation-scaffold-design.md), Plan: [docs/superpowers/plans/2026-04-21-….md](docs/superpowers/plans/2026-04-21-symptomatik-s0-foundation-scaffold.md) |
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

## Resume Point

If you're picking this up fresh — here's where we are:

1. **Branch:** `s0-foundation` has 27 commits; `main` has only the spec + plan
2. **Tests:** 62 Vitest unit tests + 11 Playwright E2E tests all passing locally
3. **Build:** `pnpm build` emits 5 prerendered pages (`/`, `/medical-tests/complete-blood-count-cbc/`, `/pl/`, `/pl/badania/morfologia-krwi-cbc/`, `/es/`) + 4 sitemap files + robots.txt
4. **What's been built:** Astro 6 scaffold, i18n infra (EN-at-root + translated segments), Zod-validated content collections, Excel→MDX importer (CBC imported), SEO helpers (canonicalURL, alternatesFor, JSON-LD for MedicalWebPage/BreadcrumbList/WebSite), all 7 components (BaseLayout/ContentLayout/SEOHead/MedicalDisclaimer/LanguageSwitcher/BreadcrumbNav/CookieConsent), infra interfaces (RateLimiter, FileStore with in-memory + CF impls), CI pipeline (typecheck/build/unit tests/Lighthouse/axe/link check/JSON-LD validator/i18n coverage)
5. **Remaining:** T38 = Blazej connects CF Pages to this repo via dashboard. T39 = attach `symptomatik.com` custom domain. T40 = I run the 12-point golden-path verification against the live URL. See the plan file phases 10 for step-by-step.
6. **Known issues surfaced but out of scope for S0:** Excel has 3 genuine duplicate test names, row-misalignment between EN/PL sheets after row ~100, and some overlong metaTitle/metaDescription values (all flagged in `content-sources/` notes; S1 will address).

## Astro + Cloudflare notes (landed during implementation)

- **Astro 6, not 5** — forced by `@astrojs/cloudflare@13` peer dep
- **`output: 'static'`** (not `'hybrid'` — removed in Astro 6) — pages prerender by default, future API routes opt out with `export const prerender = false`
- **`src/content.config.ts`** (not `src/content/config.ts`) — Astro 6's Content Layer API requires it at the top-level content config path
- **`@config '../../tailwind.config.ts'`** in `global.css` — Tailwind 4 requires the directive to pick up the JS config file
- **Sitemap output** lands in `dist/client/` because the Cloudflare adapter moves static assets there post-build — served at the site root on CF Pages deploys

## Sources

- **Source spec:** `Symptomatik_-_Website_Agent_Spec_v1.pdf` (user's Downloads folder — external to repo)
- **Content source:** [`content-sources/medical-tests.xlsx`](content-sources/medical-tests.xlsx) — 102 medical test landing pages in EN + PL, in-repo for reproducibility
- **ES content:** Not yet produced; routing scaffolded, content comes via LLM-assisted translation in a later sub-project

## Related

- [ClaudioBrain](../ClaudioBrain/) — cross-repo context, project registry, conventions
- [blazejmrozinski.com](../blazejmrozinski.com/) — sibling Astro + Cloudflare project, reference patterns

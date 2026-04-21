# Symptomatik.com — S0 Foundation Scaffold — Design Spec

**Date:** 2026-04-21
**Status:** Draft — pending Blazej review
**Repo:** `~/GitHub/symptomatik` → `github.com/b1azk0/symptomatik` (hosted under Blazej's personal GitHub account; business-entity-owned by Digital Savages)
**Entity:** Digital Savages
**Domain:** symptomatik.com — being connected to Blazej's Cloudflare account
**Related:** ClaudioBrain (context), blazejmrozinski.com (Astro + CF reference pattern)

## Context

Symptomatik.com is a planned multilingual (EN/ES/PL) health platform offering lab-results interpretation, symptom checking, mental-health self-assessments, and health calculators. The source spec (`Symptomatik_-_Website_Agent_Spec_v1.pdf`) describes the full site. It is too large to build as a single spec → plan → implement cycle, and is therefore **decomposed into 10 sub-projects** below. This design spec covers **S0 — Foundation Scaffold** only. Each subsequent sub-project (S1–S9) gets its own spec when we reach it.

## Full Project Decomposition (roadmap — not in scope for this spec, but recorded)

| # | Sub-project | Scope |
|---|---|---|
| **S0** | **Foundation Scaffold (this spec)** | Astro + Tailwind + shadcn + i18n routing + base layouts + SEO infra + deploy pipeline + CI; validated end-to-end on one real content page (CBC) |
| S1 | Content platform — medical-tests pillar | Scale S0's pipeline to all 102 tests × EN+PL (204 MDX), `/medical-tests/` pillar page, `RelatedContent` component |
| S2 | AI routing layer (`lib/ai/router.ts`) | Multi-LLM router, retries, fallback, logging, schema validation, rate limiting |
| S3 | App: Lab Results Interpreter (free tier) | `/check-lab-results/` React island + `/api/interpret`, text-input mode, IP-based rate limit |
| S4 | App: Symptom Checker (free tier) | `/symptom-checker/` + `/api/symptom-check`, multi-turn streaming chat |
| S5 | App: Mental Health Assessments | 22 validated instruments, static pages, client-side scoring, no AI |
| S6 | App: Health Calculators | Pure client-side React (BMI, BMR, TDEE, etc.) |
| S7 | Auth + Billing | Clerk or Auth.js, Supabase schema, Stripe subscriptions, feature-gating middleware |
| S8 | Premium features | PDF/OCR upload, image analysis, digital consultation, rich visualizations |
| S9 | Content pillars at scale | Symptoms (500+), diseases, medicines, supplements, diet/exercise/weight, mental-health content |

## S0 Goals

1. Ship a production-ready Astro scaffold on Cloudflare Pages with custom domain wired.
2. Establish i18n routing with **EN at root + translated URL segments per locale** (e.g. `/medical-tests/complete-blood-count/` vs `/pl/badania/morfologia-krwi-cbc/`).
3. Establish SEO infrastructure: per-page meta, canonical, hreflang, JSON-LD, per-locale sitemaps, robots.txt, all automated from content frontmatter.
4. Establish CI gates: typecheck, build, Lighthouse (SEO ≥ 90, Perf ≥ 85), axe a11y, link check, i18n coverage, JSON-LD validation.
5. Establish portability discipline: Cloudflare-specific primitives (KV, R2) live behind interfaces in `lib/infra/`, never leak into app code.
6. Prove the content pipeline end-to-end on **one real page** (CBC in EN + PL), imported from the user's Excel source.

## S0 Definition of Done (objective, verifiable)

1. `symptomatik.com/` — placeholder homepage with nav + language switcher; Lighthouse ≥ 90 SEO / ≥ 85 Perf.
2. `symptomatik.com/medical-tests/complete-blood-count/` loads, Lighthouse ≥ 90 SEO / ≥ 85 Perf.
3. `symptomatik.com/pl/badania/morfologia-krwi-cbc/` loads, same scores.
4. Both CBC pages validate cleanly in Google Rich Results Test (MedicalWebPage + BreadcrumbList).
5. `hreflang` tags cross-link EN ↔ PL correctly; canonical set; `/en/...` 301-redirects to unprefixed.
6. `/sitemap-index.xml`, `/sitemap-en.xml`, `/sitemap-pl.xml`, `/sitemap-es.xml` (stub) served; `robots.txt` allows all, points to sitemap index.
7. Cookie consent banner shown on first visit; GA4 loads only on consent; Cloudflare Web Analytics loads always (cookieless).
8. CI pipeline green on `main`.
9. All 12 items in §10 (Golden-Path Verification) pass on the production deploy.

## Explicit Out-of-Scope for S0

- Spanish (ES) content (routing exists; no pages yet).
- Author bylines (spec Phase 2 — S1 or later).
- Subscription gating, auth, billing (S7).
- App shells for Lab Results / Symptom Checker / Assessments / Calculators (S3–S6).
- Pagefind search (Phase 3).
- AI router and any `/api/` route (S2).
- PDF/OCR upload (S8).
- Additional content pillars (symptoms, diseases, medicines, supplements, diet, mental-health) — S9.
- Final brand direction (colors, fonts, logo) — deferred to post-S0 decision between a Pencil mockup, an Astro template adaptation, or a Claude-Design brand brief. S0 ships with shadcn/ui neutral defaults + "Symptomatik" wordmark placeholder.

## Architecture & Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Astro 5.x | Latest stable |
| Islands | React 18+ via `@astrojs/react` | For interactive components only (language switcher fine as `.astro`; CookieConsent as React) |
| Styling | Tailwind CSS 4.x | Utility-first |
| Component library | shadcn/ui | Neutral preset, Astro-compatible setup |
| Content | Astro Content Collections + MDX, Zod schemas | Strict schema enforcement |
| Language | TypeScript strict mode | `tsc --noEmit` enforced in CI |
| Node target | v20+ | Tooling and CI runtime |
| Deploy adapter | `@astrojs/cloudflare` | **Hybrid mode** — SSG by default, on-demand routes ready for S2+ |
| Host | Cloudflare Pages + Workers | Preview deploys per branch |
| CI | GitHub Actions | See §9 |

**Hybrid-mode rationale:** spec requires API routes for S2+. Hybrid lets us ship predominantly SSG pages in S0 and add `/api/...` routes later without re-architecting.

## Directory Layout (S0 target)

```
symptomatik/
├── content-sources/
│   └── medical-tests.xlsx              # Source-of-truth content; generator reads from here
├── src/
│   ├── components/
│   │   ├── BaseLayout.astro
│   │   ├── ContentLayout.astro
│   │   ├── SEOHead.astro
│   │   ├── MedicalDisclaimer.astro
│   │   ├── LanguageSwitcher.astro
│   │   ├── BreadcrumbNav.astro
│   │   └── CookieConsent.tsx            # React island
│   ├── content/
│   │   ├── config.ts                    # Zod collection schemas
│   │   └── medical-tests/
│   │       ├── en/complete-blood-count.mdx
│   │       └── pl/morfologia-krwi-cbc.mdx
│   ├── i18n/
│   │   ├── locales.ts                   # Locale config + default
│   │   ├── routes.ts                    # Translated-segment mapping + URL composer
│   │   └── ui.ts                        # UI string translations (nav, disclaimer, buttons)
│   ├── lib/
│   │   ├── infra/
│   │   │   ├── rate-limiter.ts          # RateLimiter interface + CFKVRateLimiter
│   │   │   └── file-store.ts            # FileStore interface + CFR2FileStore
│   │   ├── seo/
│   │   │   ├── json-ld.ts               # medicalWebPage, breadcrumbList, webSite helpers
│   │   │   └── meta.ts                  # canonicalURL, alternatesFor helpers
│   │   └── content/
│   │       └── loaders.ts               # collection helpers
│   ├── pages/
│   │   ├── index.astro                  # EN homepage (root)
│   │   ├── [...slug].astro              # EN content catch-all
│   │   ├── pl/
│   │   │   ├── index.astro
│   │   │   └── [...slug].astro
│   │   └── es/
│   │       ├── index.astro
│   │       └── [...slug].astro          # Empty getStaticPaths in S0
│   ├── middleware.ts                    # Locale resolution, /en/ → / 301
│   ├── integrations/
│   │   └── sitemap.ts                   # Custom per-locale sitemap integration
│   └── styles/global.css
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── logos/
├── scripts/
│   └── import-medical-tests.ts          # Excel → MDX generator (idempotent)
├── tests/
│   ├── links.spec.ts                    # Playwright link check
│   ├── a11y.spec.ts                     # axe-core checks
│   └── schema.spec.ts                   # JSON-LD shape validation
├── .github/workflows/
│   └── ci.yml
├── astro.config.mjs
├── tailwind.config.ts
├── wrangler.toml                        # CF Pages config
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── CLAUDE.md                            # Project-level agent context
├── README.md
└── CHANGELOG.md
```

## i18n Mechanics

### Segment mapping table (`src/i18n/routes.ts`)

```ts
export const locales = ['en', 'pl', 'es'] as const;
export type Locale = typeof locales[number];
export const defaultLocale: Locale = 'en';

export const localePrefix = { en: '', pl: '/pl', es: '/es' } as const;

export const collectionSegments = {
  'medical-tests': { en: 'medical-tests', pl: 'badania', es: 'pruebas' },
  // Future collections added here: symptoms, diseases, calculators, mental-health-assessments
} as const;

export function buildURL(args: {
  lang: Locale;
  collection: keyof typeof collectionSegments;
  slug: string;
}): string {
  return `${localePrefix[args.lang]}/${collectionSegments[args.collection][args.lang]}/${args.slug}/`;
}
```

### Per-locale slug + shared canonicalSlug

Every content entry's frontmatter carries:
- `slug` — the locale-specific URL slug
- `canonicalSlug` — the EN slug, used as a cross-locale join key for hreflang discovery
- `lang` — the locale of this entry

### Middleware (`src/middleware.ts`) responsibilities

1. **Strip `/en/` prefix** → 301 to unprefixed. Protects against accidental internal `/en/` links and inbound legacy traffic.
2. **Attach `locale` to `Astro.locals`** by inspecting URL: `/pl/...` → `pl`, `/es/...` → `es`, else `en`.
3. **No auto-redirect from `/` based on `Accept-Language`.** Google's i18n guidance explicitly advises against it (breaks crawlers, creates locale loops). Locale switching is user-driven via `LanguageSwitcher`.

### `hreflang` and canonical generation

`SEOHead` emits for every content page:

```html
<link rel="canonical" href="{absolute URL for this entry}" />
<link rel="alternate" hreflang="en" href="{EN URL}" />
<link rel="alternate" hreflang="pl" href="{PL URL}" />   <!-- only if PL exists -->
<link rel="alternate" hreflang="es" href="{ES URL}" />   <!-- only if ES exists -->
<link rel="alternate" hreflang="x-default" href="{EN URL}" />
```

Logic: find all collection entries sharing `canonicalSlug`, emit one `alternate` per discovered locale. Missing locales simply don't emit.

## Content Collections + Excel Generator

### Collection schema (`src/content/config.ts`)

```ts
import { defineCollection, z } from 'astro:content';

const medicalTest = defineCollection({
  type: 'content',
  schema: z.object({
    slug: z.string(),
    canonicalSlug: z.string(),
    lang: z.enum(['en', 'pl', 'es']),
    title: z.string(),
    titleAlt: z.string().optional(),           // Excel "Test name II"
    category: z.string(),
    categorySlug: z.string(),
    aiUseCase: z.string(),                     // Excel "AI use-case" — fuels S2 prompt routing later
    metaTitle: z.string().max(60),
    metaDescription: z.string().max(160),
    h1: z.string(),
    h1Text: z.string(),
    sections: z.array(z.object({
      heading: z.string(),
      body: z.string(),
    })).length(5),                              // H2_1..H2_5
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
    relatedTests: z.array(z.string()).optional(),
    relatedSymptoms: z.array(z.string()).optional(),
  }),
});

export const collections = { 'medical-tests': medicalTest };
```

**Decision worth noting:** body content is rendered from frontmatter `sections[]`, not from MDX body. The Excel is structured; data-driven rendering keeps MDX in sync with the Excel source of truth. Free-form MDX body remains an option for future editorial pages but is not used for programmatic content in S0/S1.

### Excel → MDX generator (`scripts/import-medical-tests.ts`)

**CLI:**
```
pnpm import:tests [--excel <path>] [--locales en,pl] [--out src/content/medical-tests] [--dry-run]
```
Default `--excel` is `content-sources/medical-tests.xlsx` (in-repo source of truth).

**Source:** `content-sources/medical-tests.xlsx` (copied into the repo so builds are reproducible from any machine). Original filename in user's Downloads was `Final Symptomatik_-_Core_LPs_English+Polish.xlsx`.
- Sheet `EN - SEO optimized` — 18 columns: Test name, Test name II, Category, AI use-case, Meta title, Meta description, H1 title, H1_text, H2_1..H2_5 + _text columns.
- Sheet `PL - original` — 21 columns: same fields in Polish + URL_ending + SCHEMA columns.

**Pipeline:**
1. Load workbook with `exceljs` (pure JS, CF-compatible; no native deps).
2. For each sheet, normalize headers (trim, lowercase) → map to canonical field names per locale.
3. For each data row:
   - Slugify EN `Test name` → `canonicalSlug` (lowercase, hyphens, strip parens).
   - Slugify locale-specific name → locale `slug`.
   - Slugify `Category` → `categorySlug`.
   - Build frontmatter object matching Zod schema.
   - Emit `{out}/{lang}/{slug}.mdx`.
4. Post-write validation: run `astro check` over the generated tree; any schema failure fails the import.
5. Dry-run mode prints planned writes without touching disk.

**Idempotency:**
- If target file exists, read existing `publishedAt`, preserve it, update `updatedAt = today`.
- First generation: both dates = today.
- Same input Excel → identical output (no spurious diffs).

**Failure modes — fail loudly:**
- Slug collision (two rows produce the same slug) → error with both row names.
- Missing required fields on a row → error with row number + missing columns.
- Section count mismatch (row missing H2s) → error, no silent padding.

**S0 scope:** only the CBC row is **written**. All rows are schema-validated on every run (the generator will refuse to proceed if any row fails validation). S1 flips a flag to write all rows.

## Components (S0 set)

| Component | Type | Purpose | Key props |
|---|---|---|---|
| `BaseLayout.astro` | Astro | HTML shell, header/footer, cookie-consent slot, lazy GA4 | `locale`, `canonicalUrl`, `alternates`, `title`, `description` |
| `ContentLayout.astro` | Astro | Extends BaseLayout for content pages: breadcrumbs, disclaimer, section rendering, last-reviewed date | `entry`, `breadcrumbs` |
| `SEOHead.astro` | Astro | **Single source of truth** for all head tags: title, meta description, canonical, hreflangs, OG, Twitter, JSON-LD | `title`, `description`, `canonical`, `alternates`, `jsonLd` |
| `MedicalDisclaimer.astro` | Astro | Liability banner, locale-aware from `i18n/ui.ts` | `locale`, `variant` (`content` \| `ai-result`) |
| `LanguageSwitcher.astro` | Astro | Resolves alternate URLs; hides (not disables) locales with no translation | `currentLocale`, `alternates` |
| `BreadcrumbNav.astro` | Astro | Visual breadcrumbs only — JSON-LD lives in `SEOHead` | `items` |
| `CookieConsent.tsx` | React island | Interactive banner, `localStorage`-backed, GA4 gate (hydrate `client:idle`) | — |

JSON-LD emission is centralized in `SEOHead` deliberately: one place to test structured data against Google Rich Results.

## SEO & Structured Data

### JSON-LD (`src/lib/seo/json-ld.ts`)

Pure functions, no I/O:

```ts
medicalWebPage(entry, url): object     // every content page
breadcrumbList(items): object          // every content page
webSite(locale): object                // homepage only
faqPage(qa): object                    // stubbed in S0; lands when first FAQ content arrives
```

**Root schema choice: `MedicalWebPage`, not `MedicalTest`.** Rationale: `MedicalTest` in schema.org describes an *offered diagnostic test* (entity markup for a clinic/lab), not a *content page about a test*. `MedicalWebPage` is the content-page equivalent and Google's supported rich-results type. Structured `MedicalTest` entity markup can be nested later for specific reference ranges.

`lastReviewed` on every content page is sourced from `updatedAt` — Google uses this as a freshness signal for medical content specifically.

`author` is **omitted**, not set to a placeholder, in S0. Author bylines land with S1 or later per spec Phase 2.

### Sitemaps (`src/integrations/sitemap.ts`)

Custom build-time integration. Astro's built-in `@astrojs/sitemap` doesn't handle per-locale indices with inline hreflang elegantly.

Output:
- `/sitemap-index.xml` — top-level index
- `/sitemap-en.xml`, `/sitemap-pl.xml` — URL entries with `<xhtml:link rel="alternate" hreflang="...">` inline
- `/sitemap-es.xml` — empty stub from day 1

### `public/robots.txt`

```
User-agent: *
Allow: /
Sitemap: https://symptomatik.com/sitemap-index.xml
```

## Infrastructure Interfaces — `lib/infra/`

**Portability discipline:** Cloudflare-specific primitives (KV, R2) never leak into app code. They live behind interfaces in `lib/infra/`. App code depends on the interface; we wire the CF impl today, swap to Redis/Hetzner impls when/if migrating.

### `lib/infra/rate-limiter.ts`

```ts
export interface RateLimiter {
  check(key: string, opts: { limit: number; windowSec: number }):
    Promise<{ allowed: boolean; remaining: number }>;
}
export class CFKVRateLimiter implements RateLimiter { /* CF KV impl */ }
```

### `lib/infra/file-store.ts`

```ts
export interface FileStore {
  put(key: string, data: ArrayBuffer, opts?: { contentType?: string }): Promise<void>;
  get(key: string): Promise<ArrayBuffer | null>;
  delete(key: string): Promise<void>;
}
export class CFR2FileStore implements FileStore { /* CF R2 impl */ }
```

Neither is wired into any S0 page. They are scaffold for S2 (rate-limit) and S8 (file uploads). Committing the interfaces in S0 makes it a review failure if anyone later imports `KVNamespace` or `R2Bucket` directly from app code.

## Cookie Consent

`CookieConsent.tsx` — React island, hydrate `client:idle`. Banner on first visit, `localStorage["symptomatik:consent"] ∈ {"yes","no"}`. CF Web Analytics loads always (cookieless, GDPR-compliant). GA4 loads only on `"yes"`. No third-party CMP needed at this stage; if cookie categories / vendor lists grow, swap in Klaro or similar without changing call sites.

## Deploy Pipeline

- **Repo:** `github.com/b1azk0/symptomatik`, private for S0.
- **Cloudflare Pages project:** connected to GitHub, builds on every push.
- **Production branch:** `main`.
- **Preview deploys:** every non-`main` branch → `<branch>.symptomatik.pages.dev`.
- **Custom domain:** `symptomatik.com` apex + `www` 301→apex; CF-managed SSL; HSTS on.
- **Build command:** `pnpm build`; output `dist/`.
- **Env vars (production / preview):** `PUBLIC_SITE_URL`, `GA4_ID` (optional). Later (S2+): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GROK_API_KEY`, etc.

## CI Pipeline — `.github/workflows/ci.yml`

Runs on every PR and every push to `main`. Must be green to merge.

| Stage | Tool | Fail condition |
|---|---|---|
| Install + typecheck | `pnpm`, `astro check` | Any TS error |
| Build | `pnpm build` | Any build error; any Zod schema failure |
| Lighthouse CI | `treosh/lighthouse-ci-action` against preview URL | SEO < 90, Perf < 85, A11y < 90 |
| a11y scan | `axe-core` via Playwright on homepage + CBC page | Any serious/critical violation |
| Link check | `lychee` on built `dist/` | Any broken internal link |
| JSON-LD validation | Extract `<script type="application/ld+json">` from built HTML, validate shape | Any malformed JSON-LD |
| i18n coverage | Script: every key in `ui.ts` present in all locales | Missing key in any locale |

Google Rich Results Test runs **manually pre-launch**, not in CI (their API is rate-limited and flaky). Static shape validation is the CI proxy; the real test is a manual step in §10.

## Golden-Path Verification — S0 "Done" Gate

Run all 12 items against the preview deployment of the release PR **before merging**. Any failure blocks the merge; no exceptions, no "fix in S1."

1. `curl -sI preview-url/` → 200, `content-type: text/html`.
2. `curl -sI preview-url/medical-tests/complete-blood-count/` → 200.
3. `curl -sI preview-url/pl/badania/morfologia-krwi-cbc/` → 200.
4. `curl -sI preview-url/en/medical-tests/complete-blood-count/` → 301, `location: /medical-tests/complete-blood-count/`.
5. Lighthouse (local CLI) on both content pages → SEO ≥ 90, Perf ≥ 85.
6. Google Rich Results Test on CBC EN URL → MedicalWebPage + BreadcrumbList detected, 0 errors.
7. Google Rich Results Test on CBC PL URL → same.
8. View source on CBC EN → `hreflang="pl"` points to PL URL; `x-default` points to EN URL.
9. View source on CBC PL → `hreflang="en"` points to EN URL without `/en/`.
10. `/sitemap-index.xml` loads; both locale sitemaps referenced; each contains the CBC entry with inline hreflang.
11. Mobile emulation (DevTools or real phone) → layout works, disclaimer readable, language switcher works.
12. Cookie consent flow: clear `localStorage`, reload → banner appears; accept → GA4 loads; reject → GA4 absent; reload → banner gone.

## What CI + Golden Path Don't Catch (Watch Post-Launch)

- **Google Search Console indexation** — crawl behavior, canonical respect only visible post-deploy. Monitor for 2 weeks.
- **Rich-result eligibility drift** — Google periodically stops respecting schemas. Re-run Rich Results Test before every major content-import batch.
- **Core Web Vitals in the field** — Lighthouse is lab-tested; real 3G Android users score differently. CF Web Analytics provides field RUM data from day 1.

## Risks & Open Questions

| Risk / Question | Mitigation / Next action |
|---|---|
| Cloudflare Workers CPU/memory limits bite S8 (PDF/OCR) | Mitigated: `FileStore` + separate service (Hetzner-hosted OCR endpoint or serverless GPU provider). Will be explicitly addressed in S8 spec. |
| Brand direction deferred; content pages ship with neutrals | Low-risk — token-swap is cheap via shadcn CSS vars. Hard deadline: before S1 goes live. |
| Excel → MDX generator edge cases (weird characters, locale-specific quoting) | Dry-run mode + validation failures force human review before first real import. |
| `symptomatik.com` domain cutover timing | Blazej connecting to Cloudflare account now. If DNS lag, S0 ships first to `*.pages.dev`; custom-domain attach is a late-stage cutover with no code impact. |
| ES content absent; routing scaffolded but empty | Legal per Google (partial hreflang coverage is handled). S1 or S9 produces ES via LLM-assisted translation. |

## Next Steps After This Spec Is Approved

1. Invoke `superpowers:writing-plans` skill to generate the detailed implementation plan from this spec.
2. Register Symptomatik in ClaudioBrain project registry (`CLAUDE.md` table + `projects/symptomatik.md`).
3. Initialize `~/GitHub/symptomatik` repo; first commit scaffolds according to plan step 1.
4. Execute plan steps with review checkpoints.

# Symptomatik.com — S1 Content Platform — Design Spec

**Date:** 2026-04-23
**Status:** Draft — pending Blazej review
**Prerequisite:** S0 Foundation Scaffold shipped (v0.1.0, 2026-04-22)
**Related specs:** [`2026-04-21-symptomatik-s0-foundation-scaffold-design.md`](./2026-04-21-symptomatik-s0-foundation-scaffold-design.md)

## Context

S0 shipped the Symptomatik scaffold end-to-end with one real medical-test page (CBC) as a canary in EN + PL. S1 — **Content Platform** — scales the medical-tests pillar to its full intended footprint: all unambiguous, row-aligned tests in EN + PL, a pillar index with search, per-category index pages, and a `RelatedContent` component on every test page. S1 is content-centric; it reuses the S0 scaffold (Astro 6 SSG, Cloudflare Workers-with-Assets, i18n routing, SEO infrastructure) and adds only one external dependency (Pagefind).

## S1 Goals

1. Scale the medical-tests pillar from 1 test (CBC) to **all unambiguous, row-aligned tests × EN + PL** (expected ~90-95 tests × 2 locales = 180-190 pages), published with full S0 SEO infrastructure.
2. Ship the pillar index at `/medical-tests/` + `/pl/badania/` — grouped by category, with Pagefind-powered on-page search, every test discoverable in ≤ 2 clicks.
3. Ship per-category index pages at `/medical-tests/<category-en>/` + `/pl/badania/<category-pl>/` (~15 × 2 = ~30 pages) as narrower landing pages for mid-tail queries.
4. Ship `RelatedContent` component on every test page with manual-curation-with-category-fallback selection.
5. Deliver a reconciliation workbook (`content-sources/medical-tests-reconcile.xlsx`) committed to git, enumerating every row skipped during import and the reason, so Blazej can correct the source Excel in a post-S1 iteration.
6. Lock category translations once in `src/i18n/categories.ts` so category URLs never drift silently across future imports.

## Definition of Done (objective, verifiable)

1. `/medical-tests/` and `/pl/badania/` load; each shows ~15 category sections + a working Pagefind search box; Lighthouse ≥ 90 SEO / ≥ 85 Perf.
2. Every category URL (`/medical-tests/<cat>/` and its PL equivalent) loads 200 and lists member tests with working internal links.
3. Every published test URL loads; page includes `MedicalDisclaimer`, JSON-LD (`MedicalWebPage` + `BreadcrumbList`), canonical URL, hreflang EN↔PL pair, and a `RelatedContent` block with ≥ 3 links.
4. `content-sources/medical-tests-reconcile.xlsx` exists and is committed; `pnpm import:tests` regenerates it deterministically (byte-identical on unchanged source).
5. Per-locale sitemaps include pillar + category + all test URLs. No stale CBC-only contents.
6. Pagefind search from the pillar returns relevant results for EN queries ("blood", "hemoglobin") and PL queries ("morfologia", "tarczyca").
7. CI green: typecheck, Vitest, Playwright E2E (new: pillar + category + search smoke), Lighthouse gates, axe a11y, link check, JSON-LD validator, i18n coverage, reconcile-drift check.

## Explicit Out-of-Scope for S1

- Spanish (ES) medical-tests content — routing exists; content deferred to a later sub-project.
- Author bylines — deferred to a later sub-project.
- Site-wide or header search — Pagefind is scoped to the medical-tests pillar only.
- Embedding-based related content selection (the "D" option from brainstorming) — `RelatedContent` interface is designed to accept it later without rework; implementation lives in a later iteration.
- AI API calls or `/api/*` routes — belongs to S2.
- Mobile hamburger menu — S0 accepted limitation carries over, *except* the "Medical Tests" nav link becomes real (pillar page exists).
- Fixing the source Excel data issues (dupes, row misalignment, PL-only rows, meta overflows) — S1 ships the reconciliation workbook so Blazej can correct the source in a post-S1 iteration; the importer re-run is a small follow-up, not blocking S1 close.

## Brainstorming Decisions (locked)

| Dimension | Decision |
|---|---|
| Scope | **B** — 102 tests × EN+PL + pillar index + per-category indexes + RelatedContent. No ES, no author bylines. |
| Data quality | **Hybrid-with-handoff** — ship clean overlap now, emit reconciliation workbook, Blazej corrects source Excel in a later iteration. S1 close does not block on Excel corrections. |
| RelatedContent | **Manual-with-category-fallback** — if `relatedTests` frontmatter set, use it; else fall back to category siblings. Embedding-based selection is a future drop-in. |
| Pillar index | **Grouped by category on one page + Pagefind search.** Pagefind is scoped to medical-tests content only; ES stubs and legal pages are excluded from the index. |
| Category URL i18n | **Importer extracts once; code owns the lock.** `src/i18n/categories.ts` holds `{en, pl}` slug + label per category key; drift-guarded. |

## Architecture Delta from S0

S1 mostly **uses** the S0 scaffold rather than changing it.

### New files / directories

```
src/
  pages/
    medical-tests/
      index.astro                   # EN pillar page
      [category]/
        index.astro                 # EN category index (prerenders ~15 from categoryMeta)
    pl/badania/
      index.astro                   # PL pillar page
      [category]/
        index.astro                 # PL category index
  components/
    RelatedContent.astro            # used by ContentLayout
    PillarSearch.astro              # Pagefind UI wrapper
    PillarSearch.tsx                # tiny React island for Pagefind interactivity
    TestCard.astro                  # shared: pillar + category + RelatedContent
    CategoryCard.astro              # shared: pillar index
  i18n/
    categories.ts                   # typed category slug + label mapping (source of truth)
  lib/
    medical-tests/
      queries.ts                    # pure build-time helpers over getCollection
scripts/
  import-medical-tests.ts           # UPDATED — classification + reconcile workbook
content-sources/
  medical-tests-reconcile.xlsx      # committed artifact, regenerated by importer
```

### New dependencies

- `pagefind` (devDependency) — runs at build time only; ships a small JS + index payload to clients.

No new runtime dependencies. No AI SDKs (those belong to S2). No new Cloudflare primitives.

### Build flow

```
pnpm build
  → astro build              (renders all pages to dist/)
  → pagefind --site dist --glob "medical-tests/**,pl/badania/**"
  → dist is complete
```

Wired via an Astro integration hook (`astro:build:done`) so `pnpm build` remains a single command.

### What does NOT change from S0

- `output: 'static'` — no API routes added in S1.
- `@astrojs/cloudflare` adapter, apex + www, CF Workers-with-Assets deploy.
- `src/lib/infra/` — no new CF-specific primitives needed (Pagefind is client-side static).
- `SEOHead` — unchanged; pillar and category pages consume it the same way test pages do.
- `BaseLayout`, `ContentLayout` — extended, not replaced.

### What changes subtly in S0 code

- `src/content/schemas.ts` — no shape change; add a `.refine()` on `categorySlug` to assert it's a key in `categoryMeta`. Prevents MDX writing a category slug that doesn't exist in the lock file.
- `BaseLayout.astro` — the "Medical Tests" nav link was a placeholder pointing to `/`; now points to the real pillar URL per locale via `buildURL`.
- `ContentLayout.astro` — embeds `<RelatedContent>` above `<MedicalDisclaimer>` on test pages.

## Data Pipeline & Reconciliation

### Importer classification (`pnpm import:tests`)

```
1. Read EN sheet ("EN - SEO optimized")       → enRows[]
2. Read PL sheet ("PL - original")            → plRows[]
3. Build canonicalSlug index from EN names
4. Classify every row pair:
     OK             — EN[i] + PL[i] both present, unambiguous, no slug collision
     DUPLICATE      — name slugifies to an existing canonicalSlug
     MISALIGNED     — EN[i] and PL[i] both present but names diverge (post-row-100)
     MISSING_PL     — EN[i] present, PL[i] empty
     MISSING_EN     — PL[i] present, EN[i] empty
     META_TOO_LONG  — metaDescription > 160 chars (informational; row still OK)
5. Write MDX only for OK rows.
   - Apply meta truncation if META_TOO_LONG (preserves S0 behavior with ellipsis).
   - Preserve existing `publishedAt` from any file already present at the target path.
6. Resolve categories:
   - First run: extract distinct categories from OK rows → write `src/i18n/categories.ts.tmpl`
     with inferred PL slugs from the Excel `kategoria` column.
     Blazej reviews, renames `.tmpl` → `.ts`, commits.
   - Subsequent runs: warn + fail if an OK row carries a `categorySlug` key not in `categoryMeta`
     ("Add '<key>' to src/i18n/categories.ts and re-run").
7. Emit content-sources/medical-tests-reconcile.xlsx with columns:
     issue_type | en_row | pl_row | en_name | pl_name | category_en | category_pl |
     current_meta | meta_length | suggested_action | your_fix
```

### Determinism

Running `pnpm import:tests` twice on unchanged source produces byte-identical MDX + workbook. Enforced by sorting rows by `canonicalSlug`, stable `publishedAt` preservation, and normalized line endings. CI includes a "reconcile drift" soft gate that flags unexpected diffs.

### Category translation lock (`src/i18n/categories.ts`)

```ts
export const categoryMeta = {
  hematology: {
    en: { slug: 'hematology',   label: 'Hematology' },
    pl: { slug: 'hematologia',  label: 'Hematologia' },
  },
  // ... ~14 more, populated once on first import
} as const satisfies Record<string, Record<'en' | 'pl', { slug: string; label: string }>>;

export type CategoryKey = keyof typeof categoryMeta;
```

- **Source of truth for URLs** is `slug` in this file — never the Excel. Importer writes the *key* (e.g., `'hematology'`) into MDX `categorySlug`; templates resolve the localized slug via `categoryMeta[key][lang].slug`.
- **Drift guard:** any MDX with a `categorySlug` not in `categoryMeta` fails the schema `.refine()` at build time.

### Schema touch-ups

- `medicalTestSchema.categorySlug` gets a `.refine()` asserting membership in `categoryMeta`.
- `medicalTestSchema.relatedTests` stays `z.array(z.string()).optional()`. Values are `canonicalSlug`s; a build-time validator warns (does not fail) if a referenced slug doesn't resolve, avoiding circular build-order issues.

### Reconciliation workbook lifecycle

- Committed to git so the current state is visible in PRs and reviews.
- Regenerated on every `pnpm import:tests` run.
- Expected to shrink over time as Blazej corrects the source Excel. When empty, it can be deleted or left as a zero-row artifact — decision deferred.

## Routing & URL Structure

### URL space after S1

| Type | EN | PL | Count |
|---|---|---|---|
| Pillar index | `/medical-tests/` | `/pl/badania/` | 1 × 2 |
| Category index | `/medical-tests/<cat-en>/` | `/pl/badania/<cat-pl>/` | ~15 × 2 |
| Test page | `/medical-tests/<test-en>/` | `/pl/badania/<test-pl>/` | ~90-95 × 2 |
| **Total new indexable URLs** | | | **~210-220** |

### Page-to-route mapping

- `src/pages/medical-tests/index.astro` — static pillar (EN).
- `src/pages/medical-tests/[category]/index.astro` — prerenders ~15 EN category pages via `getStaticPaths()` reading `categoryMeta` keys.
- `src/pages/pl/badania/index.astro` + `src/pages/pl/badania/[category]/index.astro` — PL mirror.
- Test pages continue using the existing S0 dynamic route (`[slug].astro`). No change.

### URL resolution

- `buildURL({ lang, collection, slug })` — already exists in S0; unchanged.
- `buildCategoryURL(lang, categoryKey)` — new helper in `src/i18n/routes.ts`, reads `categoryMeta[key][lang].slug`.
- `buildPillarURL(lang)` — new helper returning `/{prefix}/{collection-segment}/` with trailing slash.

### Canonical + hreflang policy (inherits from S0)

- **Canonical:** self-referential on every page.
- **hreflang:** EN ↔ PL cross-links on every pillar, category, and test page. `x-default` → EN. ES not emitted until ES content ships.
- **Cross-locale counterparts:**
  - Test pages — via shared `canonicalSlug` (S0 mechanism, unchanged).
  - Category pages — via shared `categoryMeta` key (language-independent).
  - Pillar — EN `/medical-tests/` ↔ PL `/pl/badania/`.
- **`/en/...` 301 redirect** to unprefixed URL remains in effect at the adapter level.

### Breadcrumbs

- Test: `Home > Medical Tests > <Category> > <Test>`
- Category: `Home > Medical Tests > <Category>`
- Pillar: `Home > Medical Tests`

All emitted as `BreadcrumbList` JSON-LD via `SEOHead` + rendered by existing `BreadcrumbNav` component.

### New JSON-LD types

- Pillar: `CollectionPage` with `mainEntity: ItemList` of categories.
- Category: `CollectionPage` with `mainEntity: ItemList` of tests in that category.
- Test: `MedicalWebPage` + `BreadcrumbList` (unchanged from S0).

## Components

### New

| Component | Purpose | Client JS |
|---|---|---|
| `RelatedContent.astro` | Shown above `MedicalDisclaimer` on test pages. Selection rule: if `relatedTests` has ≥ 3 entries, render those (cap 5); else render up to 5 category siblings. If fewer than 3 items can be sourced either way (edge case: sole member of a category with no curation), suppress the block entirely rather than render a half-empty section. Pure SSG. | None |
| `PillarSearch.astro` + `PillarSearch.tsx` | Wraps Pagefind's default UI via a tiny React island. Tailwind/shadcn styling. Scoped to medical-tests index only. | Minimal (Pagefind UI) |
| `TestCard.astro` | Shared card: title, 1-line `aiUseCase`, category tag. Used by pillar, category, and RelatedContent. | None |
| `CategoryCard.astro` | Shared card for pillar: category label, short description, test count, link to category page. | None |

### Touched (not replaced)

| Component | Change |
|---|---|
| `BaseLayout.astro` | "Medical Tests" nav link points to `buildPillarURL(lang)` instead of `/` placeholder. |
| `ContentLayout.astro` | Embeds `<RelatedContent>` above `<MedicalDisclaimer>` on test pages. |

### Page layouts (inline, no separate component)

- **Pillar page** (`medical-tests/index.astro`, PL mirror): H1 → intro paragraph → `<PillarSearch>` → 15 category sections, each with an `<h2>` anchor, short description (from `categoryMeta[key][lang]`), and a grid of `<TestCard>`.
- **Category page** (`medical-tests/[category]/index.astro`, PL mirror): Breadcrumb → H1 → category description → grid of `<TestCard>` for that category's tests.

### `src/lib/medical-tests/queries.ts`

Build-time-only, pure, synchronous:

```ts
getAllTests(lang: Locale): TestEntry[]
getTestsByCategory(lang: Locale): Map<CategoryKey, TestEntry[]>
getTestsInCategory(lang: Locale, key: CategoryKey): TestEntry[]
getSiblingsByCategory(slug: string, categoryKey: CategoryKey, lang: Locale, limit: number): TestEntry[]
getTestBySlug(lang: Locale, slug: string): TestEntry | null
```

Thin wrappers over `getCollection('medical-tests')` with filtering. Unit-tested in Vitest.

### Dependency graph

```
BaseLayout ──► all pages
ContentLayout ──► test pages
                  └─► RelatedContent ──► TestCard
                                          └─► queries.ts

medical-tests/index.astro ──► PillarSearch (island)
                           ──► CategoryCard
                           ──► TestCard
                           ──► queries.ts
                           ──► categoryMeta

medical-tests/[category]/index.astro ──► TestCard
                                      ──► queries.ts
                                      ──► categoryMeta
```

Flat; every component has ≤ 4 direct dependencies.

## Testing & CI

Reuses S0's pipeline (typecheck, Vitest, Playwright, Lighthouse, axe, link check, JSON-LD validator, i18n coverage) with targeted additions.

### Vitest unit (new)

| Target | Assertion |
|---|---|
| `scripts/import-medical-tests.ts` | Classification logic produces expected `issue_type` per fixture row; OK rows generate byte-identical MDX across runs (determinism). |
| `scripts/import-medical-tests.ts` | Reconciliation workbook round-trips: fixture input → output matches golden file. |
| `src/lib/medical-tests/queries.ts` | Each of the 5 query functions, against fixture collection; edge cases (empty category, missing slug, limit boundary). |
| `src/components/RelatedContent` | Fallback path: when `relatedTests` has < 3 entries, pulls from category siblings (cap 5); when curated has ≥ 3, uses those exact slugs (cap 5). Suppresses block entirely if < 3 total items are sourceable. |
| `src/i18n/routes.ts` | New `buildCategoryURL` / `buildPillarURL` helpers for each locale; invariant "same category key → matching hreflang alternates". |
| Category drift | Test asserts every `categorySlug` in the content collection is a key in `categoryMeta`. |

### Playwright E2E (new)

1. `/medical-tests/` and `/pl/badania/` render, localized titles, all ~15 category anchors resolve.
2. Pillar search: type "blood" on EN pillar → ≥ 1 result; type "tarczyca" on PL pillar → ≥ 1 result.
3. Navigation: click `CategoryCard` on pillar → category page loads; click a test → test page loads.
4. Smoke sample: for 5 random test slugs per locale, page is 200 and contains `MedicalDisclaimer` + `RelatedContent` with ≥ 3 links.
5. hreflang: one pillar, one category, one test — alternate points to matching counterpart and returns 200.

### Lighthouse (extends S0 gates)

- Routes added to `lighthouserc.cjs`: pillar EN, pillar PL, one category EN, one category PL, one non-CBC test EN + PL.
- Gates unchanged: SEO ≥ 90, Perf ≥ 85.
- **Known risk:** Pagefind UI ships JS. If it pushes pillar Perf below 85, switch Pagefind UI to load-on-first-interaction before S1 closes.

### JSON-LD validator (extends S0)

- New valid-response tests for `CollectionPage` + `ItemList` on pillar and category pages.
- Breadcrumb-length assertions per page type (pillar=2, category=3, test=4).

### axe a11y (unchanged)

- Automatically runs on new routes via Playwright integration. No new rules.

### lychee link check (unchanged)

- Coverage expands automatically. Dead `relatedTests` frontmatter references surface as broken links.

### i18n coverage script (extended)

- Extended to include pillar + category pages (each EN page must have a PL counterpart).
- Test pages: reconciliation workbook is allowed to contain `MISSING_PL` rows, but published tests must exist in both locales.

### Reconcile drift check (new, soft gate)

- CI runs `pnpm import:tests` and compares against committed MDX + workbook.
- Drift → warning (PR comment), not failure. Importer is deterministic; drift would indicate the Excel changed without an explicit re-run.

### Pre-merge golden-path for S1

1. `/medical-tests/` → 200, Lighthouse ≥ 90 SEO / ≥ 85 Perf.
2. `/pl/badania/` → 200, same scores.
3. One sampled category page (e.g., `/medical-tests/hematology/`) → 200.
4. PL equivalent (`/pl/badania/hematologia/`) → 200.
5. 5 random non-CBC tests × 2 locales → all 200.
6. Pillar search returns results for "blood" (EN) and "morfologia" (PL).
7. JSON-LD validates on pillar, category, and 3 random tests (EN + PL).
8. hreflang correct on pillar, category, and tests.
9. All sitemaps include new URLs; none 404.
10. `content-sources/medical-tests-reconcile.xlsx` committed (content may be non-empty).
11. `src/i18n/categories.ts` exists (no `.tmpl` suffix); category drift check passes.
12. CI pipeline green on `main`.

## Design / UI Timing

S0 shipped on shadcn neutral defaults because only one content page existed. S1 introduces pillar layout, category index layout, search UI, `TestCard`, and `CategoryCard` all at once — the first moment the visual system genuinely matters. **Pencil design work should precede the S1 implementation plan's UI-related tasks.**

Concrete surfaces that need Pencil mockups before implementation:

- Pillar page layout (H1, intro, search box placement, category-section rhythm).
- Category page layout (breadcrumb, H1, test grid).
- `TestCard` and `CategoryCard` visual language.
- Pagefind search box empty / active / results states.
- `RelatedContent` block visual.

Non-visual tasks (importer, queries, routing, schema, categories.ts, JSON-LD wiring) can start without Pencil.

## Open Questions (resolved inline during brainstorm; documented for traceability)

None outstanding. All five brainstorming dimensions resolved (see *Brainstorming Decisions* table).

## Acceptance

S1 is accepted when the Definition of Done (all 7 items) passes on the production deploy, and the 12-point pre-merge golden-path is green on `main`.

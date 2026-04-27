# Symptomatik.com — Programmatic OG Cards — Design Spec

**Date:** 2026-04-27
**Status:** Draft — pending Blazej review
**Prerequisite:** S1 Content Platform shipped (v0.2.0). 121 paired tests / 242 MDX live in production.
**Related specs:** [`2026-04-23-symptomatik-s1-content-platform-design.md`](./2026-04-23-symptomatik-s1-content-platform-design.md)
**Reference implementation:** `~/GitHub/blazejmrozinski.com/scripts/generate-covers.ts` (build-time satori → resvg pipeline)

## Context

Every public landing page on symptomatik.com currently emits the same default `og:image` (`/og-default.png`). When a page is shared on social — Twitter, LinkedIn, Slack, iMessage, WhatsApp link previews, Discord — every URL looks identical. The blog at blazejmrozinski.com solved this with a build-time pipeline that renders one PNG per post using satori (HTML/CSS → SVG) and resvg-js (SVG → PNG); each cover encodes the post's topic via color, illustration, and title.

This spec adapts the same mechanism for symptomatik's content surface — homes, the medical-tests pillar root, category indexes, and individual test pages — using the locked Warm Linen × patient.info visual direction (`docs/design/illustration-brief.md`) and the per-category illustrations + accent colors that already exist in `src/i18n/categories.ts`.

## Goals

1. Generate a unique 1200×630 OG card for every public LP — homes (3 locales), medical-tests pillar root (2 locales), category indexes (32 = 16 categories × 2 locales), and test pages (242 = 121 × 2 locales). Total: **279 cards**.
2. Use a single shared composition (layout B) across all four page types, with per-page-type data lookups from existing maps (`categoryMeta`, MDX frontmatter, page-type registry) — no new content modeling required.
3. Inherit each card's accent + illustration from the existing per-category design tokens. New tests added to `medical-tests.xlsx` get OG cards on the next `pnpm build` with no per-page authoring effort.
4. Respect the project's hard rule that Astro `output: 'static'` (`CLAUDE.md` rule 7) — generation happens at build time, never at the edge.
5. Keep `pnpm dev` fast — the script is skipped in dev (pages fall back to `/og-default.png`).

## Definition of Done (objective, verifiable)

1. `pnpm build` produces 279 PNGs at `public/og/...` matching the URL hierarchy listed in §6 below. `pnpm generate:og --force` regenerates all of them deterministically (byte-identical on unchanged source).
2. Every public LP's HTML response includes `<meta property="og:image" content="https://symptomatik.com/og/<derived-path>.png">` and `<meta name="twitter:image" content="...">` pointing at the page-specific PNG. Legal pages continue to use `/og-default.png` (out of scope).
3. Each generated PNG is exactly 1200×630, ≤ 80 KB, and uses Warm Linen (`#F5F0EC`) background + per-category accent + the page's category illustration + serif title.
4. The Twitter Card Validator (`https://cards-dev.twitter.com/validator`) and the LinkedIn Post Inspector (`https://www.linkedin.com/post-inspector/`) render the card correctly for at least one EN test, one PL test, one category index, and one home page (manual smoke after deploy).
5. Polish titles longer than 30 chars auto-shrink one font tier; titles longer than 50 chars shrink two tiers; 3+ line overflow ellipses cleanly. Verified visually with at least 3 long-PL test fixtures.
6. CI green: typecheck, Vitest unit tests for the path-derivation helper and the data-lookup layer, link check (no broken `/og/...` references in the rendered HTML).
7. PNGs are committed under `public/og/` (≤ ~3 MB initial commit). Subsequent content changes update PNGs naturally via `pnpm build`; the cache index (`scripts/.og-cache.json`) makes incremental builds fast (≤ 5 s when no source changes).

## Brainstorming Decisions (locked)

| Dimension | Decision |
|---|---|
| Scope | **A** — public content only: homes + pillar root + category indexes + tests. Legal pages share `/og-default.png`. |
| Layout | **B** — asymmetric bleed (illustration anchored right ~55%, soft-fade mask into Warm Linen on its left edge), accent band at top, serif title in left ~45% column, tiny line-art motif next to brand mark. |
| Mechanism | **A** — build-time satori → resvg pipeline. Skipped in `pnpm dev`. PNGs committed to git. |
| Title font | **Fraunces Variable** (serif, display-friendly, single TTF ~80 KB). Geist Variable (already a dep) for pill + brand mark. |
| URL strategy | **Mirror canonical pathname** — `/og/<page-path>.png`. Homes use `/og/home-<locale>.png` since `/` has no path. |
| Auto-shrink ladder | 96 px ≤ 30 chars → 76 px ≤ 50 chars → 60 px > 50 chars. Max 3 lines via `-webkit-line-clamp`. |
| Per-page-type accent | Home `#1a1a1a` (neutral dark). Pillar `#8B6F4F` (earthy brown). Category + test inherit `categoryMeta[key].paletteAccent`. |
| Decorative motif | Three soft arcs SVG, color = page accent, opacity 0.5, sits next to brand mark. Universal across all card types (no per-category artwork required). |

## Explicit Out-of-Scope

- **Legal pages** (cookies, privacy, terms, medical-disclaimer × 3 locales). They use the existing shared `/og-default.png`.
- **Per-test custom illustrations.** Every test in a category shares its category's illustration (matches the current pillar/category page design).
- **Manual override via MDX frontmatter** (`ogImage:` field). Possible later; not needed for any current page.
- **Light/dark variants.** Only one card variant per page — Warm Linen palette.
- **Animated cards / GIFs.**
- **ES medical-tests OG cards.** ES has no medical-tests content yet (S1 deferred); only ES home gets a card.
- **Hand-crafted hero image for the home pages.** Programmatic card matches the system; can be swapped for a hand-crafted hero in a later iteration if desired.
- **Edge runtime fallback** for unknown URLs. Build-time covers everything; missing PNG falls back to `/og-default.png` via the SEOHead default.

## Architecture

### Pipeline

```
content-sources/medical-tests.xlsx
        │
        │  pnpm import:tests  (existing)
        ▼
src/content/medical-tests/{en,pl}/*.mdx        ──┐
src/i18n/categories.ts (16 entries × accent + illo) ─┼─→  pnpm generate:og  ──→  public/og/**/*.png  (279 PNGs)
src/lib/og/page-types.ts (4 page-type configs)   ─┘
                                                          │
                                                          ▼
                                                  pnpm build (Astro SSG)
                                                          │
                                                          ▼
                                              SEOHead.astro emits og:image
                                              from page's canonical pathname
```

### Build-order dependency

`prebuild` runs `import:tests` (existing — refreshes MDX from xlsx), then `generate:og` (new), then Astro builds. Both `import:tests` and `generate:og` are idempotent.

### Why build-time, not edge

Symptomatik runs `output: 'static'` (CLAUDE.md hard rule 7). All content URLs are known at build time (242 tests + 32 categories + 4 pillar/home pages). Build-time generation is:

- Deterministic — same source → same bytes.
- Free at the edge — Cloudflare caches static assets without any Worker invocation.
- Debuggable — the PNG sits on disk; you can open it before deploy.
- Aligned with the blog reference — same pattern, half the moving parts.

The trade-off (build adds ~15–30 s per `pnpm build`) is paid by CI, not by users.

## Component design

### Card composition (single template, four data shapes)

All cards share the same satori HTML tree:

```
┌──────────────────────────────────────────────────────┐
│ ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░  ← accent band (gradient → transparent), height 38px (6cqw)
│                                                       
│  [PILL]                            ┌─────────────┐
│                                    │             │
│  Title in serif,                   │ Illustration │
│  one to three lines,               │ (soft-fade  │
│  auto-shrink ladder.               │  mask on    │
│                                    │  left edge) │
│                                    │             │
│  ⌒⌒⌒  symptomatik.com              │             │
│                                    │             │
└──────────────────────────────────────────────────────┘
   ← left 45% (text panel) →   ← right 55% (illustration with soft fade) →
```

Geometry (1200×630 canvas, padding-relative percentages):

- Accent band: top 0, height 38 px, `linear-gradient(90deg, accent, transparent)`.
- Text panel: left 4 cqw, top 9 cqw, right 50%, bottom 4 cqw. Pill on top, serif title in middle (fills available height), motif + brand at bottom.
- Illustration: left 42%, right −3 cqw (slight bleed), top 0, bottom 0. Background-image cover. CSS mask: `linear-gradient(90deg, transparent 0%, black 18%, black 100%)` → soft fade into Warm Linen on the illustration's left edge. `filter: saturate(0.95)`.
- Motif: SVG, three quadratic-bezier arcs, 60×22 viewBox, stroke = page accent, opacity 0.5.
- Pill: rounded-full, `bg = accent @ 9% alpha`, `border = accent @ 30% alpha`, `color = accent @ 100%`. Sans-serif (Geist), uppercase, letter-spacing 0.15 em.
- Title: Fraunces 600 weight. Auto-shrink ladder. `line-clamp: 3`.
- Brand: Geist 500, sans-serif, uppercase, letter-spacing 0.18 em, `color: #666`.

### Per-page-type data shape

```typescript
// src/lib/og/page-types.ts (new)

export interface OGCardData {
  pageType: 'home' | 'pillar' | 'category' | 'test';
  locale: 'en' | 'pl' | 'es';
  title: string;          // the serif H1 on the card
  pillLabel: string;      // the small uppercase pill (e.g., "Cardiometabolic")
  illustration: string;   // absolute filesystem path to the webp/svg
  accent: string;         // hex, e.g. "#C75040"
  outputPath: string;     // relative to public/og/, e.g. "medical-tests/apob.png"
  pageUrl: string;        // canonical URL pathname, e.g. "/medical-tests/apob/"
}

export function collectAllCards(): Promise<OGCardData[]>;
```

Implementation walks four sources:

1. **Homes** — three hardcoded entries (one per locale). Title is the i18n tagline. Illustration: `pillar/medical-tests.webp`. Accent: `#1a1a1a`. Pill: `Symptomatik`.
2. **Pillar roots** — two hardcoded entries (en, pl). Title: i18n "Lab results, decoded." Illustration: `pillar/medical-tests.webp`. Accent: `#8B6F4F`. Pill: locale-specific "Medical Tests" / "Badania".
3. **Category indexes** — iterate `Object.keys(categoryMeta)` × `['en', 'pl']`. Title: per-category tagline added to `categoryMeta[key].en.tagline` / `.pl.tagline` (extending the existing `{slug, label}` per-locale shape — 16 × 2 = 32 short strings). Illustration + accent + pill from `categoryMeta[key]`.
4. **Tests** — iterate `getCollection('medical-tests')`. Title from MDX frontmatter `title`. Illustration + accent + pill from the test's `categorySlug` → `categoryMeta` lookup.

### URL/filename derivation

Single helper used by both the generator and `SEOHead.astro`:

```typescript
// src/lib/og/path.ts
export function ogPathForCanonical(pathname: string, locale: 'en'|'pl'|'es'): string {
  // "/" → "home-en.png", "/pl/" → "home-pl.png", "/es/" → "home-es.png"
  if (pathname === '/' || pathname === `/${locale}/`) return `home-${locale}.png`;
  // "/medical-tests/apob/" → "medical-tests/apob.png"
  return pathname.replace(/^\/+|\/+$/g, '') + '.png';
}
```

`SEOHead.astro` constructs `og:image` as:

```typescript
const ogImageAbsolute = ogImage ?? new URL(`/og/${ogPathForCanonical(canonicalPath, locale)}`, Astro.site).toString();
```

Existing `ogImage?: string` prop continues to support manual overrides; the default flips from `/og-default.png` to the derived per-page path.

If a generated PNG is missing for some reason (build interrupted, edge case), the browser will 404 and most platforms fall back to no image — acceptable. We don't add a HEAD-check fallback at request time; we rely on the build being correct.

### Legal pages (out of scope, explicit)

Legal page templates (`LegalLayout.astro`) explicitly pass `ogImage="/og-default.png"` so they bypass the derivation logic. Add a Vitest assertion that they do.

## Build integration

### `package.json` script changes

```jsonc
"scripts": {
  ...
  "generate:og": "tsx scripts/generate-og-cards.ts",
  "prebuild": "pnpm import:tests && pnpm generate:og",
  "build": "astro build",
  ...
}
```

`pnpm dev` does **not** run `prebuild`. Dev pages keep using `/og-default.png` (the existing fallback). Faster local loop.

### Cache index for incremental builds

`scripts/.og-cache.json` (gitignored) records, per output path, the SHA-256 of the input data: `{ title, pillLabel, illustrationFileHash, accent, templateVersion }`. The script:

1. Computes the new input hash for every card.
2. Compares against the cached hash.
3. Skips PNG generation if the input + the template version are unchanged AND the output PNG exists on disk.
4. Always regenerates with `pnpm generate:og --force`.

Template version is a hardcoded string (e.g. `"v1"`) bumped manually whenever the satori template changes. Bumping invalidates the entire cache.

CI builds typically hit the cache for unchanged content (most builds touch a small subset). Clean rebuilds (`--force`) take ~15–30 s for all 279 cards.

### Git policy

- `public/og/` — committed. Treated as build artifacts produced by `pnpm import:tests` + `pnpm generate:og`, the same pattern used for the existing `src/content/medical-tests/{en,pl}/*.mdx` (also generated, also committed).
- `scripts/.og-cache.json` — gitignored.
- `.superpowers/` — gitignored (already done in this session).

PR workflow: any content change runs the prebuild locally, the developer commits both the source change AND the regenerated PNGs in the same commit. Reviewers can preview the OG card directly.

## Pages / files modified

| File | Change |
|---|---|
| `package.json` | Add `generate:og` script + `prebuild` chain. Add deps: `satori`, `@resvg/resvg-js`, `@fontsource-variable/fraunces`. |
| `scripts/generate-og-cards.ts` | **New.** Walks page-type registry, builds satori element per card, writes PNG. |
| `src/lib/og/page-types.ts` | **New.** `collectAllCards()` — pure function over `categoryMeta` + `getCollection('medical-tests')` + hardcoded home/pillar entries. |
| `src/lib/og/template.ts` | **New.** `buildCardElement(data: OGCardData) → SatoriElement`. The shared composition. |
| `src/lib/og/path.ts` | **New.** `ogPathForCanonical(pathname, locale)`. Used by both generator and SEOHead. |
| `src/components/SEOHead.astro` | Update default `og:image` derivation: replace `/og-default.png` fallback with `/og/<derived>.png`. Manual `ogImage` prop still wins. |
| `src/i18n/categories.ts` | Extend each entry's per-locale `{slug, label}` shape with `tagline` (used as the H1 on category index OG cards). 16 × 2 = 32 short strings. Update `getCategoryLabel` neighbours with `getCategoryTagline(key, lang)`. |
| `src/i18n/ui.ts` | Add 5 keys: `og.home.title` (3 locales) and `og.pillar.title` (en, pl). Reuses the existing `{section}.{key}` convention. |
| `src/content/legal/**` | Verify legal layout passes `ogImage="/og-default.png"` explicitly to bypass derivation. |
| `public/og/` | **New directory.** Generated. Committed. ~279 PNGs. |
| `scripts/.og-cache.json` | **New.** Gitignored. Build-incremental hash index. |
| `.gitignore` | Add `scripts/.og-cache.json`. (`.superpowers/` already added.) |

## Testing

### Unit (Vitest)

- `src/lib/og/path.test.ts` — exhaustive table of `(pathname, locale) → ogPath` cases including homes, pillars, categories, tests, en/pl/es, edge cases (trailing slash, double slash).
- `src/lib/og/page-types.test.ts` — `collectAllCards()` returns the expected count (3 + 2 + 32 + 242 = 279), every entry has all required fields, illustration paths exist on disk, accents are valid hex.

### Build-time (script)

- `scripts/generate-og-cards.ts` exits non-zero if any card's illustration file is missing on disk (fail fast, never silently use a default).
- Smoke check: at end of generation, confirm exactly `expectedCount` PNGs exist under `public/og/`.

### Visual (manual)

- Twitter Card Validator + LinkedIn Post Inspector for: one EN home, one PL home, one EN category index, one EN test, one PL test (long title).
- Eyeball: `dist/og/medical-tests/apob.png` (post-build) opens cleanly at 1200×630, illustration visible, no broken text overflow.

### CI

- Add `pnpm test` includes the new path/page-types tests.
- Existing link checker continues to pass; rendered HTML's `og:image` URLs are valid relative paths to existing files (the link checker should already cover this).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Build time grows unacceptable as content scales (e.g., 1000+ tests) | Cache index makes incremental builds fast; full regeneration is parallelizable later if needed (currently 279 cards is single-threaded fine). |
| Fraunces font file doesn't render Polish diacritics correctly in satori | Fraunces Variable supports Latin Extended (verified). Fallback path: ship the static `Fraunces-Regular.ttf` + `Fraunces-Bold.ttf` weights instead of variable; prefer variable for size. Confirmed during plan. |
| Long titles in unforeseen languages overflow even at 60 px | `-webkit-line-clamp: 3` ellipses cleanly. Worst-case fallback: drop another tier to 48 px (added to ladder if needed during implementation). |
| `categoryMeta` palette accents render too dim against Warm Linen at small sizes | Dev verified visually in companion mockups (v3). Two accents already passed (`#C75040`, `#8B7B65`); remaining 14 verified during implementation by spot-checking generated PNGs. |
| `public/og/` git size grows over time as test content evolves | Each PNG is ~10 KB, 279 = ~3 MB initial. Even tripling over 2 years stays under 10 MB — well within git tolerance. |
| satori or resvg-js have a major-version bump that breaks the script | Pin both to known-working versions; treat upgrades like any other dep upgrade. |

## Out of plan

The plan that follows this spec will:

1. Sequence the work into rigid TDD steps (helpers + path tests first; data layer + tests; template; script; SEOHead wiring; full-build smoke).
2. Identify any unknowns flagged here (e.g., where to put i18n taglines — categories.ts vs new strings.ts).
3. Estimate the work and the order of commits.

That plan lives at `docs/superpowers/plans/2026-04-27-symptomatik-og-cards.md` and is written by the writing-plans skill, not here.

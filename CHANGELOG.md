# Changelog

## 2026-04-27 — Phase 2 coverage: 1:1 EN↔PL parity (+36 translations)

Every test on the platform now has both an English and a Polish version.
121 unique tests, 121 EN MDX + 121 PL MDX = 242 pages total. Up from 210
after Phase 1 (and 118 at the start of the day).

- **36 medical translations** authored across both directions:
  - 21 PL→EN (Kidney function: ACR, eGFR, Creatinine, Microalbuminuria;
    Liver: LFT panel; Heart: BNP, Troponin; Coagulation: APTT, D-dimer;
    Cardiometabolic: CK; Autoimmunology: ANCA, HLA-B27, tTG; Infections:
    Borrelia, EBV/CMV, Hepatitis Panel; Gastro: Gut Microbiota Analysis;
    Immunology: IL-6/TNF-alpha, Immunoglobulins; Mental Health: EPDS,
    UCLA Loneliness Scale).
  - 15 EN→PL (Cardiometabolic: Adiponektyna, Markery zespołu
    metabolicznego; Liver: Albumina; Hematology: Liczba płytek krwi,
    Liczba krwinek czerwonych/białych (RBC/WBC); Coagulation:
    Tromboplastyna; Gastro: Lipopolisacharydy (LPS); Immunology:
    IgA/IgG test celiakii, Całkowity poziom IgE w surowicy,
    Immunoglobulina M (IgM); Endocrinology: Hormon T3/T4; Mental
    Health: PSQI).
- **3 new aliases + 4 EN duplicate prunes** before translation reduced
  the gap from 46 to 36. Aliases: Specific IgE↔IgE swoiste, PT↔PT/INR,
  Bilirubin↔Bilirubina (z CMP). EN duplicates removed from the import
  via `EN_KNOWN_DUPLICATE_NAMES`: "C-Reactive Protein (CRP)" (dup of
  CRP), "Thyroid Stimulating Hormone (TSH)" (dup of TSH (...)),
  "DASS-21 (...Scale)" (dup of "...Scales"), "Lipoprotein(a)" (dup of
  "Lipoprotein(a) - Cardiovascular Risk").
- **Cross-locale linking verified.** Each new MDX `canonicalSlug` points
  at the existing counterpart's slug so `findAlternatesByCanonicalSlug`
  resolves correctly (e.g. `pl/wapn` → `en/calcium`,
  `en/borrelia` → `pl/borrelia`, `en/creatinine` → `pl/kreatynina`).
- **Note:** New translations live in MDX only; the source xlsx still has
  106 EN rows + 106 PL rows. Future imports won't regenerate the
  manually-authored MDX (no source row to read from). For long-term
  source-of-truth integrity, the new tests should eventually be
  reflected in the xlsx — but that's a separate cleanup pass.
- **Verification:** 165 Vitest pass, 0 errors / 0 warnings on pnpm
  check, build clean (242 MDX, all 16 categorySlug values registered
  in categories.ts).

## 2026-04-27 — Phase 1 coverage: all source-content tests now generate MDX (+92 pages)

Every row in `medical-tests.xlsx` now produces an MDX file regardless of how the
counterpart locale's row is ordered. Result: 104 EN + 106 PL = 210 MDX, up from
59 + 59 = 118 (+92 pages). Phase 2 (translations for the 48 locale-only tests)
is the next pass.

- **Decoupled row pairing.** `runImport` no longer pairs by row index. EN and
  PL sheets are processed independently — each non-duplicate row writes its
  own MDX file. The MISALIGNED skip path is gone; misalignment is no longer
  fatal because rows aren't paired in the first place.
- **Cross-locale linking via alias map.** `scripts/test-aliases.ts` lists the
  ~50 cognate pairs whose names slugify differently (`Calcium` ↔ `Wapń`,
  `Cortisol` ↔ `Kortyzol`, `ESR` ↔ `OB`, `Iron Panel` ↔ `Panel żelaza`, …).
  PL rows use the alias to derive `canonicalSlug` from the matching EN test.
  PL/EN tests with names that already share a slug (PHQ-9, AUDIT, CA-125,
  DHEA-S, …) auto-pair without an alias entry. PL- or EN-only tests
  self-canonical and become single-locale pages until the other side is
  authored.
- **Category taxonomy extended.** Source xlsx surfaces 4 categories not in
  `categories.ts`: `infections`, `coagulation`, `immunology`, `kidneys`.
  Added with PL/EN labels + palette accents (illustrations to come). Two
  EN labels (`Inflammation`, `Endocrinology`) and three PL labels (`Mięśnie`,
  `Genetyka`, `Toksyny`) normalize into existing keys via a label→key table
  in the importer.
- **Diagnostics:** import now reports `wrote N file(s) (X EN + Y PL)` rather
  than the old `tests × 2 locales` line, since EN and PL counts can differ.
  Reconcile workbook only logs true duplicates and meta-too-long warnings now.
- **Verification:** 165 Vitest pass, 0 errors / 0 warnings, build clean
  (210 MDX, all categories register against `categories.ts`).

## 2026-04-27 — EN↔PL alignment audit: fix 11 broken cross-locale links

- **Audit:** Cross-checked all 56 canonical EN↔PL pairs with 3 parallel agents.
  Found 11 broken cross-locale mappings — all in the Mental Health cluster +
  the row 54 Lipoprotein(a)/Zonulina case from this morning.
- **Pattern:** PL files had correct content/titles but their `canonicalSlug`
  pointed at a DIFFERENT EN test, the result of `namesLikelyAligned`'s 3-char
  substring fallback firing on generic English tokens like "test", "scale",
  "scre", "tio" between unrelated psychometric instruments (PHQ-9 ↔ DAST-10,
  AUDIT ↔ EPDS, K10 ↔ AUDIT, C-SSRS ↔ ISI, OCI-R ↔ PHQ-15, PCL-5 ↔ K10,
  PSQI ↔ C-SSRS, DASS-21 ↔ UCLA, DASS-21 ↔ ASRS, DAST-10 ↔ EAT-26,
  Lp(a) ↔ Zonulina).
- **Heuristic:** `namesLikelyAligned` now extracts the leading acronym (e.g.
  `PHQ-9`, `AUDIT`, `K10`, `DASS-21`) when both names start with one and
  enforces an exact match. Falls back to existing prefix/substring logic for
  non-acronym names (Cortisol/Kortyzol, Ferritin/Ferrytyna, etc.). 14 new unit
  tests covering the acronym rule both ways. The rule also surfaced 3 pairs
  the old heuristic was missing — CA-125, CA 19-9, RF — which now correctly
  generate paired EN+PL MDX (+6 files).
- **Manual fixes:** 4 broken-but-recoverable pairs (AUDIT, DAST-10, C-SSRS,
  K10) had correct PL content under a wrong `canonicalSlug`; repointed each
  to its real EN counterpart. 7 PL-only tests (ASRS, EAT-26, ISI, PHQ-15,
  EPDS, UCLA, Zonulina) had `canonicalSlug` pointing at unrelated EN
  instruments; set each to self-canonical so cross-locale links cleanly fall
  back to `/pl/` home. EN-only tests (PHQ-9, PSQI, OCI-R, PCL-5, DASS-21 ×2,
  Lipoprotein(a) Heart) likewise lose their phantom PL partners and fall back
  to `/`.
- **Prod:** All 112 EN+PL test URLs returned 200 before the fix; full audit
  table covers 56 canonical pairs (45 correctly aligned + 11 broken now
  fixed). Tests: 165 Vitest passing (was 151), build clean, 144 pages indexed
  (was 138).

## 2026-04-27 — Content reconcile: refusal cells + alignment heuristic

- **Source data:** Replaced 5 LLM-refusal cells in `content-sources/medical-tests.xlsx`
  PL sheet with full 4-paragraph H2_5 sections (wskazania / przygotowanie / przebieg /
  potencjalne skutki uboczne) for DHEA-S, SHBG, hs-CRP, Wapń, Borrelia. Also fixed PL
  row 81 H2_5 heading (was incorrectly "Posiew krwi", now "Borrelia").
- **Heuristic fix:** `namesLikelyAligned` in `scripts/import-medical-tests.ts` now skips
  common Polish noun endings (`-ina`, `-yna`, `-oza`, `-owy`, `-owa`, `-ego`) in its
  3-char substring fallback. Prevents the false positive where row 54 EN "Lipoprotein(a)"
  was matching PL "Zonulina" purely on the shared suffix `-ina`, which had been
  silently overwriting `pl/zonulina.mdx`'s `categorySlug` from `gastro` to `heart` on
  every import. Added unit tests for Cortisol/Kortyzol (still aligns) and
  Lipoprotein(a)/Zonulina (now correctly MISALIGNED).
- **Generated MDX:** 5 new aligned tests imported (10 files × 2 locales): GAD-2 + PHQ-2
  Ultra-Brief Screening, Lipoprotein(a) Cardiovascular Risk, PHQ-A, Rosenberg
  Self-Esteem Scale, SCOFF. Refusal fixes propagated to `pl/dhea-s.mdx`,
  `pl/hs-crp.mdx`, `pl/shbg.mdx`. Wapń (row 29) and Borrelia (row 81) PL fixes
  remain in the source but don't propagate yet — both rows are correctly classified
  MISALIGNED with their EN counterparts.
- **Tests:** 151 Vitest passing (was 149); 0 errors / 0 warnings on `pnpm check`;
  production build clean (138 pages indexed by Pagefind, +8 from S1 ship baseline).

## 2026-04-24 — S1 Content Platform shipped · v0.2.0

All 32 S1 tasks complete. Production at https://symptomatik.com now
includes the full medical-tests pillar: 51 tests × EN+PL imported from
Excel, 2 pillar index pages, 24 category index pages, Pagefind search,
RelatedContent on every detail page, 13 custom illustrations.

**Golden-path verification (prod):**
- `/medical-tests/` + `/pl/badania/` → 200, Lighthouse SEO ≥ 90 / Perf ≥ 85
- 12 × category routes per locale → 200
- 51 × test-detail routes per locale → 200 (spot-check on 5 random non-CBC)
- Pillar search returns results for "blood" (EN) and "morfologia" (PL)
- JSON-LD (`CollectionPage` + `ItemList` + `BreadcrumbList`) valid on pillar
  + category + test pages in both locales
- hreflang bidirectional on pillar + category + test pages
- Sitemaps include all new URLs (65 EN, 64 PL, 1 ES)
- CI green on `main`

**Shipped in S1:**
- 51 medical-test detail pages × EN+PL = 102 total content pages
- 2 pillar pages (`/medical-tests/`, `/pl/badania/`) with hero, featured
  "Start here" 3-card section, 4-col category grid
- 24 category index pages (12 × EN+PL) with category illustration, test
  listing, and "Related categories" 3-card section
- Pagefind 1.5.2 postbuild indexing, scoped to medical-tests content only
- `PillarSearch` React island — lazy-loads Pagefind UI on pillar page
- `RelatedContent` component embedded in `ContentLayout` — curated-then-
  siblings algorithm, graceful hide when fewer than 3 candidates
- `TestCard` + `CategoryCard` components with optional illustration zones,
  line-clamped titles, locale-aware pluralization
- 13 custom illustrations: 12 category (`autoimmunology`, `cardiometabolic`,
  `gastro`, `heart`, `hematology`, `hormonal`, `inflammatory`, `liver`,
  `mental-health`, `metabolism`, `oncology`, `urine`) + 1 pillar hero.
  Flat pastel editorial style, locked in `docs/design/illustration-brief.md`.
- JSON-LD helpers: `collectionPage()`, `itemList()` — validated on pillar +
  category routes
- `LanguageSwitcher` refactor — discreet `EN / ES / PL` mono-font treatment,
  always renders all three codes, falls back to locale home (`/`, `/es/`,
  `/pl/`) when a page has no specific alternate
- `t()` interpolation — accepts optional `vars?: Record<string, string>`,
  substitutes `{name}` tokens. Backward compatible.
- `formatTestCount(locale, count)` — `Intl.PluralRules`-based, covers
  EN/PL/ES. PL 3-form Slavic paradigm (`badanie` / `badania` / `badań`).
- 29 new i18n keys across EN/PL/ES: `pillar.*`, `category.*`,
  `search.placeholder`, `category.relatedHeading`, and more
- Sitemap integration extended to enumerate pillar + category routes
  dynamically from `categoryMeta`
- CI extensions: Lighthouse config now covers 7 routes (pillar + category);
  JSON-LD validator accepts `CollectionPage` + `ItemList`; i18n coverage
  verifies 13 EN↔PL route pairs; new `validate-reconcile-drift` soft-gate
  surfaces Excel importer drift

**Tests: 149 Vitest + 21 Playwright E2E, all green.** (Was 62 + 11 at S0.)
New specs: `plurals`, `t-interpolation`, `category-card`, `pillar.spec`,
`search.spec`, `navigation.spec`, `hreflang-pillar.spec`.

**Accepted limitations for S1 (revisit in S2+):**
- Excel reconcile drift: `pnpm validate:reconcile-drift` warns that ~30+
  PL MDX files would change on re-import. Soft-gate only. Blazej to correct
  source Excel and rerun import in a follow-up.
- ES pillar + category pages not built. ES remains stubs-only per S0 scope.
- Mobile hamburger menu still deferred (waiting on S3+ for real app
  targets in the header nav).
- Embedding-based RelatedContent deferred — current implementation uses
  curated slugs + category siblings fallback, which is good enough for v1.

**Next: S2 — AI routing layer**
Multi-LLM router behind `src/lib/ai/router.ts` interface; all S3+ app
features (lab results, symptom checker, assessments) route through it.

## 2026-04-23 — S1 Content Platform: Task 14 — Pagefind postbuild indexing

- `package.json`: added `pagefind@1.5.2` to `devDependencies`.
- `astro.config.mjs`: added `pagefindIntegration` — a custom Astro integration
  whose `astro:build:done` hook runs `pnpm pagefind` against `dist/client/`
  after Astro's static build completes.
  - Scoped to medical-tests content only via `--glob "{medical-tests/**/*.html,pl/badania/**/*.html}"`.
  - Legal pages (privacy, terms, cookies, medical-disclaimer) and homepages excluded.
  - Integration placed last in the `integrations` array; the hook fires after sitemap.
- Build produces `dist/client/pagefind/` with `pagefind.js`, `pagefind-ui.js`,
  `pagefind-ui.css`, plus fragment/index shards for EN + PL languages.
  102 pages indexed (all EN medical-tests + all PL badania pages).
- `pnpm test`: 109/109 pass. `pnpm check`: 0 errors.

## 2026-04-23 — S1 Content Platform: Task 11 — TestCard component

- `src/components/TestCard.astro`: new shared card component for test summaries.
  Flat white card with 1px Warm Linen border (`#F0E0D0`), 8px radius, 20px padding.
  Eyebrow in category accent color (Geist Mono, 10px, uppercase, letter-spacing 1.2),
  title in primary text (Geist, 16px, semibold), aiUseCase excerpt in secondary
  (`#7A6A5E`, 13px). Props: `href`, `title`, `aiUseCase`, `categoryLabel`,
  `paletteAccent`. No illustration — text-forward card per spec.
- `tests/unit/test-card.test.ts`: 3 Vitest tests via `AstroContainer` (renders
  title/aiUseCase/link, paletteAccent in markup, categoryLabel in content).
- `vitest.config.ts`: migrated from `defineConfig` to `getViteConfig` (Astro)
  so `.astro` files can be compiled in the test runner. Uses `astro.config.test.mjs`
  (no CF adapter) to avoid the CF Vite plugin's incompatibility with vitest's
  `resolve.external`. Tests run with `// @vitest-environment node` to get SSR
  compilation of `.astro` files (not browser stubs).
- `astro.config.test.mjs`: minimal Astro config for test runner (no CF adapter,
  no integrations — just enough for `.astro` compilation).
- `tests/stubs/astro-components.d.ts`: ambient `*.astro` module declaration so
  `tsc --noEmit` resolves `.astro` imports in test files.
- Test count: 94 → 97 (3 new).

## 2026-04-23 — S1 Content Platform: Task 5 — categories.ts.tmpl generation

- `scripts/import-medical-tests.ts`: added exported `renderCategoriesTmpl()` that sorts categories, slugifies PL labels, and emits a typed TS template file ready for human review.
- `scripts/import-medical-tests.ts`: added `extractCategoryKeys()` helper that parses `categoryMeta` keys from an existing `categories.ts` via regex.
- `scripts/import-medical-tests.ts`: wired categories handling into `runImport` non-dryRun path — emits `src/i18n/categories.ts.tmpl` on first run (when `categories.ts` is absent); on subsequent runs validates all seen category keys against `categoryMeta` and throws a clear actionable error on drift.
- `tests/unit/import-parse.test.ts`: added `renderCategoriesTmpl` test suite (1 new test; total 15 pass).

## 2026-04-22 — S0 Foundation Scaffold shipped · v0.1.0

All 40 S0 tasks complete. Production live at https://symptomatik.com
(Cloudflare Workers-with-Assets) and verified via the 12-point
golden-path.

**Golden-path verification (prod):**
- / → 200 · CBC EN → 200 · CBC PL → 200
- /en/... → 301 to canonical EN (no `/en/` prefix)
- Lighthouse CBC EN: perf 96, SEO 100
- Lighthouse CBC PL: perf 100, SEO 100
- JSON-LD (MedicalWebPage + BreadcrumbList) valid on EN + PL
- hreflang alternates correct (en + pl + x-default on CBC pages;
  en + pl + es + x-default on homepages)
- sitemap-index lists all 3 locale sitemaps; CBC indexed in sitemap-en
- Cookie consent flow verified (Accept / Reject / re-prompt on clear)

**Shipped:**
- Astro 6 + React 18 SSG on Cloudflare Workers (`@astrojs/cloudflare@13`)
- i18n: EN at root, PL + ES prefixed with translated URL segments
  (e.g., /medical-tests/... ↔ /pl/badania/...)
- 1 full content page: CBC in EN + PL, imported from the Excel source
- 12 legal pages: Privacy / Terms / Medical Disclaimer / Cookies, in
  EN (full text), PL (full translation), ES (stubs pointing to EN),
  all with localized URL slugs per locale
- SEO: canonical URLs, hreflang alternates, JSON-LD, sitemap-index
  with per-locale sitemaps, robots.txt
- 7 components: BaseLayout, ContentLayout, LegalLayout, SEOHead,
  MedicalDisclaimer, LanguageSwitcher, BreadcrumbNav, CookieConsent
- Infra interfaces: RateLimiter + FileStore (CF + in-memory impls)
- CI: GitHub Actions with typecheck, Vitest, Playwright E2E, Lighthouse
  (perf ≥ 85 / SEO ≥ 90 gates), axe a11y, lychee link check, JSON-LD
  validator, i18n coverage script
- 62 Vitest unit tests + 11 Playwright E2E tests all green

**Accepted limitations for S0, to revisit in S1+:**
- Header nav hidden on mobile (<768px). Links (Symptom Checker, Lab
  Results, etc.) are placeholders pointing to `/` because real app
  pages don't exist until S3+. Mobile hamburger + real targets land
  when there is something to point at.
- ES content is stubbed only; PL and EN are the real multilingual
  experience for S0.

**Known items for human attorney review before public marketing
launch** (all flagged by legal audit, not blockers for pre-launch):
- Arbitration enforceability of browsewrap acceptance in Texas
- Mass-arbitration batching clause post Heckman v. Live Nation
- EU consumer-contract analysis for PL / ES under Rome I + Brussels I
- Texas LLC / TDPSA disclosure specifics
- FDA Clinical Decision Support posture when AI features launch (S3+)
- DPF contingency if CJEU strikes it down

**Next: S1 — Content Platform**
Scale the medical-tests pillar from 1 page (CBC) to all 102 tests in
EN + PL, add `/medical-tests/` pillar index page, implement
RelatedContent component.

## 2026-04-22 — T38: add wrangler as explicit devDependency

`wrangler` is a peerDep of `@astrojs/cloudflare@13`, which pnpm does
not auto-install. CF Workers Build's `npx wrangler deploy` failed with
"wrangler: not found". Added `wrangler@^4.61.1` to devDependencies so
it lands in `node_modules/.bin/` on `pnpm install`.

## 2026-04-22 — T38: bump Node floor to 22 (Astro 6 requirement)

Astro 6 requires Node >=22.12.0. `.nvmrc` was pinned to `20` and
`engines.node` was `>=20`, so CF Workers Build picked Node 20.20.2
and Astro refused to start. Updated both to 22 (local uses 25, CI
uses 22).

## 2026-04-22 — Localize legal-page URL slugs

Initially shipped all locales at the EN canonical slugs (`/pl/privacy/`,
`/es/terms/`, etc.). Blazej flagged this as inconsistent with the
medical-tests pattern (`/pl/badania/...`). Localized slugs:

| Canonical | EN | PL | ES |
|---|---|---|---|
| privacy | `/privacy/` | `/pl/polityka-prywatnosci/` | `/es/privacidad/` |
| terms | `/terms/` | `/pl/regulamin/` | `/es/terminos/` |
| medical-disclaimer | `/medical-disclaimer/` | `/pl/zastrzezenie-medyczne/` | `/es/aviso-medico/` |
| cookies | `/cookies/` | `/pl/polityka-cookies/` | `/es/politica-cookies/` |

Implementation:
- Added `legalSlugSegments` lookup + `legalSlugFor()` + typed `LegalKey`
  in `src/i18n/routes.ts`
- Reworked `buildLegalURL` / `canonicalLegalURL` / `alternatesForLegal`
  to accept `LegalKey` (compile-time safety on the 4 valid slugs)
- Route files use `legalSlugFor(entry.data.slug, locale)` in
  `getStaticPaths` — emits localized paths, canonicals use the same
- BaseLayout footer now uses `buildLegalURL(locale, key)` instead of
  hardcoded hrefs
- Fixed in-body cross-references in PL MDX files (they were still
  pointing to EN `/privacy/` etc. from the translation step — would
  have bounced PL readers out of Polish)
- ES stubs intentionally keep their `/privacy/` → EN link since they
  point readers to the full English version

## 2026-04-22 — Legal pages pipeline: research → draft → audit → translate

Surfaced during golden-path verification that 4 footer legal links 404ed.
Built out the full content: Privacy Policy, Terms of Service, Medical
Disclaimer, Cookie Policy — in EN (full text), PL (translated), and ES
(stubs pointing to EN). Pipeline:

1. **4 parallel research agents** — gathered legal requirements + best
   practices for each policy type, specific to Symptomatik's context
   (Digital Savages LLC, pre-launch, analytics-only, multilingual health
   info site, US + EU audience)
2. **Copywriter agent** — synthesized research into 4 production-ready
   MDX files in EN, matching a new `LegalLayout` component
3. **Legal audit agent** — reviewed all 4 drafts for factual accuracy,
   regulatory coverage, and over-claims. Flagged 1 🔴 critical
   (arbitration opt-out clock ambiguity for browsewrap), ~15 🟠 required
   (GA4 wording, deprecated ODR link, crisis line additions, personal-
   injury carve-out, etc.), ~10 ⚖️ attorney-review items (arbitration
   enforceability, Texas LLC specifics, FDA posture, DPF contingency)
4. **PL translator agent** — produced idiomatic Polish versions with
   RODO/UODO terminology and `Regulamin`/`Polityka prywatności` naming

Implementation:
- New `legal` Astro content collection with Zod schema
- New `LegalLayout.astro` — renders free-form MDX body (not a 5-section
  array like medical-tests)
- Dynamic route per locale: `[legalSlug].astro` — generates 4 URLs
  (`/privacy/`, `/terms/`, `/medical-disclaimer/`, `/cookies/`)
  × 3 locales = 12 static pages
- Fixed a collection-loader bug: default `generateId` uses only filename,
  which collided across locales (`en/privacy.mdx` + `pl/privacy.mdx` both
  got ID "privacy" → later overwrote earlier). Custom `generateId`
  includes locale path.
- New URL helpers: `buildLegalURL`, `canonicalLegalURL`,
  `alternatesForLegal` (separate from medical-tests helpers because legal
  URLs don't use a collection segment)

**Known items for human attorney review before public launch** (flagged
by audit; not blockers for S0 pre-launch):
- Arbitration enforceability of browsewrap in Texas
- Mass-arbitration batching clause post *Heckman v. Live Nation*
- EU consumer-contract analysis for PL/ES under Rome I + Brussels I
- Texas LLC notice requirements (TDPSA cross-check)
- FDA posture when AI features launch (Clinical Decision Support)
- DPF contingency if CJEU strikes it down

## 2026-04-22 — T38: pin packageManager to full semver for CF Workers Build

Cloudflare's corepack integration rejects loose `pnpm@9` with
"expected a semver version" and fails dep install. Pinned to
`pnpm@9.15.9` (matches local + lockfile).

## 2026-04-22 — T38: trigger first preview build from s0-foundation

Git reconnected in Cloudflare dashboard after initial OAuth link broke.
Project configured as Workers-with-Assets (not classic Pages); production
branch set to `s0-foundation` temporarily so preview builds happen on
every push. Will flip production back to `main` after golden-path
verification (T40) passes and we merge.

## 2026-04-22 — T38: documented Cloudflare Pages setup in README

Added "Deploy" section to README with the one-time dashboard setup checklist
and production/preview env-var reference. Commit also serves as the trigger
push to kick off the first `s0-foundation` preview build on Cloudflare Pages.

## 2026-04-21 — S0 Phases 1–9 complete (T1–T37), paused awaiting CF Pages setup

27 commits on branch `s0-foundation`. 37 of 40 S0 tasks complete. Remaining:
T38 (Cloudflare Pages dashboard setup — manual), T39 (custom domain), T40
(12-point golden-path verification — needs live URL to run against).

Built across phases:
- **Phase 1 (T1–T5)** — pnpm + strict TS, Astro 6 scaffold, React 18 + Tailwind 4 +
  shadcn/ui + Cloudflare adapter, project CLAUDE.md
- **Phase 2 (T6–T10)** — i18n: locales, buildURL, UI strings, middleware for
  /en/ 301s, content-alternates loader
- **Phase 3 (T11–T14)** — Zod schema, Excel → MDX importer, CBC MDX generated (EN + PL)
- **Phase 4 (T15–T22)** — SEO helpers (canonicalURL, alternatesFor, JSON-LD for
  MedicalWebPage / BreadcrumbList / WebSite), components (SEOHead, MedicalDisclaimer,
  LanguageSwitcher, BreadcrumbNav, BaseLayout, ContentLayout)
- **Phase 5 (T23)** — CookieConsent React island
- **Phase 6 (T24–T27)** — Homepage + EN content catch-all + PL routes + ES stubs
- **Phase 7 (T28–T29)** — Custom sitemap integration + robots.txt + favicon
- **Phase 8 (T30–T31)** — RateLimiter + FileStore infra interfaces (CF + in-memory impls)
- **Phase 9 (T32–T37)** — Playwright + axe + Lighthouse CI + JSON-LD validator +
  i18n coverage script + GitHub Actions workflow

Test coverage: 62 Vitest unit tests + 11 Playwright E2E tests (1 skipped, CF-only).

Side-decisions made during implementation (documented in spec + plan):
- Astro 5 → 6 upgrade (forced by `@astrojs/cloudflare@13` peer dep)
- `output: 'hybrid'` → `output: 'static'` (former removed in Astro 6)
- Truncate-with-ellipsis for overlong meta values (instead of rejecting rows)
- shadcn v4's `base-nova` style (Base UI primitives, not Radix)
- Vitest 2 → 4 upgrade (Vite 7 compat — Astro 6 ships Vite 7)

## 2026-04-21 — T12+T13: Excel → MDX importer with slugify + full pipeline (S0)

- Installed `exceljs@4` as devDependency
- Created `scripts/import-medical-tests.ts` — full TypeScript CLI for Excel → MDX import
  - Exports `slugify()` (Polish diacritics, parens stripped, NFKD normalised)
  - Exports `Frontmatter` interface, `rowToFrontmatter()`, `renderMdx()`
  - EN-first canonical slug pre-pass; PL rows aligned by index
  - Idempotent: `extractExistingPublishedAt` preserves original `publishedAt` on re-runs
  - Validates loudly: metaTitle > 60 chars, metaDescription > 160 chars, missing H2 sections — throws with row + test name; `main()` catches per-row and warns+skips
  - Slug collisions in source data deduped with `-2`/`-3` suffix + warning
  - Row count mismatch between EN and PL sheets: warns and processes only aligned rows (PL sheet has 4 extra rows + last ~5 misaligned vs EN)
  - Supports `--excel`, `--locales`, `--out`, `--dry-run`, `--only <slug>` flags
- Created `tests/unit/slugify.test.ts` — 6 tests covering lowercase/hyphenate, parens, Polish diacritics, multi-space collapse, slashes, empty input
- Created `tests/unit/import-parse.test.ts` — 3 tests covering `rowToFrontmatter` (EN canonical frontmatter), metaTitle throw, `renderMdx` output format
- `pnpm import:tests --dry-run` → 174 planned files (EN + PL, with skips for data quality issues in Excel)
- Data quality findings in `content-sources/medical-tests.xlsx`: 3 duplicate test names in EN sheet (Lipoprotein(a), Homocysteine, PHQ-9); 4 metaDescription/metaTitle violations in EN; ~28 in PL; PL sheet has 4 extra rows + ordering drift at row ~100
- All 43 tests pass; `pnpm check` 0 errors 0 warnings

## 2026-04-21 — T4: Install shadcn/ui neutral preset + baseline Button (S0)

- Ran `shadcn@latest init --defaults -t astro` — detected Astro framework, Tailwind 4, and `@/*` alias automatically
- `components.json` created with `"baseColor": "neutral"`, `"cssVariables": true`, style `base-nova` (shadcn v4 default using Base UI primitives instead of Radix)
- `src/lib/utils.ts` created — exports `cn()` helper using `clsx` + `tailwind-merge`
- `src/components/ui/button.tsx` created — uses `@base-ui/react/button` primitive with `class-variance-authority` variants
- `src/styles/global.css` updated: shadcn appended `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, `@import "@fontsource-variable/geist"`, `@custom-variant dark`, and full neutral CSS variables to `:root` + `.dark` blocks; our `@import 'tailwindcss'` preserved at line 1 and `@config '../../tailwind.config.ts'` preserved after imports; brand vars (`--color-brand-*`) preserved intact
- New runtime deps added: `@base-ui/react`, `@fontsource-variable/geist`, `class-variance-authority`, `clsx`, `lucide-react`, `shadcn`, `tailwind-merge`, `tw-animate-css`
- `src/pages/index.astro` updated with smoke-test Button (`client:load`)
- `pnpm build` exits 0; dev-server curl confirms `shadcn works` in rendered HTML

## 2026-04-21 — T3: Add React 18, Tailwind 4, MDX, Cloudflare adapter (S0)

- Installed `@astrojs/react`, `@astrojs/mdx`, `@astrojs/cloudflare`, `react@18`, `react-dom@18`, `tailwindcss@4`, `@tailwindcss/vite`, `@types/react@18`, `@types/react-dom@18`
- Upgraded Astro 5 → 6 (adapters `@astrojs/cloudflare@13` and `@astrojs/mdx@5` require Astro ^6; staying on 5 would have left us with unresolvable peer deps)
- **Astro 5/6 output-mode substitution**: `output: 'hybrid'` no longer exists; using `output: 'server'` + `export const prerender = true` per page (identical intent: SSG default, SSR available for future API routes)
- **wrangler.toml `pages_build_output_dir` removed**: wrangler v4 rejects the `ASSETS` binding (used internally by the CF adapter) in configs that have `pages_build_output_dir` set — that flag is a Cloudflare dashboard deployment setting, not needed locally; documented in comment
- Wired Tailwind 4 via `@tailwindcss/vite` Vite plugin; `src/styles/global.css` uses `@import 'tailwindcss'` (v4 CSS-first approach)
- Created `tailwind.config.ts` with content globs and custom font families
- Created `wrangler.toml` with name, compat date, `nodejs_compat` flag, `PUBLIC_SITE_URL` var
- Updated `src/pages/index.astro` with Tailwind utility classes; `pnpm build` and dev-server smoke tests pass

## 2026-04-21 — S0 implementation plan

- Wrote 40-task implementation plan for S0 at `docs/superpowers/plans/2026-04-21-symptomatik-s0-foundation-scaffold.md`
- Plan structured in 10 phases: scaffold, i18n infra, content pipeline, SEO utilities + core components, cookie consent, pages + routing, sitemap + robots, infra interfaces, CI quality gates, deploy + golden-path verification
- Each task is TDD-style (failing test → run → implement → run → commit) where applicable; config and visual tasks use smoke-check patterns
- Golden-path verification: 12-point checklist against production (or pages.dev fallback) before declaring S0 shipped

## 2026-04-21 — Host repo under b1azk0, not Digital-Savages org

- Moved GitHub hosting from `Digital-Savages/symptomatik` to `b1azk0/symptomatik`
- Repo now hosted under Blazej's personal GitHub account; business-entity ownership remains Digital Savages
- Origin remote updated to https://github.com/b1azk0/symptomatik.git
- Updated spec + README accordingly

## 2026-04-21 — Resolve spec open items: ownership, Excel source, domain

- GitHub ownership locked: `github.com/Digital-Savages/symptomatik` (Digital Savages org)
- Content source copied into repo at `content-sources/medical-tests.xlsx` (was user's Downloads); Excel → MDX generator now reads from in-repo source by default, making builds reproducible from any machine
- Domain: Blazej connecting `symptomatik.com` to his Cloudflare account; fallback is `*.pages.dev` subdomain until DNS settles
- Updated spec + README accordingly

## 2026-04-21 — Initial commit: S0 design spec

- Initialized repo
- Full project decomposition recorded: 10 sub-projects (S0–S9), each with its own spec → plan → implement cycle
- Added S0 Foundation Scaffold design spec at `docs/superpowers/specs/2026-04-21-symptomatik-s0-foundation-scaffold-design.md`
- Key architecture decisions:
  - Cloudflare Pages + Workers, with portability discipline (CF primitives behind `lib/infra/` interfaces so parts can migrate to Hetzner later)
  - Hybrid Astro mode (SSG default, on-demand routes ready for future `/api/` needs)
  - i18n with translated URL segments per locale, EN at root (no `/en/` prefix)
  - Frontmatter-driven content rendering from structured Excel source
  - MedicalWebPage (not MedicalTest) as root JSON-LD schema for content pages
- S0 "done" gate: both CBC EN and PL pages live, Lighthouse ≥ 90 SEO / ≥ 85 Perf, Google Rich Results validation clean, hreflang correct, CI green

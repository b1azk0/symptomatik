# OG Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate 279 unique 1200×630 OG cards at build time (one per public LP — homes, pillar root, category indexes, tests) using satori → resvg, wired into `SEOHead.astro` so every shared URL gets a per-page social preview.

**Architecture:** Build-time pipeline. New `scripts/generate-og-cards.ts` runs as `prebuild` after `pnpm import:tests` and before `astro build`. It walks 4 page-type sources (homes, pillar roots, category indexes, tests), renders one PNG per LP via satori (HTML/CSS → SVG) + resvg-js (SVG → PNG), writes to `public/og/<canonical-pathname>.png`. SEOHead derives the `og:image` URL from the page's canonical pathname; legal pages explicitly opt out by passing `ogImage="/og-default.png"`. PNGs committed to git; a hash-based `.og-cache.json` makes incremental builds fast.

**Tech Stack:** TypeScript, Node ≥ 22.12, satori 0.x, @resvg/resvg-js 2.x, @fontsource/fraunces (serif title), Geist (already in deps, sans for pill + brand), Vitest.

**Spec:** [`docs/superpowers/specs/2026-04-27-symptomatik-og-cards-design.md`](../specs/2026-04-27-symptomatik-og-cards-design.md)

---

## File Structure

```
src/lib/og/
  path.ts               # ogPathForCanonical(pathname, locale) — pure
  path.test.ts
  page-types.ts         # collectAllCards() + per-page-type data shapes
  page-types.test.ts
  template.ts           # buildCardElement(data) — satori element tree

scripts/
  generate-og-cards.ts  # build-time entry point; reads sources, renders PNGs

src/i18n/
  categories.ts         # MODIFIED: add `tagline` to per-locale shape; export getCategoryTagline
  ui.ts                 # MODIFIED: add og.home.title (en/pl/es) + og.pillar.title (en/pl)

src/components/
  SEOHead.astro         # MODIFIED: derive ogImage from canonical when not explicitly set

public/og/              # NEW: generated, committed (~279 PNGs, ~3 MB)
public/og-default.png   # NEW: 1×1 transparent / fallback for legal + missing

.gitignore              # add scripts/.og-cache.json
package.json            # MODIFIED: add deps + generate:og + prebuild scripts
```

The `src/lib/og/` directory keeps OG concerns isolated. `template.ts` knows nothing about the file system; `page-types.ts` knows nothing about satori; `generate-og-cards.ts` is the only file that imports both plus `fs` — clean separation.

---

## Task 1: Add dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add -D satori @resvg/resvg-js @fontsource/fraunces @fontsource/geist gray-matter
```

Expected: `package.json` updated, `pnpm-lock.yaml` updated. `node_modules/satori`, `node_modules/@resvg/resvg-js`, `node_modules/@fontsource/fraunces`, `node_modules/@fontsource/geist`, `node_modules/gray-matter` exist.

`gray-matter` is needed because `collectAllCards()` (Task 5) reads MDX frontmatter directly from disk via `fs` — `astro:content`/`getCollection` is only available inside Astro pages, not standalone scripts or Vitest test files. `gray-matter` is the standard MDX/Markdown frontmatter parser.

- [ ] **Step 2: Verify versions and font file paths**

```bash
ls node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff2 \
   node_modules/@fontsource/geist/files/geist-latin-500-normal.woff2 \
   node_modules/@fontsource/geist/files/geist-latin-700-normal.woff2
```

Expected: all three font files exist (used by satori at build time).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add satori, resvg-js, fraunces + geist for OG card generation"
```

---

## Task 2: Path helper (`src/lib/og/path.ts`)

**Files:**
- Create: `src/lib/og/path.ts`
- Test: `src/lib/og/path.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/og/path.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ogPathForCanonical } from './path';

describe('ogPathForCanonical', () => {
  it.each([
    // Homes — locale-aware suffix (root paths have no slug to derive from)
    ['/',                          'en', 'home-en.png'],
    ['/pl/',                       'pl', 'home-pl.png'],
    ['/es/',                       'es', 'home-es.png'],

    // Pillar roots
    ['/medical-tests/',            'en', 'medical-tests.png'],
    ['/pl/badania/',               'pl', 'pl/badania.png'],

    // Category indexes
    ['/medical-tests/cardiometabolic/',  'en', 'medical-tests/cardiometabolic.png'],
    ['/pl/badania/kardiometaboliczne/',  'pl', 'pl/badania/kardiometaboliczne.png'],

    // Test pages
    ['/medical-tests/apob/',       'en', 'medical-tests/apob.png'],
    ['/pl/badania/wapn/',          'pl', 'pl/badania/wapn.png'],

    // Edge cases — accept missing-trailing-slash too (defensive)
    ['/medical-tests/apob',        'en', 'medical-tests/apob.png'],
    ['/medical-tests',             'en', 'medical-tests.png'],
  ])('%s (%s) → %s', (pathname, locale, expected) => {
    expect(ogPathForCanonical(pathname, locale as 'en' | 'pl' | 'es')).toBe(expected);
  });

  it('returns a path that is safe as a filesystem segment (no leading slash, no double slashes)', () => {
    const result = ogPathForCanonical('/medical-tests/apob/', 'en');
    expect(result.startsWith('/')).toBe(false);
    expect(result).not.toMatch(/\/\//);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/og/path.test.ts
```

Expected: FAIL with `Cannot find module './path'` or similar.

- [ ] **Step 3: Implement `src/lib/og/path.ts`**

```typescript
import type { Locale } from '@/i18n/locales';

/**
 * Derives the OG card filename (relative to public/og/) from a page's
 * canonical pathname. Mirrors the URL hierarchy.
 *
 * Examples:
 *   "/" + "en"               → "home-en.png"
 *   "/pl/"                   → "home-pl.png"
 *   "/medical-tests/apob/"   → "medical-tests/apob.png"
 *   "/pl/badania/wapn/"      → "pl/badania/wapn.png"
 *
 * Used by both the build-time generator and SEOHead.astro at runtime so
 * the two never diverge.
 */
export function ogPathForCanonical(pathname: string, locale: Locale): string {
  // Homes: "/" or "/<locale>/" — they have no slug, so suffix with locale.
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  if (trimmed === '' || trimmed === locale) return `home-${locale}.png`;

  return `${trimmed}.png`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/lib/og/path.test.ts
```

Expected: PASS, all 12 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/og/path.ts src/lib/og/path.test.ts
git commit -m "feat(og): pure path helper for canonical → og filename derivation"
```

---

## Task 3: Extend `categoryMeta` with `tagline` field

**Files:**
- Modify: `src/i18n/categories.ts`
- Test: `src/i18n/categories.test.ts` (new)

- [ ] **Step 1: Write the failing test**

`src/i18n/categories.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { categoryMeta, getCategoryTagline } from './categories';

describe('categoryMeta taglines', () => {
  it('every category has both EN and PL taglines', () => {
    for (const [key, entry] of Object.entries(categoryMeta)) {
      expect(entry.en.tagline, `${key} EN tagline`).toBeTruthy();
      expect(entry.pl.tagline, `${key} PL tagline`).toBeTruthy();
    }
  });

  it('every tagline is between 1 and 60 characters (fits OG card)', () => {
    for (const [key, entry] of Object.entries(categoryMeta)) {
      expect(entry.en.tagline.length, `${key} EN`).toBeGreaterThan(0);
      expect(entry.en.tagline.length, `${key} EN`).toBeLessThanOrEqual(60);
      expect(entry.pl.tagline.length, `${key} PL`).toBeGreaterThan(0);
      expect(entry.pl.tagline.length, `${key} PL`).toBeLessThanOrEqual(60);
    }
  });

  it('getCategoryTagline returns the right locale string', () => {
    expect(getCategoryTagline('cardiometabolic', 'en')).toBe('Heart & metabolic risk markers.');
    expect(getCategoryTagline('cardiometabolic', 'pl')).toBe('Markery ryzyka sercowo-metabolicznego.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/i18n/categories.test.ts
```

Expected: FAIL — `tagline` does not exist on the type, `getCategoryTagline` is undefined.

- [ ] **Step 3: Update `src/i18n/categories.ts`**

Update the `CategoryLocale` interface and every entry. Add the `getCategoryTagline` helper.

```typescript
interface CategoryLocale {
  slug: string;
  label: string;
  tagline: string;   // ≤ 60 chars, used as H1 on OG card for category index
}
```

Update every `categoryMeta` entry. Use these exact taglines (verified to fit at 60-char limit, EN font ladder tier 1 or 2):

| key | EN tagline | PL tagline |
|---|---|---|
| `autoimmunology` | `Antibodies & autoimmune markers.` | `Autoprzeciwciała i markery autoimmunologiczne.` |
| `cardiometabolic` | `Heart & metabolic risk markers.` | `Markery ryzyka sercowo-metabolicznego.` |
| `coagulation` | `Clotting time & bleeding risk.` | `Czas krzepnięcia i ryzyko krwawień.` |
| `gastro` | `Gut & digestive health markers.` | `Markery zdrowia układu pokarmowego.` |
| `heart` | `Cardiac function & heart strain.` | `Praca i obciążenie serca.` |
| `hematology` | `Blood counts & cell health.` | `Morfologia i parametry krwi.` |
| `hormonal` | `Hormone levels & balance.` | `Poziomy i równowaga hormonów.` |
| `immunology` | `Immune system function.` | `Funkcja układu odpornościowego.` |
| `infections` | `Infection markers & pathogens.` | `Markery infekcji i patogeny.` |
| `inflammatory` | `Inflammation & acute-phase markers.` | `Markery zapalenia i fazy ostrej.` |
| `kidneys` | `Kidney function & filtration.` | `Funkcja i filtracja nerek.` |
| `liver` | `Liver enzymes & function.` | `Enzymy i funkcja wątroby.` |
| `mental-health` | `Self-assessments & screeners.` | `Samoocena i skale przesiewowe.` |
| `metabolism` | `Glucose, electrolytes, basic panel.` | `Glukoza, elektrolity, panel podstawowy.` |
| `oncology` | `Tumor markers & cancer screening.` | `Markery nowotworowe i przesiewowe.` |
| `urine` | `Urine composition & function.` | `Skład moczu i funkcja.` |

For each existing entry, add the `tagline` field to both `en` and `pl` blocks. Example for `cardiometabolic`:

```typescript
'cardiometabolic': {
  en: { slug: 'cardiometabolic', label: 'Cardiometabolic', tagline: 'Heart & metabolic risk markers.' },
  pl: { slug: 'kardiometaboliczne', label: 'Kardiometaboliczne', tagline: 'Markery ryzyka sercowo-metabolicznego.' },
  illustration: '/assets/illustrations/category/cardiometabolic.webp',
  paletteAccent: '#C75040',
},
```

Append the helper at the bottom of the file:

```typescript
export function getCategoryTagline(key: CategoryKey, lang: 'en' | 'pl'): string {
  return categoryMeta[key][lang].tagline;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/i18n/categories.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck (categoryMeta is `as const satisfies` — type errors propagate)**

```bash
pnpm check
```

Expected: 0 errors / 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add src/i18n/categories.ts src/i18n/categories.test.ts
git commit -m "feat(i18n): add per-locale tagline to categoryMeta for OG cards"
```

---

## Task 4: Add OG home + pillar i18n strings

**Files:**
- Modify: `src/i18n/ui.ts`

- [ ] **Step 1: Add 5 new keys to `ui.ts`**

In the `en:` block, add:

```typescript
    'og.home.title': 'Understand your health, in plain language.',
    'og.home.pill': 'Symptomatik',
    'og.pillar.title': 'Lab results, decoded.',
    'og.pillar.pill': 'Medical Tests',
```

In the `pl:` block, add:

```typescript
    'og.home.title': 'Zrozum swoje zdrowie — prostym językiem.',
    'og.home.pill': 'Symptomatik',
    'og.pillar.title': 'Wyniki badań, jasno wyjaśnione.',
    'og.pillar.pill': 'Badania',
```

In the `es:` block, add:

```typescript
    'og.home.title': 'Entiende tu salud, en lenguaje claro.',
    'og.home.pill': 'Symptomatik',
```

(ES has no pillar root since ES medical-tests content doesn't exist yet — `og.pillar.*` keys are EN+PL only.)

- [ ] **Step 2: Run typecheck (ui.ts schema is enforced by `t()` helper signature)**

```bash
pnpm check
```

Expected: 0 errors. (If `t()` enforces all keys exist for all locales, the ES `og.pillar.*` will need to be added too with the EN string as a stub — but since no ES pillar page is rendered, this is acceptable. Verify by reading `t()` signature in `src/i18n/ui.ts`; if needed, add ES versions: `'og.pillar.title': 'Resultados de laboratorio, descifrados.'`, `'og.pillar.pill': 'Análisis médicos'`.)

- [ ] **Step 3: Commit**

```bash
git add src/i18n/ui.ts
git commit -m "feat(i18n): add OG card title + pill strings for home and pillar pages"
```

---

## Task 5: Page-type registry — `collectAllCards()`

**Files:**
- Create: `src/lib/og/page-types.ts`
- Test: `src/lib/og/page-types.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/og/page-types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { collectAllCards } from './page-types';

describe('collectAllCards', () => {
  it('returns expected counts: 3 homes + 2 pillars + 32 categories + 242 tests = 279', async () => {
    const cards = await collectAllCards();
    const byType = cards.reduce<Record<string, number>>((acc, c) => {
      acc[c.pageType] = (acc[c.pageType] ?? 0) + 1;
      return acc;
    }, {});
    expect(byType).toEqual({ home: 3, pillar: 2, category: 32, test: 242 });
    expect(cards.length).toBe(279);
  });

  it('every card has a non-empty title, pillLabel, illustration path, accent', async () => {
    const cards = await collectAllCards();
    for (const c of cards) {
      expect(c.title, `${c.pageType}/${c.outputPath}`).toBeTruthy();
      expect(c.pillLabel).toBeTruthy();
      expect(c.illustration).toMatch(/\.(webp|svg)$/);
      expect(c.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('outputPath values are unique (no duplicate filenames)', async () => {
    const cards = await collectAllCards();
    const paths = cards.map(c => c.outputPath);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it('every illustration filesystem path exists', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const cards = await collectAllCards();
    for (const c of cards) {
      const fsPath = join(process.cwd(), 'public', c.illustration);
      expect(existsSync(fsPath), `missing illustration: ${fsPath}`).toBe(true);
    }
  });

  it('test cards inherit their category illustration + accent', async () => {
    const cards = await collectAllCards();
    const apob = cards.find(c => c.outputPath === 'medical-tests/apob.png');
    expect(apob).toBeDefined();
    expect(apob!.accent).toBe('#C75040'); // cardiometabolic
    expect(apob!.illustration).toBe('/assets/illustrations/category/cardiometabolic.webp');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/lib/og/page-types.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/lib/og/page-types.ts`**

```typescript
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { categoryMeta, type CategoryKey, getCategoryTagline, getCategorySlug, getCategoryLabel, pillarIllustration } from '@/i18n/categories';
import { ui } from '@/i18n/ui';
import type { Locale } from '@/i18n/locales';

export interface OGCardData {
  pageType: 'home' | 'pillar' | 'category' | 'test';
  locale: Locale;
  title: string;          // serif H1 on the card
  pillLabel: string;      // small uppercase pill
  illustration: string;   // public/-relative path, e.g. "/assets/illustrations/category/cardiometabolic.webp"
  accent: string;         // hex
  outputPath: string;     // relative to public/og/, e.g. "medical-tests/apob.png"
  pageUrl: string;        // canonical pathname, e.g. "/medical-tests/apob/"
}

const HOME_ACCENT = '#1a1a1a';
const PILLAR_ACCENT = '#8B6F4F';

// Resolve project root from this module's location so it works under both
// `tsx scripts/...` and Vitest, regardless of `process.cwd()`.
const REPO_ROOT = join(import.meta.dirname ?? new URL('.', import.meta.url).pathname, '..', '..', '..');
const TESTS_DIR = join(REPO_ROOT, 'src', 'content', 'medical-tests');

function homeCards(): OGCardData[] {
  return (['en', 'pl', 'es'] as const).map(locale => ({
    pageType: 'home',
    locale,
    title: ui[locale]['og.home.title'],
    pillLabel: ui[locale]['og.home.pill'],
    illustration: pillarIllustration,
    accent: HOME_ACCENT,
    outputPath: `home-${locale}.png`,
    pageUrl: locale === 'en' ? '/' : `/${locale}/`,
  }));
}

function pillarCards(): OGCardData[] {
  return (['en', 'pl'] as const).map(locale => ({
    pageType: 'pillar',
    locale,
    title: ui[locale]['og.pillar.title'],
    pillLabel: ui[locale]['og.pillar.pill'],
    illustration: pillarIllustration,
    accent: PILLAR_ACCENT,
    outputPath: locale === 'en' ? 'medical-tests.png' : 'pl/badania.png',
    pageUrl: locale === 'en' ? '/medical-tests/' : '/pl/badania/',
  }));
}

function categoryCards(): OGCardData[] {
  const out: OGCardData[] = [];
  for (const key of Object.keys(categoryMeta) as CategoryKey[]) {
    for (const locale of ['en', 'pl'] as const) {
      const slug = getCategorySlug(key, locale);
      const pageUrl = locale === 'en' ? `/medical-tests/${slug}/` : `/pl/badania/${slug}/`;
      const outputPath = locale === 'en' ? `medical-tests/${slug}.png` : `pl/badania/${slug}.png`;
      out.push({
        pageType: 'category',
        locale,
        title: getCategoryTagline(key, locale),
        pillLabel: getCategoryLabel(key, locale),
        illustration: categoryMeta[key].illustration ?? pillarIllustration,
        accent: categoryMeta[key].paletteAccent,
        outputPath,
        pageUrl,
      });
    }
  }
  return out;
}

interface TestFrontmatter {
  lang: Locale;
  slug: string;
  title: string;
  categorySlug: CategoryKey;
}

function readTestFrontmatter(filePath: string): TestFrontmatter {
  const raw = readFileSync(filePath, 'utf-8');
  const { data } = matter(raw);
  return {
    lang: data.lang as Locale,
    slug: data.slug as string,
    title: data.title as string,
    categorySlug: data.categorySlug as CategoryKey,
  };
}

function testCards(): OGCardData[] {
  const out: OGCardData[] = [];
  for (const locale of ['en', 'pl'] as const) {
    const dir = join(TESTS_DIR, locale);
    const files = readdirSync(dir).filter(f => f.endsWith('.mdx'));
    for (const file of files) {
      const fm = readTestFrontmatter(join(dir, file));
      const cat = categoryMeta[fm.categorySlug];
      const pageUrl = locale === 'en'
        ? `/medical-tests/${fm.slug}/`
        : `/pl/badania/${fm.slug}/`;
      const outputPath = locale === 'en'
        ? `medical-tests/${fm.slug}.png`
        : `pl/badania/${fm.slug}.png`;
      out.push({
        pageType: 'test',
        locale,
        title: fm.title,
        pillLabel: getCategoryLabel(fm.categorySlug, locale),
        illustration: cat.illustration ?? pillarIllustration,
        accent: cat.paletteAccent,
        outputPath,
        pageUrl,
      });
    }
  }
  return out;
}

export async function collectAllCards(): Promise<OGCardData[]> {
  return [...homeCards(), ...pillarCards(), ...categoryCards(), ...testCards()];
}
```

Note: this file uses `node:fs` and `gray-matter`, both Node-only. It is build-time only — used by `scripts/generate-og-cards.ts` and by Vitest. Astro pages should import only `src/lib/og/path.ts` (Task 2), which is pure and browser-safe.

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run src/lib/og/page-types.test.ts
```

Expected: PASS, 5 cases green. The "279 total" assertion confirms scope coverage.

- [ ] **Step 5: Commit**

```bash
git add src/lib/og/page-types.ts src/lib/og/page-types.test.ts
git commit -m "feat(og): page-type registry — collectAllCards() returns 279 entries"
```

---

## Task 6: Satori card template (`src/lib/og/template.ts`)

**Files:**
- Create: `src/lib/og/template.ts`

There's no isolated unit test for this — it's a JSX-like object tree. Validation happens via the generator script smoke run in Task 8.

- [ ] **Step 1: Implement the template**

```typescript
import type { OGCardData } from './page-types';

const WIDTH = 1200;
const HEIGHT = 630;
const LINEN = '#F5F0EC';
const ILLO_BG = '#EFE6DD';

/**
 * Returns a satori-compatible element tree for one OG card.
 * Composition: Layout B v3 (asymmetric bleed, soft-fade illustration, accent band, arc motif).
 *
 * Title font-size auto-shrinks: 96px ≤30 chars, 76px ≤50 chars, 60px otherwise.
 * Lines clamp to 3 with ellipsis (handled by satori's lineClamp via maxLines).
 */
export function buildCardElement(data: OGCardData, illustrationDataUri: string) {
  const titleSize = data.title.length <= 30 ? 96
                   : data.title.length <= 50 ? 76
                   : 60;
  const accent = data.accent;

  // Hex+alpha helpers (satori needs explicit colors, not color-mix).
  const accentBg = `${accent}17`;       // 9% alpha
  const accentBorder = `${accent}4D`;   // 30% alpha

  return {
    type: 'div',
    props: {
      style: {
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        position: 'relative',
        background: LINEN,
        fontFamily: 'Geist',
      },
      children: [
        // Accent band — top gradient
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 38,
              background: `linear-gradient(90deg, ${accent}, ${accent}00)`,
            },
          },
        },
        // Illustration (right side, with soft-fade mask)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '42%',
              right: -36,
              backgroundColor: ILLO_BG,
              backgroundImage: `url(${illustrationDataUri})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              maskImage: 'linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 100%)',
            } as any,
          },
        },
        // Text panel (left)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              top: 108, // 9cqw of 1200
              bottom: 48,
              left: 48,
              width: 540,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              zIndex: 2,
            },
            children: [
              // Pill (top)
              {
                type: 'div',
                props: {
                  style: { display: 'flex' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: 14,
                          letterSpacing: 2,
                          textTransform: 'uppercase' as const,
                          fontWeight: 500,
                          padding: '6px 14px',
                          borderRadius: 999,
                          background: accentBg,
                          border: `1px solid ${accentBorder}`,
                          color: accent,
                        },
                        children: data.pillLabel,
                      },
                    },
                  ],
                },
              },
              // Title (middle)
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'Fraunces',
                    fontSize: titleSize,
                    fontWeight: 600,
                    lineHeight: 1.05,
                    color: '#1a1a1a',
                    letterSpacing: -0.5,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical' as any,
                    WebkitLineClamp: 3,
                    overflow: 'hidden',
                  } as any,
                  children: data.title,
                },
              },
              // Brand row (bottom)
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  },
                  children: [
                    // Arc motif (inline SVG via dataUri)
                    {
                      type: 'img',
                      props: {
                        src: motifDataUri(accent),
                        width: 50,
                        height: 18,
                        style: { opacity: 0.5 },
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontSize: 13,
                          letterSpacing: 2.5,
                          textTransform: 'uppercase' as const,
                          fontWeight: 500,
                          color: '#666',
                        },
                        children: 'symptomatik.com',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function motifDataUri(accent: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 22"><path d="M2 18 Q 12 2, 22 18" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/><path d="M22 18 Q 32 2, 42 18" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/><path d="M42 18 Q 52 2, 58 14" fill="none" stroke="${accent}" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/og/template.ts
git commit -m "feat(og): satori card template (Layout B v3)"
```

---

## Task 7: Generator script (`scripts/generate-og-cards.ts`)

**Files:**
- Create: `scripts/generate-og-cards.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add cache file to `.gitignore`**

Add a line to `.gitignore` (under the existing entries):

```
scripts/.og-cache.json
```

- [ ] **Step 2: Implement `scripts/generate-og-cards.ts`**

```typescript
#!/usr/bin/env tsx
/**
 * OG card generator. Walks page-type registry, renders one PNG per LP via
 * satori (HTML/CSS → SVG) + resvg-js (SVG → PNG). Writes to public/og/.
 *
 * Pass --force to regenerate every PNG; default uses scripts/.og-cache.json
 * to skip unchanged inputs.
 *
 * Run order in `prebuild`: import:tests → generate:og → astro build.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { collectAllCards, type OGCardData } from '../src/lib/og/page-types';
import { buildCardElement } from '../src/lib/og/template';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC_DIR = join(ROOT, 'public');
const OG_DIR = join(PUBLIC_DIR, 'og');
const CACHE_FILE = join(ROOT, 'scripts', '.og-cache.json');
const TEMPLATE_VERSION = 'v1'; // bump when template changes

const FRAUNCES_600 = readFileSync(join(ROOT, 'node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff2'));
const GEIST_500 = readFileSync(join(ROOT, 'node_modules/@fontsource/geist/files/geist-latin-500-normal.woff2'));

const WIDTH = 1200;
const HEIGHT = 630;

interface CacheIndex { [outputPath: string]: string; }

function loadCache(): CacheIndex {
  if (!existsSync(CACHE_FILE)) return {};
  try { return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')); }
  catch { return {}; }
}

function saveCache(cache: CacheIndex): void {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function hashCard(card: OGCardData, illustrationBytes: Buffer): string {
  const h = createHash('sha256');
  h.update(TEMPLATE_VERSION);
  h.update(card.title);
  h.update(card.pillLabel);
  h.update(card.accent);
  h.update(card.illustration);
  h.update(illustrationBytes);
  return h.digest('hex');
}

async function renderCard(card: OGCardData): Promise<{ png: Buffer; hash: string }> {
  const illustrationFsPath = join(PUBLIC_DIR, card.illustration);
  if (!existsSync(illustrationFsPath)) {
    throw new Error(`Missing illustration for ${card.outputPath}: ${illustrationFsPath}`);
  }
  const illustrationBytes = readFileSync(illustrationFsPath);
  const ext = card.illustration.endsWith('.svg') ? 'svg+xml' : 'webp';
  const illustrationDataUri = `data:image/${ext};base64,${illustrationBytes.toString('base64')}`;

  const element = buildCardElement(card, illustrationDataUri);

  const svg = await satori(element as any, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Fraunces', data: FRAUNCES_600, weight: 600, style: 'normal' as const },
      { name: 'Geist',    data: GEIST_500,    weight: 500, style: 'normal' as const },
    ],
  });

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
  const png = resvg.render().asPng();
  const hash = hashCard(card, illustrationBytes);
  return { png, hash };
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  mkdirSync(OG_DIR, { recursive: true });

  const cards = await collectAllCards();
  console.log(`[generate-og-cards] ${cards.length} cards to consider${force ? ' (--force)' : ''}`);

  const cache = force ? {} : loadCache();
  let generated = 0;
  let skipped = 0;
  let failures = 0;

  for (const card of cards) {
    const outFs = join(OG_DIR, card.outputPath);
    try {
      // Compute new hash without rendering
      const illustrationFsPath = join(PUBLIC_DIR, card.illustration);
      if (!existsSync(illustrationFsPath)) {
        console.error(`  ✗ ${card.outputPath} — missing illustration ${illustrationFsPath}`);
        failures++;
        continue;
      }
      const illustrationBytes = readFileSync(illustrationFsPath);
      const newHash = hashCard(card, illustrationBytes);

      if (!force && cache[card.outputPath] === newHash && existsSync(outFs)) {
        skipped++;
        continue;
      }

      const { png } = await renderCard(card);
      mkdirSync(dirname(outFs), { recursive: true });
      writeFileSync(outFs, png);
      cache[card.outputPath] = newHash;
      generated++;
      if (generated % 25 === 0) console.log(`  … ${generated} generated`);
    } catch (err) {
      console.error(`  ✗ ${card.outputPath}: ${(err as Error).message}`);
      failures++;
    }
  }

  saveCache(cache);
  console.log(`[generate-og-cards] done — generated ${generated}, skipped ${skipped}, failed ${failures}`);
  if (failures > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 3: Commit (don't run yet — that's Task 8)**

```bash
git add scripts/generate-og-cards.ts .gitignore
git commit -m "feat(og): build-time generator script (satori → resvg pipeline)"
```

---

## Task 8: First full run — generate all 279 PNGs

**Files:**
- Create: `public/og/**` (279 PNGs)
- Create: `scripts/.og-cache.json` (gitignored, but exists locally)

- [ ] **Step 1: Run the generator**

```bash
pnpm tsx scripts/generate-og-cards.ts --force
```

Expected: stdout reports "279 cards to consider", "generated 279, skipped 0, failed 0". Total runtime ~15–30 seconds.

- [ ] **Step 2: Verify the output**

```bash
find public/og -name "*.png" | wc -l
file public/og/medical-tests/apob.png
file public/og/home-en.png
file public/og/pl/badania/wapn.png
```

Expected:
- Count = 279
- Each `file ...` reports `PNG image data, 1200 x 630, 8-bit/color RGB, non-interlaced` (or similar; what matters is 1200×630).

- [ ] **Step 3: Spot-check size budget**

```bash
ls -lS public/og -R | head -10
du -sh public/og
```

Expected: `du` reports ≤ 4 MB total. No single PNG > 80 KB. (If anything is > 80 KB, the source illustration is unusually large; flag and resize before committing.)

- [ ] **Step 4: Spot-check a generated PNG visually**

Open `public/og/medical-tests/apob.png` (and `pl/badania/wapn.png`, `home-en.png`) in an image viewer. Confirm:
- 1200×630 dimensions
- Warm Linen background visible on the left half
- Anatomical illustration visible on the right half with soft fade
- Pill, serif title, arc motif, brand mark all visible
- No font fallback errors (text not rendered as boxes)

If the title font appears wrong (Geist instead of Fraunces, or fallback boxes), the satori `fonts:` config did not load Fraunces — re-check the font file path and the `name:` in the satori call.

- [ ] **Step 5: Commit the generated PNGs**

```bash
git add public/og
git commit -m "chore(og): initial generation — 279 PNGs (3 home + 2 pillar + 32 cat + 242 tests)"
```

---

## Task 9: Wire `prebuild` in `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `generate:og` and `prebuild` scripts**

In `package.json` `scripts:`, add:

```jsonc
    "generate:og": "tsx scripts/generate-og-cards.ts",
    "prebuild": "pnpm import:tests && pnpm generate:og",
```

(Place `generate:og` near other `tsx scripts/...` entries; place `prebuild` immediately before `build`.)

- [ ] **Step 2: Verify `pnpm build` chains correctly**

```bash
rm -rf dist
pnpm build
```

Expected:
- stdout shows `[generate-og-cards] 279 cards to consider`
- Almost all 279 are skipped (cache hit) since Task 8 just ran
- Astro build proceeds normally
- Total `pnpm build` time: comparable to before plus ≤ 5 s for the cache-hit OG step

- [ ] **Step 3: Verify `pnpm dev` skips the generator**

```bash
# Start dev briefly, confirm no generate-og output
pnpm dev &
DEV_PID=$!
sleep 5
kill $DEV_PID 2>/dev/null || true
```

Expected: dev startup output does not mention `generate-og-cards`. (`prebuild` is only invoked by `pnpm build`, never `pnpm dev` — verify by checking npm-script docs if uncertain.)

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat(og): wire generate:og into prebuild — runs after import:tests"
```

---

## Task 10: Update `SEOHead.astro` to derive `og:image`

**Files:**
- Modify: `src/components/SEOHead.astro`

- [ ] **Step 1: Update the default**

Open `src/components/SEOHead.astro`. Replace the `ogImageAbsolute` derivation:

**Old:**
```typescript
const ogImageAbsolute = ogImage ?? new URL('/og-default.png', Astro.site ?? 'https://symptomatik.com').toString();
```

**New:**
```typescript
import { ogPathForCanonical } from '@/lib/og/path';

// ...inside the script section:
const site = Astro.site ?? new URL('https://symptomatik.com');
const canonicalPathname = new URL(canonical).pathname;
const derivedOgPath = `/og/${ogPathForCanonical(canonicalPathname, locale as 'en'|'pl'|'es')}`;
const ogImageAbsolute = ogImage ?? new URL(derivedOgPath, site).toString();
```

(Place the `import` at the top of the frontmatter alongside the other imports.)

- [ ] **Step 2: Run a quick build to confirm SEOHead renders without crashing**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build completes; no errors about missing modules.

- [ ] **Step 3: Inspect rendered HTML for one of each page type**

```bash
grep -A1 'og:image' dist/index.html | head -5
grep -A1 'og:image' dist/medical-tests/index.html | head -5
grep -A1 'og:image' dist/medical-tests/cardiometabolic/index.html | head -5
grep -A1 'og:image' dist/medical-tests/apob/index.html | head -5
grep -A1 'og:image' dist/pl/badania/wapn/index.html | head -5
```

Expected: each prints the page-specific OG URL — e.g.:
- `https://symptomatik.com/og/home-en.png`
- `https://symptomatik.com/og/medical-tests.png`
- `https://symptomatik.com/og/medical-tests/cardiometabolic.png`
- `https://symptomatik.com/og/medical-tests/apob.png`
- `https://symptomatik.com/og/pl/badania/wapn.png`

- [ ] **Step 4: Confirm the corresponding PNGs exist in `dist/og/`**

```bash
ls dist/og/home-en.png dist/og/medical-tests.png dist/og/medical-tests/apob.png dist/og/pl/badania/wapn.png
```

Expected: all four files exist (Astro copies `public/og/` into `dist/og/` during build).

- [ ] **Step 5: Commit**

```bash
git add src/components/SEOHead.astro
git commit -m "feat(seo): SEOHead derives og:image from canonical pathname"
```

---

## Task 11: Verify legal pages keep `/og-default.png`

**Files:**
- Read: `src/components/LegalLayout.astro`, all `src/pages/*/[legalSlug].astro`
- Modify: as needed to pass `ogImage="/og-default.png"`
- Test: `tests/seo/legal-og.spec.ts` (Vitest or Playwright — choose by repo convention)

- [ ] **Step 1: Inspect how legal pages currently set `ogImage`**

```bash
grep -rn "ogImage\|og-default" src/components/LegalLayout.astro src/pages/*/legalSlug*.astro src/pages/*legalSlug*.astro 2>/dev/null
```

If `LegalLayout.astro` or the legal page templates already pass `ogImage="/og-default.png"`, skip to Step 3.

- [ ] **Step 2: If not, add explicit ogImage opt-out to legal pages**

In `src/components/LegalLayout.astro`, find where it composes the `BaseLayout` and add `ogImage="/og-default.png"` to the props.

- [ ] **Step 3: Create `public/og-default.png`**

If `public/og-default.png` does not yet exist (it's referenced as a fallback but the file may be missing), create a minimal placeholder. Easiest path: copy `public/og/home-en.png`:

```bash
[ -f public/og-default.png ] || cp public/og/home-en.png public/og-default.png
file public/og-default.png
```

Expected: `public/og-default.png` exists, 1200×630 PNG.

- [ ] **Step 4: Verify rendered legal HTML uses the default**

```bash
pnpm build 2>&1 | tail -5
grep -A1 'og:image' dist/privacy/index.html | head -3
grep -A1 'og:image' dist/pl/polityka-prywatnosci/index.html | head -3
```

Expected: both reference `/og-default.png`, not a per-page derived path.

- [ ] **Step 5: Commit**

```bash
git add src/components/LegalLayout.astro public/og-default.png
git commit -m "feat(seo): legal pages explicitly use /og-default.png"
```

---

## Task 12: Final smoke + CI green

**Files:** all of the above

- [ ] **Step 1: Run the full test suite**

```bash
pnpm test
```

Expected: all tests pass — including the new `path.test.ts`, `categories.test.ts`, `page-types.test.ts`. No regressions in existing tests.

- [ ] **Step 2: Run typecheck**

```bash
pnpm check
```

Expected: 0 errors / 0 warnings.

- [ ] **Step 3: Clean rebuild + count outputs**

```bash
rm -rf dist
pnpm build 2>&1 | tail -10
find dist/og -name "*.png" | wc -l
```

Expected:
- Build succeeds
- `find` reports exactly 280 (279 generated + 1 og-default.png — confirm exact count: `dist/og` should have 279 PNGs from `public/og/` + nothing else; `og-default.png` lives at `dist/og-default.png` in the root, not under `dist/og/`).

- [ ] **Step 4: Manual visual smoke (cannot be automated)**

Open these in an image viewer or via `open` on macOS:

```bash
open dist/og/home-en.png
open dist/og/home-pl.png
open dist/og/medical-tests.png
open dist/og/medical-tests/cardiometabolic.png
open dist/og/medical-tests/apob.png
open dist/og/pl/badania/wapn.png
```

Confirm visually for each:
- 1200×630 dimensions, Warm Linen background, illustration with soft-fade right side
- Pill in correct accent color, serif title in Fraunces, arc motif + `symptomatik.com`
- Polish diacritics render correctly (ż, ę, ó, etc.)
- Long titles auto-shrink (find at least one PL test with a long title and confirm title font is smaller than the home/short cards)

- [ ] **Step 5: Twitter Card Validator + LinkedIn Post Inspector (post-deploy)**

(Deferred to after deploy — out of plan execution scope.) After production deploy:

1. Visit `https://cards-dev.twitter.com/validator`, paste `https://symptomatik.com/medical-tests/apob/`. Verify the OG card renders.
2. Visit `https://www.linkedin.com/post-inspector/`, paste `https://symptomatik.com/pl/badania/wapn/`. Verify.

If either renders broken or missing, debug the `og:image` URL emitted in HTML and the actual PNG file at that URL.

- [ ] **Step 6: Update CHANGELOG**

Add an entry to `CHANGELOG.md` at the top:

```markdown
## 2026-04-27 — OG cards live (279 cards, build-time)

Build-time satori → resvg pipeline generates a unique 1200×630 OG card for
every public LP — homes (3), pillar root (2), category indexes (32), test
pages (242). Cards inherit per-category illustration + accent from
`src/i18n/categories.ts`; home + pillar use neutral / earthy accents.
Skipped in `pnpm dev`. PNGs committed to `public/og/`. Hash-based cache at
`scripts/.og-cache.json` makes incremental builds fast.

`SEOHead.astro` now derives `og:image` from the page's canonical pathname
via `ogPathForCanonical(pathname, locale)`; legal pages explicitly opt out
to keep `/og-default.png`.

Spec: `docs/superpowers/specs/2026-04-27-symptomatik-og-cards-design.md`.
Plan: `docs/superpowers/plans/2026-04-27-symptomatik-og-cards.md`.
```

- [ ] **Step 7: Final commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): OG cards shipped — 279 cards across all public LPs"
```

---

## Open follow-ups (not blocking)

- **Manual ogImage override via MDX frontmatter** — possible per-test override if a special page needs a hand-crafted card. Add `ogImage?: string` to the medical-tests content schema; if set, SEOHead uses it directly. ~15 min.
- **Embedding-based illustration variety per test** — use a small embedding model to pick from a category's variants when an illustration set has multiple variants. Out of scope.
- **Animated card / GIF version** — out of scope; not part of OG spec.
- **Hand-crafted hero for home pages** — drop in a designed PNG at `public/og/home-en.png` etc., commit, done. The system gracefully accepts manual overrides because the path scheme is fixed.

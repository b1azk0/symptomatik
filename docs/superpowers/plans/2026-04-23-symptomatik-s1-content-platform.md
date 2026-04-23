# Symptomatik S1 Content Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scale the medical-tests pillar from 1 canary page (CBC) to the full EN+PL footprint — all unambiguous tests, a pillar index with Pagefind search, per-category indexes, and a RelatedContent block on every test page — with a reconciliation workbook for deferred Excel corrections.

**Architecture:** Static build on the S0 Astro 6 + Cloudflare Workers-with-Assets scaffold. Importer classifies Excel rows and emits MDX only for the clean overlap + a reconciliation workbook for the rest. Category URLs lock into a typed `src/i18n/categories.ts` map. Pillar + category pages are new static routes; test pages stay on the S0 catch-all. Pagefind runs postbuild to index medical-tests content. Components are pure Astro with a single tiny React island for Pagefind UI.

**Tech Stack:** Astro 6.1, React 18 (islands only), Tailwind 4, shadcn/ui, Pagefind (new), Vitest 4, Playwright, ExcelJS.

**Spec:** [`docs/superpowers/specs/2026-04-23-symptomatik-s1-content-platform-design.md`](../specs/2026-04-23-symptomatik-s1-content-platform-design.md)

---

## Prerequisites

### P1 — Pencil design checkpoint (manual, no code)

Before starting Phase 5 (shared components) or later, Blazej should have Pencil mockups (or explicit "use shadcn defaults + iterate later" approval) for:

- Pillar page layout (H1, intro copy, search box placement, category-section rhythm)
- Category page layout (breadcrumb, H1, test grid density)
- `TestCard` visual (title, use-case line, category tag)
- `CategoryCard` visual (label, description, test count, chevron)
- Pagefind search box — empty / active / results / zero-results states
- `RelatedContent` block visual

Phases 1-4 do not depend on Pencil and can start immediately. **Do not start Phase 5 without Pencil approval** (or explicit "ship on defaults" waiver from Blazej). The implementing agent should pause and confirm before Task 11.

---

## Phase 1 — Importer classification + reconciliation

### Task 1: Add classification types and issue enum to importer

**Files:**
- Modify: `scripts/import-medical-tests.ts` (add exports near top, after existing types)
- Test: `tests/unit/import-parse.test.ts` (extend existing file)

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/import-parse.test.ts`:

```ts
import { classifyRowPair, IssueType } from '../../scripts/import-medical-tests';

describe('classifyRowPair', () => {
  it('returns OK when EN + PL both present and names align', () => {
    const res = classifyRowPair({
      enRow: { 'test name': 'Complete Blood Count (CBC)', 'category': 'Hematology' },
      plRow: { 'nazwa testu': 'Morfologia krwi (CBC)', 'kategoria': 'Hematologia' },
      enRowIndex: 2,
      plRowIndex: 2,
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('OK');
  });

  it('returns MISSING_PL when PL row is empty', () => {
    const res = classifyRowPair({
      enRow: { 'test name': 'Ferritin', 'category': 'Iron' },
      plRow: {},
      enRowIndex: 5,
      plRowIndex: 5,
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('MISSING_PL');
  });

  it('returns DUPLICATE when EN name collides with an already-seen slug', () => {
    const seen = new Set<string>(['homocysteine']);
    const res = classifyRowPair({
      enRow: { 'test name': 'Homocysteine', 'category': 'Cardio' },
      plRow: { 'nazwa testu': 'Homocysteina', 'kategoria': 'Kardio' },
      enRowIndex: 50,
      plRowIndex: 50,
      seenEnSlugs: seen,
    });
    expect(res.issue).toBe<IssueType>('DUPLICATE');
  });

  it('flags META_TOO_LONG but still returns OK', () => {
    const longMeta = 'x'.repeat(200);
    const res = classifyRowPair({
      enRow: { 'test name': 'Test', 'category': 'Cat', 'meta description': longMeta },
      plRow: { 'nazwa testu': 'Test PL', 'kategoria': 'Kat', 'meta description': 'short' },
      enRowIndex: 7,
      plRowIndex: 7,
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('OK');
    expect(res.flags).toContain('META_TOO_LONG_EN');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- import-parse`
Expected: FAIL — `classifyRowPair is not a function` or import error.

- [ ] **Step 3: Implement classifier**

Add to `scripts/import-medical-tests.ts`, after the existing `Row` type:

```ts
export type IssueType =
  | 'OK'
  | 'DUPLICATE'
  | 'MISALIGNED'
  | 'MISSING_EN'
  | 'MISSING_PL';

export type IssueFlag = 'META_TOO_LONG_EN' | 'META_TOO_LONG_PL';

export interface ClassifyArgs {
  enRow: Row;
  plRow: Row;
  enRowIndex: number;
  plRowIndex: number;
  seenEnSlugs: Set<string>;
}

export interface ClassifyResult {
  issue: IssueType;
  flags: IssueFlag[];
  canonicalSlug: string | null;
}

const META_MAX = 160;

function hasContent(row: Row, key: string): boolean {
  return (row[key] ?? '').trim().length > 0;
}

export function classifyRowPair(args: ClassifyArgs): ClassifyResult {
  const { enRow, plRow, seenEnSlugs } = args;
  const enName = (enRow['test name'] ?? '').trim();
  const plName = (plRow['nazwa testu'] ?? '').trim();

  if (!enName && !plName) return { issue: 'OK', flags: [], canonicalSlug: null };
  if (!enName) return { issue: 'MISSING_EN', flags: [], canonicalSlug: null };
  if (!plName) return { issue: 'MISSING_PL', flags: [], canonicalSlug: slugify(enName) };

  const slug = slugify(enName);
  if (seenEnSlugs.has(slug)) {
    return { issue: 'DUPLICATE', flags: [], canonicalSlug: slug };
  }

  const flags: IssueFlag[] = [];
  if ((enRow['meta description'] ?? '').length > META_MAX) flags.push('META_TOO_LONG_EN');
  if ((plRow['meta description'] ?? '').length > META_MAX) flags.push('META_TOO_LONG_PL');

  return { issue: 'OK', flags, canonicalSlug: slug };
}
```

Note: `MISALIGNED` detection (names diverge on both sides) is deferred to Task 2; this task only covers presence + duplication checks.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- import-parse`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-medical-tests.ts tests/unit/import-parse.test.ts
git commit -m "feat(importer): add classifyRowPair + IssueType for S1 reconciliation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Add MISALIGNED detection via name-similarity heuristic

**Files:**
- Modify: `scripts/import-medical-tests.ts`
- Test: `tests/unit/import-parse.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/import-parse.test.ts`:

```ts
it('returns MISALIGNED when EN and PL names refer to different tests', () => {
  const res = classifyRowPair({
    enRow: { 'test name': 'Thyroid Stimulating Hormone' },
    plRow: { 'nazwa testu': 'Morfologia krwi' }, // clearly unrelated
    enRowIndex: 101,
    plRowIndex: 101,
    seenEnSlugs: new Set(),
  });
  expect(res.issue).toBe<IssueType>('MISALIGNED');
});

it('does NOT flag MISALIGNED when names share detectable root tokens', () => {
  const res = classifyRowPair({
    enRow: { 'test name': 'Ferritin' },
    plRow: { 'nazwa testu': 'Ferrytyna' }, // transliteration / cognate
    enRowIndex: 10,
    plRowIndex: 10,
    seenEnSlugs: new Set(),
  });
  expect(res.issue).toBe<IssueType>('OK');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- import-parse`
Expected: FAIL on the "MISALIGNED" case (currently returns OK).

- [ ] **Step 3: Implement heuristic**

Replace the OK return in `classifyRowPair` with a similarity check. Add above `classifyRowPair`:

```ts
function namesLikelyAligned(enName: string, plName: string): boolean {
  const normalize = (s: string) =>
    slugify(s).replace(/-/g, '').replace(/[0-9]/g, '');
  const a = normalize(enName);
  const b = normalize(plName);
  if (!a || !b) return true;
  // Cheap shared-prefix heuristic: at least 3 chars in common at start.
  const shared = Math.min(a.length, b.length);
  let prefix = 0;
  for (let i = 0; i < shared; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  if (prefix >= 3) return true;
  // Fallback: any 4-char substring of one appears in the other.
  if (a.length >= 4) {
    for (let i = 0; i <= a.length - 4; i++) {
      if (b.includes(a.slice(i, i + 4))) return true;
    }
  }
  return false;
}
```

Then update the `classifyRowPair` tail (before the final `return { issue: 'OK', ... }`):

```ts
if (!namesLikelyAligned(enName, plName)) {
  return { issue: 'MISALIGNED', flags, canonicalSlug: slug };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- import-parse`
Expected: PASS all cases including earlier OK + duplicate + missing.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-medical-tests.ts tests/unit/import-parse.test.ts
git commit -m "feat(importer): detect MISALIGNED rows via name-similarity heuristic

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Wire classifier into import loop, emit only OK rows

**Files:**
- Modify: `scripts/import-medical-tests.ts` (main import loop)

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/import-parse.test.ts`:

```ts
import { runImport } from '../../scripts/import-medical-tests';

describe('runImport (integration, in-memory)', () => {
  it('writes MDX only for OK rows; skips DUPLICATE / MISSING_PL / MISALIGNED', async () => {
    const result = await runImport({
      enRows: [
        { 'test name': 'CBC', 'category': 'Hematology', 'meta title': 'X', 'meta description': 'Y', 'h1 title': 'H', 'h1_text': 'T', 'h2_1': 'a', 'h2_1_text': 'b', 'h2_2': 'c', 'h2_2_text': 'd', 'h2_3': 'e', 'h2_3_text': 'f', 'h2_4': 'g', 'h2_4_text': 'h', 'h2_5': 'i', 'h2_5_text': 'j', 'ai use-case': 'u' },
        { 'test name': 'CBC', 'category': 'Hematology' }, // duplicate
        { 'test name': 'OrphanEn', 'category': 'X' },    // MISSING_PL
      ],
      plRows: [
        { 'nazwa testu': 'Morfologia', 'kategoria': 'Hematologia', 'meta title': 'X', 'meta description': 'Y', 'h1 title': 'H', 'h1_text': 'T', 'h2_1': 'a', 'h2_1_text': 'b', 'h2_2': 'c', 'h2_2_text': 'd', 'h2_3': 'e', 'h2_3_text': 'f', 'h2_4': 'g', 'h2_4_text': 'h', 'h2_5': 'i', 'h2_5_text': 'j', 'ai use-case': 'u' },
        { 'nazwa testu': 'Morfologia2', 'kategoria': 'Hematologia' },
        {}, // empty
      ],
      dryRun: true,
    });
    expect(result.written.en).toHaveLength(1);
    expect(result.written.pl).toHaveLength(1);
    expect(result.skipped.map((s) => s.issue).sort()).toEqual(['DUPLICATE', 'MISSING_PL']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- import-parse`
Expected: FAIL — `runImport is not a function` or missing export.

- [ ] **Step 3: Implement `runImport`**

Refactor the existing `import()` top-level logic into an exported `runImport` function accepting in-memory rows, returning `{ written: { en, pl }, skipped, categoriesSeen }`. Keep the file-writing behind a `dryRun` flag (when true, don't touch disk — just return classification). Preserve the existing `publishedAt` when reading a pre-existing MDX file.

Skeleton (replace the existing main-body logic; keep helpers `rowToFrontmatter`, `readSheet` intact):

```ts
export interface RunImportArgs {
  enRows?: Row[];
  plRows?: Row[];
  excel?: string;           // if rows not given, read from file
  outputDir?: string;       // default: src/content/medical-tests
  dryRun?: boolean;
  today?: Date;
}

export interface SkippedEntry {
  issue: IssueType;
  flags: IssueFlag[];
  enRowIndex: number;
  plRowIndex: number;
  enName: string;
  plName: string;
  canonicalSlug: string | null;
}

export interface RunImportResult {
  written: { en: string[]; pl: string[] };          // file paths (or slugs in dryRun)
  skipped: SkippedEntry[];
  categoriesSeen: Array<{ key: string; labelEn: string; labelPl: string }>;
}

export async function runImport(args: RunImportArgs): Promise<RunImportResult> {
  const enRows = args.enRows ?? (args.excel ? await readSheet(args.excel, 'EN - SEO optimized') : []);
  const plRows = args.plRows ?? (args.excel ? await readSheet(args.excel, 'PL - original') : []);
  const today = args.today ?? new Date();
  const outputDir = args.outputDir ?? 'src/content/medical-tests';

  const written = { en: [] as string[], pl: [] as string[] };
  const skipped: SkippedEntry[] = [];
  const categoriesSeen = new Map<string, { labelEn: string; labelPl: string }>();
  const seenEnSlugs = new Set<string>();

  const rowLimit = Math.max(enRows.length, plRows.length);
  for (let i = 0; i < rowLimit; i++) {
    const enRow = enRows[i] ?? {};
    const plRow = plRows[i] ?? {};
    const cls = classifyRowPair({ enRow, plRow, enRowIndex: i + 2, plRowIndex: i + 2, seenEnSlugs });

    if (cls.issue === 'OK' && cls.canonicalSlug) {
      seenEnSlugs.add(cls.canonicalSlug);
      const categoryEn = (enRow['category'] ?? '').trim();
      const categoryPl = (plRow['kategoria'] ?? '').trim();
      if (categoryEn) {
        const key = slugify(categoryEn);
        if (!categoriesSeen.has(key)) categoriesSeen.set(key, { labelEn: categoryEn, labelPl: categoryPl });
      }
      // ... write EN MDX, write PL MDX via rowToFrontmatter (existing helper) ...
      if (!args.dryRun) {
        // file-write path preserved from original script
      }
      written.en.push(cls.canonicalSlug);
      written.pl.push(cls.canonicalSlug);
      continue;
    }

    skipped.push({
      issue: cls.issue,
      flags: cls.flags,
      enRowIndex: i + 2,
      plRowIndex: i + 2,
      enName: (enRow['test name'] ?? '').trim(),
      plName: (plRow['nazwa testu'] ?? '').trim(),
      canonicalSlug: cls.canonicalSlug,
    });
  }

  return {
    written,
    skipped,
    categoriesSeen: Array.from(categoriesSeen, ([key, v]) => ({ key, ...v })),
  };
}
```

Keep the original file-writing code — extract it into a helper `writeTestMdx(frontmatter, outputDir)` used inside the `!args.dryRun` branch.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- import-parse`
Expected: PASS all cases.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-medical-tests.ts tests/unit/import-parse.test.ts
git commit -m "refactor(importer): extract runImport with classification + dry-run

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Emit reconciliation workbook

**Files:**
- Modify: `scripts/import-medical-tests.ts`
- Test: `tests/unit/import-parse.test.ts`
- Create: `content-sources/medical-tests-reconcile.xlsx` (generated at first `pnpm import:tests`)

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/import-parse.test.ts`:

```ts
import { buildReconcileRows } from '../../scripts/import-medical-tests';

describe('buildReconcileRows', () => {
  it('produces one row per skipped item with expected columns', () => {
    const rows = buildReconcileRows([
      {
        issue: 'DUPLICATE',
        flags: [],
        enRowIndex: 50,
        plRowIndex: 50,
        enName: 'Homocysteine',
        plName: 'Homocysteina',
        canonicalSlug: 'homocysteine',
      },
      {
        issue: 'MISSING_PL',
        flags: [],
        enRowIndex: 90,
        plRowIndex: 90,
        enName: 'Orphan',
        plName: '',
        canonicalSlug: 'orphan',
      },
    ]);
    expect(rows).toHaveLength(2);
    expect(Object.keys(rows[0])).toEqual([
      'issue_type', 'en_row', 'pl_row', 'en_name', 'pl_name',
      'suggested_action', 'your_fix',
    ]);
    expect(rows[0].issue_type).toBe('DUPLICATE');
    expect(rows[0].suggested_action).toMatch(/rename/i);
    expect(rows[1].suggested_action).toMatch(/add PL translation/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- import-parse`
Expected: FAIL — `buildReconcileRows is not a function`.

- [ ] **Step 3: Implement `buildReconcileRows` + `writeReconcileWorkbook`**

Add to `scripts/import-medical-tests.ts`:

```ts
export interface ReconcileRow {
  issue_type: IssueType | IssueFlag;
  en_row: number;
  pl_row: number;
  en_name: string;
  pl_name: string;
  suggested_action: string;
  your_fix: string;
}

const SUGGESTIONS: Record<IssueType | IssueFlag, string> = {
  OK: '',
  DUPLICATE: 'Rename one occurrence in the EN sheet to disambiguate (affects URL slug).',
  MISALIGNED: 'Reorder the PL sheet to align with the EN sheet at this row.',
  MISSING_EN: 'Add EN translation, or remove the PL row if intentionally PL-only.',
  MISSING_PL: 'Add PL translation, or remove the EN row if intentionally EN-only.',
  META_TOO_LONG_EN: 'Shorten EN meta description to ≤ 160 chars (currently truncated with ellipsis).',
  META_TOO_LONG_PL: 'Shorten PL meta description to ≤ 160 chars (currently truncated with ellipsis).',
};

export function buildReconcileRows(skipped: SkippedEntry[]): ReconcileRow[] {
  return skipped.map((s) => ({
    issue_type: s.issue,
    en_row: s.enRowIndex,
    pl_row: s.plRowIndex,
    en_name: s.enName,
    pl_name: s.plName,
    suggested_action: SUGGESTIONS[s.issue] ?? '',
    your_fix: '',
  }));
}

export async function writeReconcileWorkbook(rows: ReconcileRow[], outPath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('reconcile');
  ws.columns = [
    { header: 'issue_type', key: 'issue_type', width: 18 },
    { header: 'en_row', key: 'en_row', width: 8 },
    { header: 'pl_row', key: 'pl_row', width: 8 },
    { header: 'en_name', key: 'en_name', width: 40 },
    { header: 'pl_name', key: 'pl_name', width: 40 },
    { header: 'suggested_action', key: 'suggested_action', width: 60 },
    { header: 'your_fix', key: 'your_fix', width: 40 },
  ];
  for (const r of rows) ws.addRow(r);
  await wb.xlsx.writeFile(outPath);
}
```

Hook `writeReconcileWorkbook` into the end of `runImport` (when `!dryRun`), writing to `content-sources/medical-tests-reconcile.xlsx`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- import-parse`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-medical-tests.ts tests/unit/import-parse.test.ts
git commit -m "feat(importer): emit reconciliation workbook for skipped rows

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Emit categories.ts.tmpl on first run

**Files:**
- Modify: `scripts/import-medical-tests.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/import-parse.test.ts`:

```ts
import { renderCategoriesTmpl } from '../../scripts/import-medical-tests';

describe('renderCategoriesTmpl', () => {
  it('produces valid TS with inferred slugs from labels', () => {
    const ts = renderCategoriesTmpl([
      { key: 'hematology', labelEn: 'Hematology', labelPl: 'Hematologia' },
      { key: 'thyroid', labelEn: 'Thyroid', labelPl: 'Tarczyca' },
    ]);
    expect(ts).toContain("hematology:");
    expect(ts).toContain("slug: 'hematologia'");
    expect(ts).toContain("label: 'Hematology'");
    expect(ts).toContain("export const categoryMeta");
    expect(ts).toContain("satisfies Record");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- import-parse`
Expected: FAIL — `renderCategoriesTmpl is not a function`.

- [ ] **Step 3: Implement**

Add to `scripts/import-medical-tests.ts`:

```ts
export function renderCategoriesTmpl(
  categories: Array<{ key: string; labelEn: string; labelPl: string }>,
): string {
  const sorted = [...categories].sort((a, b) => a.key.localeCompare(b.key));
  const body = sorted.map((c) => {
    const plSlug = slugify(c.labelPl || c.labelEn);
    return `  ${c.key}: {
    en: { slug: '${c.key}', label: '${escape(c.labelEn)}' },
    pl: { slug: '${plSlug}', label: '${escape(c.labelPl || c.labelEn)}' },
  },`;
  }).join('\n');

  return `// AUTO-GENERATED by pnpm import:tests on first run.
// Review the PL slugs + labels below, then rename this file to categories.ts.
// After renaming, this file becomes the source of truth for category URLs.

export const categoryMeta = {
${body}
} as const satisfies Record<string, Record<'en' | 'pl', { slug: string; label: string }>>;

export type CategoryKey = keyof typeof categoryMeta;

export function getCategoryLabel(key: CategoryKey, lang: 'en' | 'pl'): string {
  return categoryMeta[key][lang].label;
}

export function getCategorySlug(key: CategoryKey, lang: 'en' | 'pl'): string {
  return categoryMeta[key][lang].slug;
}
`;
}

function escape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
```

In `runImport`, after the loop, write the file only if `src/i18n/categories.ts` does NOT exist:

```ts
const categoriesPath = 'src/i18n/categories.ts';
const tmplPath = 'src/i18n/categories.ts.tmpl';
if (!args.dryRun && !existsSync(categoriesPath)) {
  await writeFile(tmplPath, renderCategoriesTmpl(categoriesArray));
  console.log(`[INFO] Wrote ${tmplPath}. Review + rename to categories.ts.`);
}
```

When `categories.ts` DOES exist, validate that every `key` in `categoriesSeen` is also a key in the existing file. If not, throw with a clear message.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- import-parse`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/import-medical-tests.ts tests/unit/import-parse.test.ts
git commit -m "feat(importer): emit src/i18n/categories.ts.tmpl on first run

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — First import + human review gate

### Task 6: Run first import against real Excel (MANUAL + commit)

**Files:**
- Generated: `src/content/medical-tests/{en,pl}/*.mdx` (expected ~90-95 each)
- Generated: `src/i18n/categories.ts.tmpl`
- Generated: `content-sources/medical-tests-reconcile.xlsx`

- [ ] **Step 1: Run importer**

Run: `pnpm import:tests`
Expected stdout: `[INFO] Wrote src/i18n/categories.ts.tmpl...` + summary of `written.en / written.pl / skipped.length`.

- [ ] **Step 2: Verify counts are sensible**

Expected: ~90-95 EN MDX files + ~90-95 PL MDX files + reconcile workbook with skipped rows (3 dupes, 4+ missing-PL, any MISALIGNED post-row-100, plus META_TOO_LONG entries as informational).

Check: `ls src/content/medical-tests/en/*.mdx | wc -l` and PL equivalent.

- [ ] **Step 3: Stage + commit the generated content**

```bash
git add src/content/medical-tests/ src/i18n/categories.ts.tmpl content-sources/medical-tests-reconcile.xlsx
git commit -m "content(medical-tests): first S1 import — OK-overlap pages + reconcile workbook

~90-95 tests per locale. Reconciliation workbook committed for
later source-Excel corrections. categories.ts.tmpl pending human review.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Human review gate — categories.ts.tmpl → categories.ts

**Owner:** Blazej (human). Implementing agent pauses and pings Blazej.

- [ ] **Step 1: Pause**

Post to Blazej:

> "Import done. `src/i18n/categories.ts.tmpl` is ready for your review. Please open it, correct any PL slugs or labels that look wrong (you own the product naming), then rename the file to `src/i18n/categories.ts`. I'll wait on your OK before continuing."

- [ ] **Step 2: (After Blazej's OK) rename + commit**

```bash
git mv src/i18n/categories.ts.tmpl src/i18n/categories.ts
git commit -m "content(i18n): lock category translations in src/i18n/categories.ts

Reviewed + approved by Blazej. Becomes source of truth for category URLs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Schema, queries, routing helpers

### Task 8: Add schema refine + drift test

**Files:**
- Modify: `src/content/schemas.ts`
- Create: `tests/unit/categories-drift.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/categories-drift.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getCollection } from 'astro:content';
import { categoryMeta } from '@/i18n/categories';

describe('category slug drift', () => {
  it('every categorySlug in medical-tests content is a key in categoryMeta', async () => {
    const all = await getCollection('medical-tests');
    const knownKeys = new Set(Object.keys(categoryMeta));
    const offenders = all
      .map((e) => e.data.categorySlug)
      .filter((k) => !knownKeys.has(k));
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- categories-drift`
Expected: FAIL initially if any MDX has a categorySlug not yet in categoryMeta.

- [ ] **Step 3: Add refine in schema**

Modify `src/content/schemas.ts`:

```ts
import { z } from 'zod';
import { categoryMeta } from '@/i18n/categories';

const categoryKeys = Object.keys(categoryMeta) as [string, ...string[]];

export const medicalTestSchema = z.object({
  // ... existing fields ...
  categorySlug: z.enum(categoryKeys),   // replaces z.string()
  // ... rest unchanged ...
});
```

Also update importer to emit `categorySlug: slugify(categoryEn)` — which equals the key in `categoryMeta`.

- [ ] **Step 4: Run test + build to verify pass**

Run: `pnpm test -- categories-drift && pnpm check`
Expected: PASS. If the import produced any unrecognized keys, re-run Task 6 then fix categories.ts, then re-run this test.

- [ ] **Step 5: Commit**

```bash
git add src/content/schemas.ts tests/unit/categories-drift.test.ts scripts/import-medical-tests.ts
git commit -m "feat(schema): enforce categorySlug ∈ categoryMeta via zod enum

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Add buildCategoryURL + buildPillarURL helpers

**Files:**
- Modify: `src/i18n/routes.ts`
- Test: `tests/unit/buildURL.test.ts` (extend existing)

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/buildURL.test.ts`:

```ts
import { buildCategoryURL, buildPillarURL } from '@/i18n/routes';

describe('buildPillarURL', () => {
  it('EN → /medical-tests/', () => {
    expect(buildPillarURL('en', 'medical-tests')).toBe('/medical-tests/');
  });
  it('PL → /pl/badania/', () => {
    expect(buildPillarURL('pl', 'medical-tests')).toBe('/pl/badania/');
  });
});

describe('buildCategoryURL', () => {
  it('EN + hematology → /medical-tests/hematology/', () => {
    expect(buildCategoryURL('en', 'hematology')).toBe('/medical-tests/hematology/');
  });
  it('PL + hematology → /pl/badania/hematologia/', () => {
    expect(buildCategoryURL('pl', 'hematology')).toBe('/pl/badania/hematologia/');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- buildURL`
Expected: FAIL — helpers not exported.

- [ ] **Step 3: Implement**

Append to `src/i18n/routes.ts`:

```ts
import { categoryMeta, type CategoryKey } from './categories';

export function buildPillarURL(lang: Locale, collection: Collection): string {
  const prefix = localePrefix[lang];
  const segment = collectionSegments[collection][lang];
  return `${prefix}/${segment}/`;
}

export function buildCategoryURL(lang: Locale, key: CategoryKey): string {
  const prefix = localePrefix[lang];
  const collectionSeg = collectionSegments['medical-tests'][lang];
  const categorySeg = categoryMeta[key][lang].slug;
  return `${prefix}/${collectionSeg}/${categorySeg}/`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- buildURL`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/routes.ts tests/unit/buildURL.test.ts
git commit -m "feat(i18n): add buildPillarURL + buildCategoryURL helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Add queries.ts for build-time test-collection queries

**Files:**
- Create: `src/lib/medical-tests/queries.ts`
- Create: `tests/unit/medical-tests-queries.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/medical-tests-queries.test.ts`:

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import type { MedicalTestData } from '@/content/schemas';

// Minimal fixture — all optional fields omitted for brevity.
const fixture: Array<{ id: string; data: MedicalTestData & { updatedAt: Date; publishedAt: Date } }> = [
  { id: 'en/cbc',      data: { lang: 'en', slug: 'cbc', canonicalSlug: 'cbc', categorySlug: 'hematology' } as any },
  { id: 'en/ferritin', data: { lang: 'en', slug: 'ferritin', canonicalSlug: 'ferritin', categorySlug: 'hematology' } as any },
  { id: 'en/tsh',      data: { lang: 'en', slug: 'tsh', canonicalSlug: 'tsh', categorySlug: 'thyroid' } as any },
  { id: 'pl/morf',     data: { lang: 'pl', slug: 'morfologia', canonicalSlug: 'cbc', categorySlug: 'hematology' } as any },
];

import {
  filterByLang, groupByCategory, getSiblingsFromFixture,
} from '@/lib/medical-tests/queries';

describe('queries (pure helpers)', () => {
  it('filterByLang isolates one locale', () => {
    expect(filterByLang(fixture as any, 'en')).toHaveLength(3);
    expect(filterByLang(fixture as any, 'pl')).toHaveLength(1);
  });

  it('groupByCategory returns Map of category → tests', () => {
    const map = groupByCategory(filterByLang(fixture as any, 'en'));
    expect(map.get('hematology')).toHaveLength(2);
    expect(map.get('thyroid')).toHaveLength(1);
  });

  it('getSiblingsFromFixture excludes the current slug and caps at limit', () => {
    const en = filterByLang(fixture as any, 'en');
    const siblings = getSiblingsFromFixture(en, 'cbc', 'hematology', 5);
    expect(siblings.map((s) => s.data.slug)).toEqual(['ferritin']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- medical-tests-queries`
Expected: FAIL — missing module.

- [ ] **Step 3: Implement**

Create `src/lib/medical-tests/queries.ts`:

```ts
import { getCollection, type CollectionEntry } from 'astro:content';
import { type Locale } from '@/i18n/locales';
import { type CategoryKey } from '@/i18n/categories';

export type TestEntry = CollectionEntry<'medical-tests'>;

export function filterByLang(all: TestEntry[], lang: Locale): TestEntry[] {
  return all.filter((e) => e.data.lang === lang);
}

export function groupByCategory(entries: TestEntry[]): Map<CategoryKey, TestEntry[]> {
  const map = new Map<CategoryKey, TestEntry[]>();
  for (const e of entries) {
    const key = e.data.categorySlug as CategoryKey;
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  // Sort tests within each category alphabetically by title for stable output.
  for (const arr of map.values()) {
    arr.sort((a, b) => a.data.title.localeCompare(b.data.title));
  }
  return map;
}

export function getSiblingsFromFixture(
  entries: TestEntry[],
  currentSlug: string,
  categoryKey: CategoryKey,
  limit: number,
): TestEntry[] {
  return entries
    .filter((e) => e.data.categorySlug === categoryKey && e.data.slug !== currentSlug)
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .slice(0, limit);
}

// Astro-facing wrappers (call getCollection internally).
export async function getAllTests(lang: Locale): Promise<TestEntry[]> {
  const all = await getCollection('medical-tests');
  return filterByLang(all, lang);
}

export async function getTestsByCategory(lang: Locale): Promise<Map<CategoryKey, TestEntry[]>> {
  return groupByCategory(await getAllTests(lang));
}

export async function getTestsInCategory(lang: Locale, key: CategoryKey): Promise<TestEntry[]> {
  return (await getAllTests(lang)).filter((e) => e.data.categorySlug === key)
    .sort((a, b) => a.data.title.localeCompare(b.data.title));
}

export async function getSiblingsByCategory(
  slug: string, categoryKey: CategoryKey, lang: Locale, limit: number,
): Promise<TestEntry[]> {
  return getSiblingsFromFixture(await getAllTests(lang), slug, categoryKey, limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- medical-tests-queries && pnpm check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/medical-tests/queries.ts tests/unit/medical-tests-queries.test.ts
git commit -m "feat(lib): add medical-tests build-time query helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Shared components

> **CHECKPOINT — Pencil design.** Do not start Phase 4 without Blazej's Pencil approval or explicit "ship on defaults + iterate later" waiver. Components below ship with shadcn/Tailwind defaults if waived.

### Task 11: TestCard component

**Files:**
- Create: `src/components/TestCard.astro`
- Create: `tests/unit/test-card.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/test-card.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, it, expect } from 'vitest';
import TestCard from '@/components/TestCard.astro';

describe('TestCard', () => {
  it('renders title, aiUseCase, and link to the test page', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TestCard, {
      props: {
        href: '/medical-tests/cbc/',
        title: 'Complete Blood Count',
        aiUseCase: 'Anemia, infection',
        categoryLabel: 'Hematology',
      },
    });
    expect(html).toContain('Complete Blood Count');
    expect(html).toContain('Anemia, infection');
    expect(html).toContain('Hematology');
    expect(html).toContain('href="/medical-tests/cbc/"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- test-card`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement**

Create `src/components/TestCard.astro`:

```astro
---
interface Props {
  href: string;
  title: string;
  aiUseCase: string;
  categoryLabel: string;
}
const { href, title, aiUseCase, categoryLabel } = Astro.props;
---
<a href={href} class="block rounded-lg border border-border p-4 hover:border-foreground transition-colors">
  <div class="text-xs text-muted-foreground uppercase tracking-wide">{categoryLabel}</div>
  <div class="mt-1 text-base font-medium">{title}</div>
  {aiUseCase && <div class="mt-1 text-sm text-muted-foreground line-clamp-2">{aiUseCase}</div>}
</a>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- test-card`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/TestCard.astro tests/unit/test-card.test.ts
git commit -m "feat(ui): add TestCard component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: CategoryCard component

**Files:**
- Create: `src/components/CategoryCard.astro`
- Create: `tests/unit/category-card.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/category-card.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, it, expect } from 'vitest';
import CategoryCard from '@/components/CategoryCard.astro';

describe('CategoryCard', () => {
  it('renders label, description, test count, and link', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryCard, {
      props: {
        href: '/medical-tests/hematology/',
        label: 'Hematology',
        description: 'Blood-cell tests',
        testCount: 12,
      },
    });
    expect(html).toContain('Hematology');
    expect(html).toContain('Blood-cell tests');
    expect(html).toContain('12');
    expect(html).toContain('href="/medical-tests/hematology/"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- category-card`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/CategoryCard.astro`:

```astro
---
interface Props {
  href: string;
  label: string;
  description?: string;
  testCount: number;
}
const { href, label, description, testCount } = Astro.props;
---
<a href={href} class="flex flex-col justify-between rounded-lg border border-border p-5 hover:border-foreground transition-colors">
  <div>
    <div class="text-lg font-semibold">{label}</div>
    {description && <div class="mt-1 text-sm text-muted-foreground">{description}</div>}
  </div>
  <div class="mt-3 text-xs text-muted-foreground">{testCount} {testCount === 1 ? 'test' : 'tests'}</div>
</a>
```

(Label pluralization for PL will use a translated variant via `t()` once wired — see Task 21.)

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- category-card`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CategoryCard.astro tests/unit/category-card.test.ts
git commit -m "feat(ui): add CategoryCard component

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: RelatedContent component with fallback logic

**Files:**
- Create: `src/components/RelatedContent.astro`
- Create: `tests/unit/related-content.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/related-content.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { selectRelated } from '@/components/related-content-logic';
import type { TestEntry } from '@/lib/medical-tests/queries';

const mkEntry = (slug: string, category: string, title: string): TestEntry => ({
  id: `en/${slug}`, slug, collection: 'medical-tests',
  data: { slug, canonicalSlug: slug, lang: 'en', title, categorySlug: category } as any,
} as TestEntry);

describe('selectRelated', () => {
  const all = [
    mkEntry('cbc', 'hematology', 'CBC'),
    mkEntry('ferritin', 'hematology', 'Ferritin'),
    mkEntry('iron', 'hematology', 'Iron'),
    mkEntry('tsh', 'thyroid', 'TSH'),
  ];

  it('uses curated relatedTests when length ≥ 3', () => {
    const res = selectRelated({
      currentSlug: 'cbc', categoryKey: 'hematology', lang: 'en',
      curated: ['ferritin', 'iron', 'tsh'], all,
    });
    expect(res.map((e) => e.data.slug)).toEqual(['ferritin', 'iron', 'tsh']);
  });

  it('falls back to siblings when curated is empty', () => {
    const res = selectRelated({
      currentSlug: 'cbc', categoryKey: 'hematology', lang: 'en',
      curated: [], all,
    });
    expect(res.map((e) => e.data.slug).sort()).toEqual(['ferritin', 'iron']);
  });

  it('falls back to siblings when curated has < 3', () => {
    const res = selectRelated({
      currentSlug: 'cbc', categoryKey: 'hematology', lang: 'en',
      curated: ['ferritin'], all,
    });
    expect(res.map((e) => e.data.slug).sort()).toEqual(['ferritin', 'iron']);
  });

  it('returns empty array when < 3 items sourceable (signals suppression)', () => {
    const res = selectRelated({
      currentSlug: 'tsh', categoryKey: 'thyroid', lang: 'en',
      curated: [], all,
    });
    expect(res).toEqual([]);  // thyroid has only 1 test (itself, excluded) → 0 siblings
  });

  it('caps at 5', () => {
    const many = Array.from({ length: 10 }, (_, i) => mkEntry(`test${i}`, 'hematology', `Test${i}`));
    const res = selectRelated({
      currentSlug: 'test0', categoryKey: 'hematology', lang: 'en',
      curated: [], all: many,
    });
    expect(res).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- related-content`
Expected: FAIL — `selectRelated` not found.

- [ ] **Step 3: Implement pure logic + Astro shell**

Create `src/components/related-content-logic.ts`:

```ts
import type { TestEntry } from '@/lib/medical-tests/queries';
import type { CategoryKey } from '@/i18n/categories';
import type { Locale } from '@/i18n/locales';

export interface SelectRelatedArgs {
  currentSlug: string;
  categoryKey: CategoryKey;
  lang: Locale;
  curated: string[];
  all: TestEntry[];
}

const LIMIT = 5;
const MIN_TO_SHOW = 3;

export function selectRelated(args: SelectRelatedArgs): TestEntry[] {
  const inLang = args.all.filter((e) => e.data.lang === args.lang);
  const bySlug = new Map(inLang.map((e) => [e.data.slug, e] as const));

  // Try curated first.
  if (args.curated.length >= MIN_TO_SHOW) {
    const picked = args.curated.map((s) => bySlug.get(s)).filter((x): x is TestEntry => Boolean(x));
    if (picked.length >= MIN_TO_SHOW) return picked.slice(0, LIMIT);
  }

  // Fallback to category siblings.
  const siblings = inLang
    .filter((e) => e.data.categorySlug === args.categoryKey && e.data.slug !== args.currentSlug)
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .slice(0, LIMIT);

  if (siblings.length < MIN_TO_SHOW) return [];
  return siblings;
}
```

Create `src/components/RelatedContent.astro`:

```astro
---
import { getCollection } from 'astro:content';
import TestCard from './TestCard.astro';
import { selectRelated } from './related-content-logic';
import { buildURL } from '@/i18n/routes';
import { categoryMeta, type CategoryKey } from '@/i18n/categories';
import type { Locale } from '@/i18n/locales';
import { t } from '@/i18n/ui';

interface Props {
  currentSlug: string;
  categoryKey: CategoryKey;
  lang: Locale;
  curated?: string[];
}

const { currentSlug, categoryKey, lang, curated = [] } = Astro.props;
const all = await getCollection('medical-tests');
const picks = selectRelated({ currentSlug, categoryKey, lang, curated, all });
---
{picks.length >= 3 && (
  <section class="mt-12 border-t border-border pt-8">
    <h2 class="text-xl font-semibold mb-4">{t(lang, 'relatedContent.heading')}</h2>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {picks.map((e) => (
        <TestCard
          href={buildURL({ lang, collection: 'medical-tests', slug: e.data.slug })}
          title={e.data.title}
          aiUseCase={e.data.aiUseCase}
          categoryLabel={categoryMeta[e.data.categorySlug as CategoryKey][lang].label}
        />
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm test -- related-content && pnpm check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RelatedContent.astro src/components/related-content-logic.ts tests/unit/related-content.test.ts
git commit -m "feat(ui): add RelatedContent component with curated+fallback logic

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — Pagefind integration

### Task 14: Install Pagefind + postbuild hook

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`

- [ ] **Step 1: Install**

Run: `pnpm add -D pagefind`

- [ ] **Step 2: Add Astro build hook**

Modify `astro.config.mjs` — add an integration after existing integrations:

```ts
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';

const pagefindIntegration = {
  name: 'symptomatik:pagefind',
  hooks: {
    'astro:build:done': ({ dir, logger }) => {
      const site = dir.pathname;
      logger.info(`Running pagefind against ${site}`);
      execSync(
        `pnpm pagefind --site "${site}" --glob "medical-tests/**,pl/badania/**"`,
        { stdio: 'inherit' },
      );
    },
  },
};

export default defineConfig({
  // ... existing config ...
  integrations: [
    react(),
    mdx(),
    pagefindIntegration,
  ],
  // ...
});
```

- [ ] **Step 3: Run build, verify `/pagefind/` exists in dist**

Run: `pnpm build && ls dist/pagefind/`
Expected: `pagefind.js`, `pagefind-ui.js`, `pagefind-ui.css`, fragment + index files exist.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml astro.config.mjs
git commit -m "feat(build): wire Pagefind postbuild indexing for medical-tests

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: PillarSearch component (astro wrapper + React island)

**Files:**
- Create: `src/components/PillarSearch.astro`
- Create: `src/components/PillarSearch.tsx`
- Create: `src/components/pillar-search.css`

- [ ] **Step 1: Implement React island**

Create `src/components/PillarSearch.tsx`:

```tsx
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    PagefindUI?: new (opts: object) => unknown;
  }
}

interface Props {
  lang: 'en' | 'pl';
  placeholder: string;
}

export default function PillarSearch({ lang, placeholder }: Props) {
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    // Dynamically load Pagefind UI — avoids cost on non-pillar pages.
    const script = document.createElement('script');
    script.src = '/pagefind/pagefind-ui.js';
    script.onload = () => {
      new window.PagefindUI!({
        element: '#pillar-search',
        showImages: false,
        resetStyles: false,
        translations: lang === 'pl' ? {
          placeholder,
          zero_results: 'Brak wyników dla [SEARCH_TERM]',
        } : { placeholder },
      });
    };
    document.head.appendChild(script);
  }, [lang, placeholder]);
  return null;
}
```

Create `src/components/PillarSearch.astro`:

```astro
---
import PillarSearch from './PillarSearch';
import '@/components/pillar-search.css';
import { t } from '@/i18n/ui';
import type { Locale } from '@/i18n/locales';

interface Props { lang: Locale; }
const { lang } = Astro.props;
---
<div class="my-6">
  <link rel="stylesheet" href="/pagefind/pagefind-ui.css" />
  <div id="pillar-search" class="pillar-search"></div>
  <PillarSearch client:load lang={lang as 'en' | 'pl'} placeholder={t(lang, 'search.placeholder')} />
</div>
```

Create `src/components/pillar-search.css` (minimal overrides — leave hard visual choices to Pencil):

```css
#pillar-search {
  --pagefind-ui-scale: 1;
  --pagefind-ui-primary: hsl(var(--foreground));
  --pagefind-ui-border: hsl(var(--border));
  --pagefind-ui-border-radius: 0.5rem;
}
```

- [ ] **Step 2: Smoke-test manually**

Run: `pnpm build && pnpm preview`
Visit: `http://localhost:4321/medical-tests/` after Task 16 lands. For now verify build does not break.

- [ ] **Step 3: Commit**

```bash
git add src/components/PillarSearch.astro src/components/PillarSearch.tsx src/components/pillar-search.css
git commit -m "feat(ui): add PillarSearch component (Pagefind UI wrapper)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6 — Pillar + Category pages

### Task 16: EN pillar page

**Files:**
- Create: `src/pages/medical-tests/index.astro`

- [ ] **Step 1: Write**

```astro
---
import BaseLayout from '@/components/BaseLayout.astro';
import PillarSearch from '@/components/PillarSearch.astro';
import CategoryCard from '@/components/CategoryCard.astro';
import TestCard from '@/components/TestCard.astro';
import { getTestsByCategory } from '@/lib/medical-tests/queries';
import { categoryMeta, type CategoryKey } from '@/i18n/categories';
import { buildCategoryURL, buildURL, buildPillarURL } from '@/i18n/routes';
import { canonicalURL, alternatesFor } from '@/lib/seo/meta';
import { collectionPage, itemList, breadcrumbList } from '@/lib/seo/json-ld';
import { t } from '@/i18n/ui';

const lang = 'en';
const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';
const canonical = canonicalURL({ site, lang, collection: 'medical-tests', slug: '' });
const byCategory = await getTestsByCategory(lang);
const keys = Object.keys(categoryMeta).filter((k) => byCategory.has(k as CategoryKey)) as CategoryKey[];
keys.sort((a, b) => categoryMeta[a][lang].label.localeCompare(categoryMeta[b][lang].label));

const alternates = [
  { lang: 'en', href: site + buildPillarURL('en', 'medical-tests') },
  { lang: 'pl', href: site + buildPillarURL('pl', 'medical-tests') },
  { lang: 'x-default', href: site + buildPillarURL('en', 'medical-tests') },
];

const breadcrumbs = [
  { label: t(lang, 'breadcrumbs.home'), href: site + '/' },
  { label: t(lang, 'breadcrumbs.medicalTests') },
];

const jsonLd = [
  collectionPage({
    url: canonical,
    title: t(lang, 'pillar.title'),
    description: t(lang, 'pillar.description'),
    inLanguage: lang,
  }),
  itemList(keys.map((k, i) => ({
    position: i + 1,
    name: categoryMeta[k][lang].label,
    url: site + buildCategoryURL(lang, k),
  }))),
  breadcrumbList(breadcrumbs),
];
---
<BaseLayout
  title={t(lang, 'pillar.metaTitle')}
  description={t(lang, 'pillar.metaDescription')}
  canonical={canonical}
  alternates={alternates}
  locale={lang}
  jsonLd={jsonLd}
>
  <main class="mx-auto max-w-5xl px-4 py-10">
    <nav aria-label="Breadcrumb" class="text-sm text-muted-foreground mb-4">
      <a href="/">{t(lang, 'breadcrumbs.home')}</a> / <span>{t(lang, 'breadcrumbs.medicalTests')}</span>
    </nav>
    <h1 class="text-3xl font-bold">{t(lang, 'pillar.title')}</h1>
    <p class="mt-3 text-muted-foreground">{t(lang, 'pillar.description')}</p>

    <PillarSearch lang={lang} />

    <section class="mt-10">
      <h2 class="text-xl font-semibold mb-4">{t(lang, 'pillar.categoriesHeading')}</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((k) => (
          <CategoryCard
            href={buildCategoryURL(lang, k)}
            label={categoryMeta[k][lang].label}
            testCount={byCategory.get(k)!.length}
          />
        ))}
      </div>
    </section>

    {keys.map((k) => (
      <section id={k} class="mt-12 scroll-mt-20">
        <h2 class="text-2xl font-semibold">{categoryMeta[k][lang].label}</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byCategory.get(k)!.map((e) => (
            <TestCard
              href={buildURL({ lang, collection: 'medical-tests', slug: e.data.slug })}
              title={e.data.title}
              aiUseCase={e.data.aiUseCase}
              categoryLabel={categoryMeta[k][lang].label}
            />
          ))}
        </div>
      </section>
    ))}
  </main>
</BaseLayout>
```

(If `collectionPage` / `itemList` are not yet in `@/lib/seo/json-ld`, Task 22 adds them — run Task 22 before Task 16 if you want strict TDD order; otherwise comment out the JSON-LD block temporarily and uncomment after Task 22.)

- [ ] **Step 2: Manual smoke**

Run: `pnpm dev`
Visit: `http://localhost:4321/medical-tests/`
Expected: pillar page renders with categories + search.

- [ ] **Step 3: Commit**

```bash
git add src/pages/medical-tests/index.astro
git commit -m "feat(pages): add EN medical-tests pillar page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: PL pillar page

**Files:**
- Create: `src/pages/pl/badania/index.astro`

- [ ] **Step 1: Write the PL pillar**

Create `src/pages/pl/badania/index.astro` — same structure as Task 16 with `lang = 'pl'`. Full file:

```astro
---
import BaseLayout from '@/components/BaseLayout.astro';
import PillarSearch from '@/components/PillarSearch.astro';
import CategoryCard from '@/components/CategoryCard.astro';
import TestCard from '@/components/TestCard.astro';
import { getTestsByCategory } from '@/lib/medical-tests/queries';
import { categoryMeta, type CategoryKey } from '@/i18n/categories';
import { buildCategoryURL, buildURL, buildPillarURL } from '@/i18n/routes';
import { canonicalURL } from '@/lib/seo/meta';
import { collectionPage, itemList, breadcrumbList } from '@/lib/seo/json-ld';
import { t } from '@/i18n/ui';

const lang = 'pl';
const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';
const canonical = site + buildPillarURL(lang, 'medical-tests');
const byCategory = await getTestsByCategory(lang);
const keys = Object.keys(categoryMeta).filter((k) => byCategory.has(k as CategoryKey)) as CategoryKey[];
keys.sort((a, b) => categoryMeta[a][lang].label.localeCompare(categoryMeta[b][lang].label));

const alternates = [
  { lang: 'en', href: site + buildPillarURL('en', 'medical-tests') },
  { lang: 'pl', href: site + buildPillarURL('pl', 'medical-tests') },
  { lang: 'x-default', href: site + buildPillarURL('en', 'medical-tests') },
];

const breadcrumbs = [
  { label: t(lang, 'breadcrumbs.home'), href: site + '/pl/' },
  { label: t(lang, 'breadcrumbs.medicalTests') },
];

const jsonLd = [
  collectionPage({ url: canonical, title: t(lang, 'pillar.title'), description: t(lang, 'pillar.description'), inLanguage: lang }),
  itemList(keys.map((k, i) => ({ position: i + 1, name: categoryMeta[k][lang].label, url: site + buildCategoryURL(lang, k) }))),
  breadcrumbList(breadcrumbs),
];
---
<BaseLayout
  title={t(lang, 'pillar.metaTitle')}
  description={t(lang, 'pillar.metaDescription')}
  canonical={canonical}
  alternates={alternates}
  locale={lang}
  jsonLd={jsonLd}
>
  <main class="mx-auto max-w-5xl px-4 py-10">
    <nav aria-label="Breadcrumb" class="text-sm text-muted-foreground mb-4">
      <a href="/pl/">{t(lang, 'breadcrumbs.home')}</a> / <span>{t(lang, 'breadcrumbs.medicalTests')}</span>
    </nav>
    <h1 class="text-3xl font-bold">{t(lang, 'pillar.title')}</h1>
    <p class="mt-3 text-muted-foreground">{t(lang, 'pillar.description')}</p>

    <PillarSearch lang={lang} />

    <section class="mt-10">
      <h2 class="text-xl font-semibold mb-4">{t(lang, 'pillar.categoriesHeading')}</h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((k) => (
          <CategoryCard href={buildCategoryURL(lang, k)} label={categoryMeta[k][lang].label} testCount={byCategory.get(k)!.length} />
        ))}
      </div>
    </section>

    {keys.map((k) => (
      <section id={k} class="mt-12 scroll-mt-20">
        <h2 class="text-2xl font-semibold">{categoryMeta[k][lang].label}</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {byCategory.get(k)!.map((e) => (
            <TestCard
              href={buildURL({ lang, collection: 'medical-tests', slug: e.data.slug })}
              title={e.data.title}
              aiUseCase={e.data.aiUseCase}
              categoryLabel={categoryMeta[k][lang].label}
            />
          ))}
        </div>
      </section>
    ))}
  </main>
</BaseLayout>
```

- [ ] **Step 2: Manual smoke**

Visit: `http://localhost:4321/pl/badania/`
Expected: PL pillar renders with PL category labels and search placeholder.

- [ ] **Step 3: Commit**

```bash
git add src/pages/pl/badania/index.astro
git commit -m "feat(pages): add PL medical-tests pillar page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: EN category index page

**Files:**
- Create: `src/pages/medical-tests/[category]/index.astro`

- [ ] **Step 1: Write**

```astro
---
import BaseLayout from '@/components/BaseLayout.astro';
import TestCard from '@/components/TestCard.astro';
import { getTestsInCategory } from '@/lib/medical-tests/queries';
import { categoryMeta, type CategoryKey } from '@/i18n/categories';
import { buildCategoryURL, buildURL, buildPillarURL } from '@/i18n/routes';
import { canonicalURL } from '@/lib/seo/meta';
import { collectionPage, itemList, breadcrumbList } from '@/lib/seo/json-ld';
import { t } from '@/i18n/ui';

export async function getStaticPaths() {
  const keys = Object.keys(categoryMeta) as CategoryKey[];
  return keys.map((key) => ({
    params: { category: categoryMeta[key].en.slug },
    props: { key },
  }));
}

const { key } = Astro.props;
const lang = 'en';
const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';
const tests = await getTestsInCategory(lang, key);
const label = categoryMeta[key][lang].label;
const canonical = site + buildCategoryURL(lang, key);

const alternates = [
  { lang: 'en', href: site + buildCategoryURL('en', key) },
  { lang: 'pl', href: site + buildCategoryURL('pl', key) },
  { lang: 'x-default', href: site + buildCategoryURL('en', key) },
];

const breadcrumbs = [
  { label: t(lang, 'breadcrumbs.home'), href: site + '/' },
  { label: t(lang, 'breadcrumbs.medicalTests'), href: site + buildPillarURL(lang, 'medical-tests') },
  { label },
];

const jsonLd = [
  collectionPage({ url: canonical, title: label, description: t(lang, 'category.description', { label }), inLanguage: lang }),
  itemList(tests.map((e, i) => ({
    position: i + 1,
    name: e.data.title,
    url: site + buildURL({ lang, collection: 'medical-tests', slug: e.data.slug }),
  }))),
  breadcrumbList(breadcrumbs),
];
---
<BaseLayout
  title={`${label} — Medical Tests | Symptomatik`}
  description={t(lang, 'category.metaDescription', { label })}
  canonical={canonical}
  alternates={alternates}
  locale={lang}
  jsonLd={jsonLd}
>
  <main class="mx-auto max-w-5xl px-4 py-10">
    <nav aria-label="Breadcrumb" class="text-sm text-muted-foreground mb-4">
      <a href="/">{t(lang, 'breadcrumbs.home')}</a> /
      <a href={buildPillarURL(lang, 'medical-tests')}>{t(lang, 'breadcrumbs.medicalTests')}</a> /
      <span>{label}</span>
    </nav>
    <h1 class="text-3xl font-bold">{label}</h1>
    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tests.map((e) => (
        <TestCard
          href={buildURL({ lang, collection: 'medical-tests', slug: e.data.slug })}
          title={e.data.title}
          aiUseCase={e.data.aiUseCase}
          categoryLabel={label}
        />
      ))}
    </div>
  </main>
</BaseLayout>
```

- [ ] **Step 2: Manual smoke**

Visit: `http://localhost:4321/medical-tests/hematology/`

- [ ] **Step 3: Commit**

```bash
git add "src/pages/medical-tests/[category]/index.astro"
git commit -m "feat(pages): add EN category index pages

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: PL category index page

**Files:**
- Create: `src/pages/pl/badania/[category]/index.astro`

- [ ] **Step 1: Write**

```astro
---
import BaseLayout from '@/components/BaseLayout.astro';
import TestCard from '@/components/TestCard.astro';
import { getTestsInCategory } from '@/lib/medical-tests/queries';
import { categoryMeta, type CategoryKey } from '@/i18n/categories';
import { buildCategoryURL, buildURL, buildPillarURL } from '@/i18n/routes';
import { collectionPage, itemList, breadcrumbList } from '@/lib/seo/json-ld';
import { t } from '@/i18n/ui';

export async function getStaticPaths() {
  const keys = Object.keys(categoryMeta) as CategoryKey[];
  return keys.map((key) => ({
    params: { category: categoryMeta[key].pl.slug },
    props: { key },
  }));
}

const { key } = Astro.props;
const lang = 'pl';
const site = import.meta.env.PUBLIC_SITE_URL || 'https://symptomatik.com';
const tests = await getTestsInCategory(lang, key);
const label = categoryMeta[key][lang].label;
const canonical = site + buildCategoryURL(lang, key);

const alternates = [
  { lang: 'en', href: site + buildCategoryURL('en', key) },
  { lang: 'pl', href: site + buildCategoryURL('pl', key) },
  { lang: 'x-default', href: site + buildCategoryURL('en', key) },
];

const breadcrumbs = [
  { label: t(lang, 'breadcrumbs.home'), href: site + '/pl/' },
  { label: t(lang, 'breadcrumbs.medicalTests'), href: site + buildPillarURL(lang, 'medical-tests') },
  { label },
];

const jsonLd = [
  collectionPage({ url: canonical, title: label, description: t(lang, 'category.description', { label }), inLanguage: lang }),
  itemList(tests.map((e, i) => ({
    position: i + 1, name: e.data.title,
    url: site + buildURL({ lang, collection: 'medical-tests', slug: e.data.slug }),
  }))),
  breadcrumbList(breadcrumbs),
];
---
<BaseLayout
  title={`${label} — Badania | Symptomatik`}
  description={t(lang, 'category.metaDescription', { label })}
  canonical={canonical}
  alternates={alternates}
  locale={lang}
  jsonLd={jsonLd}
>
  <main class="mx-auto max-w-5xl px-4 py-10">
    <nav aria-label="Breadcrumb" class="text-sm text-muted-foreground mb-4">
      <a href="/pl/">{t(lang, 'breadcrumbs.home')}</a> /
      <a href={buildPillarURL(lang, 'medical-tests')}>{t(lang, 'breadcrumbs.medicalTests')}</a> /
      <span>{label}</span>
    </nav>
    <h1 class="text-3xl font-bold">{label}</h1>
    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tests.map((e) => (
        <TestCard
          href={buildURL({ lang, collection: 'medical-tests', slug: e.data.slug })}
          title={e.data.title}
          aiUseCase={e.data.aiUseCase}
          categoryLabel={label}
        />
      ))}
    </div>
  </main>
</BaseLayout>
```

- [ ] **Step 2: Manual smoke**

Visit: `http://localhost:4321/pl/badania/hematologia/`

- [ ] **Step 3: Commit**

```bash
git add "src/pages/pl/badania/[category]/index.astro"
git commit -m "feat(pages): add PL category index pages

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 7 — Layouts + navigation

### Task 20: Update BaseLayout nav "Medical Tests" link per locale

**Files:**
- Modify: `src/components/BaseLayout.astro`
- Test: add to existing E2E nav spec

- [ ] **Step 1: Change the href**

Find the nav `<a>` that points to `/` with the "Medical Tests" / localized label, change to use `buildPillarURL(Astro.props.locale, 'medical-tests')`.

- [ ] **Step 2: Manual smoke**

Click "Medical Tests" in the header on `/`, `/pl/`, and `/es/` (ES should still land somewhere sane — either the EN pillar or a "not yet available" state; confirm behavior).

For ES: since S1 explicitly scopes no ES content, the ES nav should either hide the link or link to the EN pillar. Decision: hide on ES. Wrap in `{locale !== 'es' && ...}`.

- [ ] **Step 3: Commit**

```bash
git add src/components/BaseLayout.astro
git commit -m "feat(nav): wire Medical Tests header link to real pillar per locale

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: Extend `@/i18n/ui` with S1 strings + embed RelatedContent

**Files:**
- Modify: `src/i18n/ui.ts`
- Modify: `src/components/ContentLayout.astro`
- Modify: `src/pages/[...slug].astro` and PL/ES equivalents

- [ ] **Step 1: Add i18n keys**

Extend `src/i18n/ui.ts` `STRINGS` with concrete values (copy exact text, translate later during content pass if needed):

```ts
// inside STRINGS.en:
'pillar.title': 'Medical Tests',
'pillar.description': 'Lab tests we interpret — grouped by category. Search, browse, or jump straight to what you need.',
'pillar.metaTitle': 'Medical Tests Directory | Symptomatik',
'pillar.metaDescription': 'Browse all lab tests we interpret. Understand normal ranges, what abnormal values may mean, and when to test.',
'pillar.categoriesHeading': 'Browse by category',
'category.description': 'All {label} tests we currently interpret.',
'category.metaDescription': '{label} lab tests — ranges, interpretation, and what your results mean.',
'search.placeholder': 'Search tests (e.g. "blood", "thyroid")',
'relatedContent.heading': 'Related tests',

// inside STRINGS.pl:
'pillar.title': 'Badania laboratoryjne',
'pillar.description': 'Badania laboratoryjne, które interpretujemy — pogrupowane według kategorii. Wyszukaj, przeglądaj lub przejdź od razu do interesującego Cię badania.',
'pillar.metaTitle': 'Katalog badań laboratoryjnych | Symptomatik',
'pillar.metaDescription': 'Przeglądaj wszystkie badania laboratoryjne, które interpretujemy. Poznaj normy, znaczenie nieprawidłowych wyników i kiedy wykonać badanie.',
'pillar.categoriesHeading': 'Przeglądaj według kategorii',
'category.description': 'Wszystkie badania z kategorii {label}, które interpretujemy.',
'category.metaDescription': 'Badania z kategorii {label} — normy, interpretacja, co oznaczają wyniki.',
'search.placeholder': 'Wyszukaj badanie (np. "morfologia", "tarczyca")',
'relatedContent.heading': 'Powiązane badania',
```

The `t(lang, key, vars?)` signature: support a third optional arg `vars` that substitutes `{key}` tokens. If the existing `t()` doesn't support interpolation, extend it here:

```ts
export function t(lang: Locale, key: string, vars?: Record<string, string>): string {
  const raw = (STRINGS[lang] ?? STRINGS.en)[key] ?? STRINGS.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
```

- [ ] **Step 2: Pass `categorySlug` into ContentLayout**

Modify `src/pages/[...slug].astro` (EN) so it passes `categoryKey={entry.data.categorySlug}` and `relatedTests={entry.data.relatedTests ?? []}` to `<ContentLayout>`.

- [ ] **Step 3: Render RelatedContent in ContentLayout**

Modify `src/components/ContentLayout.astro` to accept the new props and render `<RelatedContent>` above `<MedicalDisclaimer>`:

```astro
{categoryKey && (
  <RelatedContent
    currentSlug={slug}
    categoryKey={categoryKey}
    lang={locale}
    curated={relatedTests}
  />
)}
<MedicalDisclaimer />
```

Repeat step 2 for `src/pages/pl/[...slug].astro` and `src/pages/es/[...slug].astro`.

- [ ] **Step 4: Manual smoke**

Visit `/medical-tests/complete-blood-count-cbc/` — should show a RelatedContent block if the Hematology category has ≥ 3 tests after Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ui.ts src/components/ContentLayout.astro "src/pages/[...slug].astro" "src/pages/pl/[...slug].astro" "src/pages/es/[...slug].astro"
git commit -m "feat(content): embed RelatedContent in ContentLayout; add i18n strings

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 8 — JSON-LD extensions

### Task 22: Add `collectionPage()` + `itemList()` helpers

**Files:**
- Modify: `src/lib/seo/json-ld.ts`
- Test: `tests/unit/json-ld.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/json-ld.test.ts`:

```ts
import { collectionPage, itemList } from '@/lib/seo/json-ld';

describe('collectionPage', () => {
  it('builds a valid schema.org CollectionPage object', () => {
    const obj = collectionPage({
      url: 'https://symptomatik.com/medical-tests/',
      title: 'Medical Tests',
      description: 'All the medical tests we interpret.',
      inLanguage: 'en',
    });
    expect(obj['@type']).toBe('CollectionPage');
    expect(obj.url).toBe('https://symptomatik.com/medical-tests/');
    expect(obj.inLanguage).toBe('en');
  });
});

describe('itemList', () => {
  it('builds a valid schema.org ItemList with positional entries', () => {
    const obj = itemList([
      { position: 1, name: 'CBC', url: 'https://s.com/cbc/' },
      { position: 2, name: 'TSH', url: 'https://s.com/tsh/' },
    ]);
    expect(obj['@type']).toBe('ItemList');
    expect(obj.itemListElement).toHaveLength(2);
    expect(obj.itemListElement[0]['@type']).toBe('ListItem');
    expect(obj.itemListElement[0].position).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- json-ld`
Expected: FAIL.

- [ ] **Step 3: Implement**

Append to `src/lib/seo/json-ld.ts`:

```ts
export interface CollectionPageArgs {
  url: string;
  title: string;
  description: string;
  inLanguage: 'en' | 'pl' | 'es';
}

export function collectionPage(args: CollectionPageArgs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    url: args.url,
    name: args.title,
    description: args.description,
    inLanguage: args.inLanguage,
  };
}

export interface ItemListEntry {
  position: number;
  name: string;
  url: string;
}

export function itemList(entries: ItemListEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: entries.map((e) => ({
      '@type': 'ListItem',
      position: e.position,
      name: e.name,
      url: e.url,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- json-ld`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/seo/json-ld.ts tests/unit/json-ld.test.ts
git commit -m "feat(seo): add collectionPage + itemList JSON-LD helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 9 — Sitemap + hreflang audit

### Task 23: Confirm sitemap + hreflang auto-pick-up; patch if gaps

**Files:**
- Inspect: `src/pages/sitemap*.xml.ts` (or equivalent)
- Modify: only if gaps exist

- [ ] **Step 1: Build + inspect sitemaps**

Run: `pnpm build && grep -l medical-tests dist/sitemap*.xml`
Expected: new pillar + category URLs present in per-locale sitemaps.

- [ ] **Step 2: If sitemap generator enumerates only `medical-tests` collection entries (test pages), add static routes explicitly**

The S0 sitemap logic likely iterates over content collections. Add static-route enumeration for pillar + category pages. Insert a `buildStaticRoutes(lang)` helper in `src/pages/sitemap-*.xml.ts` that yields pillar + all category URLs per locale, merged with content-entry URLs.

- [ ] **Step 3: Verify hreflang on new pages**

Run: `pnpm dev`; visit `/medical-tests/`, view source, grep for `hreflang="pl"` linking to `/pl/badania/`. Repeat for a category page and a test page.

- [ ] **Step 4: Commit**

```bash
git add src/pages/sitemap-*.xml.ts
git commit -m "fix(seo): include pillar + category routes in per-locale sitemaps

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 10 — E2E tests

### Task 24: Playwright — pillar smoke

**Files:**
- Create: `tests/e2e/pillar.spec.ts`

- [ ] **Step 1: Write**

```ts
import { test, expect } from '@playwright/test';

test.describe('Pillar pages', () => {
  test('EN pillar renders with categories + search box', async ({ page }) => {
    await page.goto('/medical-tests/');
    await expect(page.locator('h1')).toContainText(/medical tests/i);
    await expect(page.locator('#pillar-search')).toBeVisible();
    expect(await page.locator('section[id]').count()).toBeGreaterThanOrEqual(5);
  });

  test('PL pillar renders with categories + search box', async ({ page }) => {
    await page.goto('/pl/badania/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#pillar-search')).toBeVisible();
  });
});
```

- [ ] **Step 2: Run**

Run: `pnpm test:e2e -- pillar`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/pillar.spec.ts
git commit -m "test(e2e): pillar page smoke for EN + PL

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 25: Playwright — search smoke

**Files:**
- Create: `tests/e2e/search.spec.ts`

- [ ] **Step 1: Write**

```ts
import { test, expect } from '@playwright/test';

test.describe('Pillar search', () => {
  test('EN search "blood" returns ≥ 1 result', async ({ page }) => {
    await page.goto('/medical-tests/');
    await page.waitForSelector('.pagefind-ui__search-input', { timeout: 5000 });
    await page.fill('.pagefind-ui__search-input', 'blood');
    await page.waitForSelector('.pagefind-ui__result', { timeout: 5000 });
    expect(await page.locator('.pagefind-ui__result').count()).toBeGreaterThanOrEqual(1);
  });

  test('PL search "morfologia" returns ≥ 1 result', async ({ page }) => {
    await page.goto('/pl/badania/');
    await page.waitForSelector('.pagefind-ui__search-input', { timeout: 5000 });
    await page.fill('.pagefind-ui__search-input', 'morfologia');
    await page.waitForSelector('.pagefind-ui__result', { timeout: 5000 });
    expect(await page.locator('.pagefind-ui__result').count()).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run against built preview**

Pagefind only works in built output, so configure playwright's `webServer` to use `pnpm build && pnpm preview` (not `pnpm dev`) for this spec.

Run: `pnpm test:e2e -- search`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/search.spec.ts
git commit -m "test(e2e): pillar search smoke (EN + PL)"
```

---

### Task 26: Playwright — navigation smoke

**Files:**
- Create: `tests/e2e/navigation.spec.ts`

- [ ] **Step 1: Write**

```ts
import { test, expect } from '@playwright/test';

test('pillar → category → test navigation path', async ({ page }) => {
  await page.goto('/medical-tests/');
  const catLink = page.locator('a[href^="/medical-tests/"][href$="/"]').nth(1);
  await catLink.click();
  await expect(page).toHaveURL(/\/medical-tests\/[^\/]+\/$/);
  const testLink = page.locator('main a[href^="/medical-tests/"][href$="/"]').first();
  await testLink.click();
  await expect(page).toHaveURL(/\/medical-tests\/[^\/]+\/$/);
  await expect(page.locator('h1')).toBeVisible();
});
```

- [ ] **Step 2: Run**

Run: `pnpm test:e2e -- navigation`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/navigation.spec.ts
git commit -m "test(e2e): pillar→category→test navigation path"
```

---

### Task 27: Playwright — hreflang parity

**Files:**
- Create: `tests/e2e/hreflang-pillar.spec.ts`

- [ ] **Step 1: Write**

```ts
import { test, expect } from '@playwright/test';

test.describe('hreflang parity (S1 routes)', () => {
  test('pillar alternates cross-link and return 200', async ({ page, request }) => {
    await page.goto('/medical-tests/');
    const pl = await page.locator('link[rel="alternate"][hreflang="pl"]').getAttribute('href');
    expect(pl).toBeTruthy();
    const r = await request.get(pl!);
    expect(r.status()).toBe(200);
  });

  test('category page cross-links match the matching category key', async ({ page, request }) => {
    await page.goto('/medical-tests/hematology/');
    const pl = await page.locator('link[rel="alternate"][hreflang="pl"]').getAttribute('href');
    expect(pl).toMatch(/\/pl\/badania\/hematologia\/?$/);
    const r = await request.get(pl!);
    expect(r.status()).toBe(200);
  });
});
```

- [ ] **Step 2: Run + commit**

Run: `pnpm test:e2e -- hreflang-pillar`
Expected: PASS.

```bash
git add tests/e2e/hreflang-pillar.spec.ts
git commit -m "test(e2e): hreflang parity on pillar + category routes"
```

---

## Phase 11 — CI + validators

### Task 28: Extend Lighthouse config

**Files:**
- Modify: `lighthouserc.cjs`

- [ ] **Step 1: Add routes**

```js
// lighthouserc.cjs — additive
ci: {
  collect: {
    url: [
      'http://localhost:4321/',
      'http://localhost:4321/medical-tests/complete-blood-count-cbc/',
      // NEW S1:
      'http://localhost:4321/medical-tests/',
      'http://localhost:4321/pl/badania/',
      'http://localhost:4321/medical-tests/hematology/',
      'http://localhost:4321/pl/badania/hematologia/',
    ],
  },
  // assertions unchanged: SEO ≥ 90, Perf ≥ 85
},
```

- [ ] **Step 2: Run**

Run: `pnpm build && pnpm preview &` then `pnpm lhci autorun`
Expected: all routes meet gates. If pillar Perf < 85, switch Pagefind UI to load-on-first-interaction (lazy load) — already parameterized behind the `useEffect` in `PillarSearch.tsx`.

- [ ] **Step 3: Commit**

```bash
git add lighthouserc.cjs
git commit -m "ci(lighthouse): include S1 pillar + category routes in perf gate"
```

---

### Task 29: Extend JSON-LD validator

**Files:**
- Modify: `scripts/validate-jsonld.ts`

- [ ] **Step 1: Add checks**

Extend the script to validate `CollectionPage` + `ItemList` on pillar + one category route per locale. Existing validator already handles `MedicalWebPage` + `BreadcrumbList`.

- [ ] **Step 2: Run**

Run: `pnpm validate:jsonld`
Expected: all routes + types pass.

- [ ] **Step 3: Commit**

```bash
git add scripts/validate-jsonld.ts
git commit -m "ci(jsonld): validate CollectionPage + ItemList on pillar + category"
```

---

### Task 30: Extend i18n coverage + add reconcile-drift check

**Files:**
- Modify: `scripts/validate-i18n-coverage.ts`
- Create: `scripts/validate-reconcile-drift.ts`
- Modify: `.github/workflows/*.yml`

- [ ] **Step 1: Extend i18n coverage**

Add pillar + category routes to the coverage map (each EN page must have a PL counterpart).

- [ ] **Step 2: Add reconcile-drift script**

Create `scripts/validate-reconcile-drift.ts`:

```ts
#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { runImport } from './import-medical-tests';

// Re-run importer in a temp output dir, compare to committed state.
// If drift detected: print a warning and exit 0 (soft gate).
```

For simplicity, the check can just run `pnpm import:tests` then `git status --short` — if any `src/content/medical-tests/` or `content-sources/medical-tests-reconcile.xlsx` paths appear, print warning.

- [ ] **Step 3: Wire into CI**

Add a step to the existing workflow:

```yaml
- name: Check reconcile drift
  run: pnpm exec tsx scripts/validate-reconcile-drift.ts
  continue-on-error: true
```

- [ ] **Step 4: Commit**

```bash
git add scripts/validate-i18n-coverage.ts scripts/validate-reconcile-drift.ts .github/workflows/*.yml
git commit -m "ci: extend i18n coverage + add reconcile-drift soft gate"
```

---

## Phase 12 — Ship

### Task 31: Update README + CHANGELOG

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: README — update S1 status to "Shipped"**

In the decomposition table, change S1 row from "Not started" to "✅ Shipped — <count>/<count> tests × EN+PL · tagged `v0.2.0` · golden-path verified" and link the spec + plan.

Add a short "What shipped in S1" section mirroring the S0 one.

- [ ] **Step 2: CHANGELOG — add S1 entry**

Add a top entry `## YYYY-MM-DD — S1 Content Platform shipped · v0.2.0` with bullets covering: test counts per locale, pillar + category routes, Pagefind search, RelatedContent, reconciliation workbook state.

- [ ] **Step 3: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: mark S1 shipped · v0.2.0 · update README + CHANGELOG"
```

---

### Task 32: Golden-path verification on production (MANUAL)

Owner: Blazej + implementing agent together (agent runs commands, Blazej reviews visual + Lighthouse in browser).

- [ ] **Step 1: Push to main, trigger CF deploy**

```bash
git push origin main
```

Wait for CF Workers Build → verify deploy green.

- [ ] **Step 2: Run the 12-point checklist against `https://symptomatik.com`**

From the spec's "Pre-merge golden-path for S1":

1. `/medical-tests/` → 200, Lighthouse SEO ≥ 90 / Perf ≥ 85
2. `/pl/badania/` → 200, same
3. Sample category page (e.g., `/medical-tests/hematology/`) → 200
4. PL equivalent → 200
5. 5 random non-CBC tests × 2 locales → 200
6. Pillar search returns ≥ 1 result for "blood" (EN) and "morfologia" (PL)
7. JSON-LD validates on pillar, category, 3 random tests (EN + PL)
8. hreflang correct on pillar + category + tests
9. Sitemaps include new URLs
10. Reconciliation workbook committed
11. `src/i18n/categories.ts` exists (no `.tmpl`); drift check passes
12. CI green on `main`

Run: `curl -sI https://symptomatik.com/medical-tests/ | head -1` etc. for the 200 checks. Lighthouse: use Chrome DevTools or `pnpm lhci autorun` against prod.

- [ ] **Step 3: Tag release**

```bash
git tag -a v0.2.0 -m "S1 Content Platform shipped"
git push origin v0.2.0
```

- [ ] **Step 4: Save project-state memory + close S1**

Save a memory entry recording S1 shipped + next candidate is S2 (AI routing layer).

---

## Open follow-ups (post-S1)

- Blazej corrects source Excel using the reconciliation workbook → rerun `pnpm import:tests` → follow-up PR publishes the remaining tests.
- Embedding-based RelatedContent (the "D" option from brainstorming) — drop-in replacement for `selectRelated` using an embeddings index generated at build time. Lives in S2 or a later iteration.
- Mobile hamburger menu — still deferred; revisit when S3+ provides real app-page targets for the remaining header links.
- Site-wide search — if Pagefind proves valuable on the pillar, consider promoting it to header search in a later sub-project.

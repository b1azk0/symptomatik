#!/usr/bin/env tsx
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ────────────────────────────────────────────────────────────────────────────
// slugify
// ────────────────────────────────────────────────────────────────────────────

const PL_DIACRITICS: Record<string, string> = {
  ą: 'a', Ą: 'a', ć: 'c', Ć: 'c', ę: 'e', Ę: 'e',
  ł: 'l', Ł: 'l', ń: 'n', Ń: 'n', ó: 'o', Ó: 'o',
  ś: 's', Ś: 's', ź: 'z', Ź: 'z', ż: 'z', Ż: 'z',
};

/**
 * Truncate `s` to `max` chars. If truncation occurs, append `…` (U+2026, 1 char)
 * so the max is always respected and truncation is user-visible.
 */
export function truncateWithEllipsis(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export function slugify(input: string): string {
  if (!input) return '';
  let s = input;
  for (const [from, to] of Object.entries(PL_DIACRITICS)) {
    s = s.split(from).join(to);
  }
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ────────────────────────────────────────────────────────────────────────────
// Row types
// ────────────────────────────────────────────────────────────────────────────

type Row = Record<string, string>;

// IssueType members. `MISALIGNED` is reserved for Plan Task 2, where the
// name-similarity heuristic lands; no code path returns it in Task 1.
export type IssueType =
  | 'EMPTY'
  | 'OK'
  | 'DUPLICATE'
  | 'MISALIGNED'
  | 'MISSING_EN'
  | 'MISSING_PL';

export type IssueFlag = 'META_TOO_LONG_EN' | 'META_TOO_LONG_PL';

export interface ClassifyArgs {
  enRow: Row;
  plRow: Row;
  seenEnSlugs: Set<string>;
}

export interface ClassifyResult {
  issue: IssueType;
  flags: IssueFlag[];
  canonicalSlug: string | null;
}

const META_MAX = 160;

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
  // Fallback: any 3-char substring of one appears in the other (bidirectional).
  // 3-char threshold (vs 4) ensures shared abbreviations like "CBC" are caught.
  const SUB = 3;
  if (a.length >= SUB) {
    for (let i = 0; i <= a.length - SUB; i++) {
      if (b.includes(a.slice(i, i + SUB))) return true;
    }
  }
  if (b.length >= SUB) {
    for (let i = 0; i <= b.length - SUB; i++) {
      if (a.includes(b.slice(i, i + SUB))) return true;
    }
  }
  return false;
}

export function classifyRowPair(args: ClassifyArgs): ClassifyResult {
  const { enRow, plRow, seenEnSlugs } = args;
  const enName = (enRow['test name'] ?? '').trim();
  const plName = (plRow['nazwa testu'] ?? '').trim();

  if (!enName && !plName) return { issue: 'EMPTY', flags: [], canonicalSlug: null };
  if (!enName) return { issue: 'MISSING_EN', flags: [], canonicalSlug: null };
  if (!plName) return { issue: 'MISSING_PL', flags: [], canonicalSlug: slugify(enName) };

  const slug = slugify(enName);
  if (seenEnSlugs.has(slug)) {
    return { issue: 'DUPLICATE', flags: [], canonicalSlug: slug };
  }

  const flags: IssueFlag[] = [];
  if ((enRow['meta description'] ?? '').length > META_MAX) flags.push('META_TOO_LONG_EN');
  if ((plRow['meta description'] ?? '').length > META_MAX) flags.push('META_TOO_LONG_PL');

  if (!namesLikelyAligned(enName, plName)) {
    return { issue: 'MISALIGNED', flags, canonicalSlug: slug };
  }

  return { issue: 'OK', flags, canonicalSlug: slug };
}

export interface Frontmatter {
  slug: string;
  canonicalSlug: string;
  lang: 'en' | 'pl' | 'es';
  title: string;
  titleAlt?: string;
  category: string;
  categorySlug: string;
  aiUseCase: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  h1Text: string;
  sections: { heading: string; body: string }[];
  publishedAt: string;
  updatedAt: string;
}

export interface RowToFrontmatterOpts {
  lang: 'en' | 'pl' | 'es';
  canonicalSlug: string;
  today: Date;
  preservePublishedAt?: string;
}

const EN_COL_MAP: Record<string, string> = {
  testName: 'test name',
  testNameAlt: 'test name ii',
  category: 'category',
  aiUseCase: 'ai use-case',
  metaTitle: 'meta title',
  metaDescription: 'meta description',
  h1: 'h1 title',
  h1Text: 'h1_text',
  h2_1: 'h2_1',
  h2_1_text: 'h2_1_text',
  h2_2: 'h2_2',
  h2_2_text: 'h2_2_text',
  h2_3: 'h2_3',
  h2_3_text: 'h2_3_text',
  h2_4: 'h2_4',
  h2_4_text: 'h2_4_text',
  h2_5: 'h2_5',
  h2_5_text: 'h2_5_text',
};

const PL_COL_MAP: Record<string, string> = {
  testName: 'nazwa testu',
  testNameAlt: 'nazwa testu ii',
  category: 'kategoria',
  aiUseCase: 'ai use-case',
  metaTitle: 'meta title',
  metaDescription: 'meta description',
  h1: 'h1 title',
  h1Text: 'h1_text',
  h2_1: 'h2_1',
  h2_1_text: 'h2_1_text',
  h2_2: 'h2_2',
  h2_2_text: 'h2_2_text',
  h2_3: 'h2_3',
  h2_3_text: 'h2_3_text',
  h2_4: 'h2_4',
  h2_4_text: 'h2_4_text',
  h2_5: 'h2_5',
  h2_5_text: 'h2_5_text',
};

function colMap(lang: 'en' | 'pl' | 'es'): Record<string, string> {
  if (lang === 'pl') return PL_COL_MAP;
  return EN_COL_MAP;
}

export function rowToFrontmatter(row: Row, opts: RowToFrontmatterOpts): Frontmatter {
  const m = colMap(opts.lang);
  const testName = row[m['testName'] ?? '']?.trim() ?? '';
  const category = row[m['category'] ?? '']?.trim() ?? '';

  const slug = opts.lang === 'en' ? opts.canonicalSlug : slugify(testName);
  const metaTitleRaw = (row[m['metaTitle'] ?? ''] ?? '').trim();
  const metaDescriptionRaw = (row[m['metaDescription'] ?? ''] ?? '').trim();

  // Meta tag limits: Google truncates metaTitle at ~60 chars and metaDescription
  // at ~160 chars in SERPs anyway. Rather than reject overlong values (which
  // would drop whole rows from the import), we truncate to the limit and let
  // main() log a warning so the content team can fix the source at leisure.
  const metaTitle = truncateWithEllipsis(metaTitleRaw, 60);
  const metaDescription = truncateWithEllipsis(metaDescriptionRaw, 160);

  const sections: { heading: string; body: string }[] = [];
  for (let i = 1; i <= 5; i++) {
    const headingKey = `h2_${i}`;
    const bodyKey = `h2_${i}_text`;
    const colHeading = m[headingKey] ?? headingKey;
    const colBody = m[bodyKey] ?? bodyKey;
    const heading = (row[colHeading] ?? '').trim();
    const body = (row[colBody] ?? '').trim();
    if (!heading || !body) {
      throw new Error(`Missing H2_${i} or H2_${i}_text for "${testName}" (${opts.lang})`);
    }
    sections.push({ heading, body });
  }

  const today = opts.today.toISOString().slice(0, 10);
  const titleAlt = row[m['testNameAlt'] ?? '']?.trim() || undefined;
  return {
    slug,
    canonicalSlug: opts.canonicalSlug,
    lang: opts.lang,
    title: testName,
    ...(titleAlt !== undefined ? { titleAlt } : {}),
    category,
    categorySlug: slugify(category),
    aiUseCase: (row[m['aiUseCase'] ?? ''] ?? '').trim(),
    metaTitle,
    metaDescription,
    h1: (row[m['h1'] ?? ''] ?? '').trim(),
    h1Text: (row[m['h1Text'] ?? ''] ?? '').trim(),
    sections,
    publishedAt: opts.preservePublishedAt ?? today,
    updatedAt: today,
  };
}

export function renderMdx(fm: Frontmatter): string {
  const lines: string[] = [
    '---',
    `slug: ${fm.slug}`,
    `canonicalSlug: ${fm.canonicalSlug}`,
    `lang: ${fm.lang}`,
    `title: ${JSON.stringify(fm.title)}`,
  ];

  if (fm.titleAlt !== undefined) {
    lines.push(`titleAlt: ${JSON.stringify(fm.titleAlt)}`);
  }

  lines.push(
    `category: ${JSON.stringify(fm.category)}`,
    `categorySlug: ${JSON.stringify(fm.categorySlug)}`,
    `aiUseCase: ${JSON.stringify(fm.aiUseCase)}`,
    `metaTitle: ${JSON.stringify(fm.metaTitle)}`,
    `metaDescription: ${JSON.stringify(fm.metaDescription)}`,
    `h1: ${JSON.stringify(fm.h1)}`,
    `h1Text: ${JSON.stringify(fm.h1Text)}`,
    'sections:',
    ...fm.sections.flatMap((s) => [
      `  - heading: ${JSON.stringify(s.heading)}`,
      `    body: ${JSON.stringify(s.body)}`,
    ]),
    `publishedAt: ${fm.publishedAt}`,
    `updatedAt: ${fm.updatedAt}`,
    '---',
    '',
    '{/* auto-generated from frontmatter — body content is rendered via `sections` field */}',
    '',
  );

  return lines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Reconciliation workbook
// ────────────────────────────────────────────────────────────────────────────

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
  EMPTY: '',
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

// ────────────────────────────────────────────────────────────────────────────
// Workbook reading
// ────────────────────────────────────────────────────────────────────────────

async function readSheet(excelPath: string, sheetName: string): Promise<Row[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(excelPath);
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`Sheet "${sheetName}" not found in ${excelPath}`);

  const headers: string[] = [];
  const rows: Row[] = [];
  ws.eachRow({ includeEmpty: false }, (excelRow, rowNumber) => {
    // exceljs row.values is 1-indexed; index 0 is always null
    const values = (excelRow.values as unknown as (string | undefined)[]).slice(1);
    if (rowNumber === 1) {
      for (const v of values) headers.push(String(v ?? '').trim().toLowerCase());
      return;
    }
    const row: Row = {};
    values.forEach((v, idx) => {
      const key = headers[idx];
      if (key) row[key] = String(v ?? '');
    });
    if (Object.values(row).some((v) => v.trim() !== '')) rows.push(row);
  });

  return rows;
}

const SHEET_BY_LANG: Record<string, string> = {
  en: 'EN - SEO optimized',
  pl: 'PL - original',
};

// ────────────────────────────────────────────────────────────────────────────
// CLI
// ────────────────────────────────────────────────────────────────────────────

interface CLIOpts {
  excel: string;
  out: string;
  dryRun: boolean;
  onlySlug: string | null;
}

function parseArgs(argv: string[]): CLIOpts {
  const opts: CLIOpts = {
    excel: path.join(repoRoot, 'content-sources/medical-tests.xlsx'),
    out: path.join(repoRoot, 'src/content/medical-tests'),
    dryRun: false,
    onlySlug: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--excel') opts.excel = argv[++i] ?? opts.excel;
    else if (a === '--locales') {
      console.warn('[WARN] --locales is no longer supported; runImport always processes EN + PL together. Ignoring.');
      i++; // skip the value argument
    }
    else if (a === '--out') opts.out = argv[++i] ?? opts.out;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--only') opts.onlySlug = argv[++i] ?? null;
  }
  return opts;
}

function extractExistingPublishedAt(filePath: string): string | undefined {
  if (!existsSync(filePath)) return undefined;
  const content = readFileSync(filePath, 'utf8');
  const m = content.match(/^publishedAt:\s*([\d-]+)\s*$/m);
  return m?.[1];
}

// ────────────────────────────────────────────────────────────────────────────
// runImport — exported core logic, callable from tests and from main()
// ────────────────────────────────────────────────────────────────────────────

export interface RunImportArgs {
  enRows?: Row[];
  plRows?: Row[];
  excel?: string;
  outputDir?: string;
  dryRun?: boolean;
  today?: Date;
  onlySlug?: string | null;
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
  written: { en: string[]; pl: string[] };
  skipped: SkippedEntry[];
  categoriesSeen: Array<{ key: string; labelEn: string; labelPl: string }>;
}

async function writeTestMdx(fm: Frontmatter, outputDir: string): Promise<void> {
  const outDir = path.join(outputDir, fm.lang);
  const outFile = path.join(outDir, `${fm.slug}.mdx`);
  const existingPublishedAt = extractExistingPublishedAt(outFile);
  const fmWithPreserved = existingPublishedAt ? { ...fm, publishedAt: existingPublishedAt } : fm;
  await mkdir(outDir, { recursive: true });
  await writeFile(outFile, renderMdx(fmWithPreserved), 'utf8');
}

export async function runImport(args: RunImportArgs): Promise<RunImportResult> {
  const enRows =
    args.enRows ?? (args.excel ? await readSheet(args.excel, SHEET_BY_LANG['en'] ?? 'EN - SEO optimized') : []);
  const plRows =
    args.plRows ?? (args.excel ? await readSheet(args.excel, SHEET_BY_LANG['pl'] ?? 'PL - original') : []);
  const today = args.today ?? new Date();
  const outputDir = args.outputDir ?? path.join(repoRoot, 'src/content/medical-tests');

  const written = { en: [] as string[], pl: [] as string[] };
  const skipped: SkippedEntry[] = [];
  const categoriesSeen = new Map<string, { labelEn: string; labelPl: string }>();
  const seenEnSlugs = new Set<string>();

  const rowLimit = Math.max(enRows.length, plRows.length);
  for (let i = 0; i < rowLimit; i++) {
    const enRow = enRows[i] ?? {};
    const plRow = plRows[i] ?? {};
    const cls = classifyRowPair({ enRow, plRow, seenEnSlugs });

    if (cls.issue === 'EMPTY') continue; // silently skip trailing blanks

    if (cls.issue === 'OK' && cls.canonicalSlug) {
      seenEnSlugs.add(cls.canonicalSlug);

      // Track category from the OK row (EN side is the source of truth for category key).
      // Done before the onlySlug guard so categoriesSeen reflects the full dataset.
      const categoryEn = (enRow['category'] ?? '').trim();
      const categoryPl = (plRow['kategoria'] ?? '').trim();
      if (categoryEn) {
        const key = slugify(categoryEn);
        if (!categoriesSeen.has(key))
          categoriesSeen.set(key, { labelEn: categoryEn, labelPl: categoryPl });
      }

      if (args.onlySlug && cls.canonicalSlug !== args.onlySlug) continue;

      // Build frontmatter per locale, write MDX (or skip in dryRun).
      try {
        const enFm = rowToFrontmatter(enRow, { lang: 'en', canonicalSlug: cls.canonicalSlug, today });
        const plFm = rowToFrontmatter(plRow, { lang: 'pl', canonicalSlug: cls.canonicalSlug, today });
        if (!args.dryRun) {
          await writeTestMdx(enFm, outputDir);
          await writeTestMdx(plFm, outputDir);
        }
        written.en.push(cls.canonicalSlug);
        written.pl.push(cls.canonicalSlug);
      } catch (err) {
        console.warn(`[WARN] Row ${i + 2}: ${(err as Error).message} — skipping`);
      }
      continue;
    }

    // Non-OK (and non-EMPTY): route to reconciliation.
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

  if (!args.dryRun) {
    const reconcilePath = path.join(repoRoot, 'content-sources', 'medical-tests-reconcile.xlsx');
    await writeReconcileWorkbook(buildReconcileRows(skipped), reconcilePath);
    console.log(`wrote reconciliation workbook (${skipped.length} rows) to ${reconcilePath}`);
  }

  return {
    written,
    skipped,
    categoriesSeen: Array.from(categoriesSeen, ([key, v]) => ({ key, ...v })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// main — CLI entry point
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  const result = await runImport({
    excel: opts.excel,
    outputDir: opts.out,
    dryRun: opts.dryRun,
    onlySlug: opts.onlySlug,
  });

  const totalWritten = result.written.en.length;
  const totalSkipped = result.skipped.length;

  if (opts.dryRun) {
    console.log(`\n[dry-run] would write ${totalWritten * 2} file(s) (${totalWritten} tests × 2 locales).`);
  } else {
    console.log(`\nwrote ${totalWritten * 2} file(s) (${totalWritten} tests × 2 locales).`);
  }

  if (totalSkipped > 0) {
    console.log(`skipped ${totalSkipped} row(s):`);
    for (const s of result.skipped) {
      console.log(
        `  [${s.issue}] row ${s.enRowIndex}: EN="${s.enName}" PL="${s.plName}"` +
          (s.flags.length ? ` flags=${s.flags.join(',')}` : ''),
      );
    }
  }

  if (result.categoriesSeen.length > 0) {
    console.log(`\ncategories seen: ${result.categoriesSeen.map((c) => c.key).join(', ')}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

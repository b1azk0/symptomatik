#!/usr/bin/env tsx
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { EN_TO_PL_TEST_ALIAS, PL_TO_EN_TEST_ALIAS } from './test-aliases';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// ────────────────────────────────────────────────────────────────────────────
// Category label → key resolution
//
// xlsx category cells use a mix of EN labels (Hematology, Liver, …) and PL
// labels (Hematologia, Wątroba, …) and a few labels that only appear on one
// side or are too small to warrant their own taxonomy entry. This table
// resolves any of them to a canonical key that exists in
// `src/i18n/categories.ts`.
// ────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABEL_TO_KEY: Record<string, string> = {
  // EN labels
  'Hematology': 'hematology',
  'Metabolism': 'metabolism',
  'Hormonal': 'hormonal',
  'Endocrinology': 'hormonal',          // 3 source rows, fold into hormonal
  'Inflammatory': 'inflammatory',
  'Inflammation': 'inflammatory',       // 1 source row, normalize
  'Cardiometabolic': 'cardiometabolic',
  'Liver': 'liver',
  'Urine': 'urine',
  'Gastro': 'gastro',
  'Heart': 'heart',
  'Oncology': 'oncology',
  'Autoimmunology': 'autoimmunology',
  'Mental Health': 'mental-health',
  'Infections': 'infections',
  'Coagulation': 'coagulation',
  'Immunology': 'immunology',
  // PL labels
  'Hematologia': 'hematology',
  'Metabolizm': 'metabolism',
  'Hormonalne': 'hormonal',
  'Zapalny': 'inflammatory',
  'Kardiometaboliczne': 'cardiometabolic',
  'Wątroba': 'liver',
  'Mocz': 'urine',
  'Onkologia': 'oncology',
  'Autoimmunologia': 'autoimmunology',
  'Zdrowie Psychiczne': 'mental-health',
  'Infekcje': 'infections',
  'Krzepnięcie': 'coagulation',
  'Immunologia': 'immunology',
  'Mięśnie': 'cardiometabolic',          // 1 PL row (CK), fold into cardiometabolic
  'Genetyka': 'metabolism',              // 1 PL row (SNP/MTHFR), fold into metabolism
  'Toksyny': 'metabolism',               // 1 PL row (BPA), fold into metabolism
  'Nerki': 'kidneys',
  'Serce': 'heart',
};

function lookupCategoryKey(rawLabel: string): string {
  const trimmed = rawLabel.trim();
  if (!trimmed) return '';
  const k = CATEGORY_LABEL_TO_KEY[trimmed];
  if (k) return k;
  // Fallback: slugify and hope it's a known key. The drift guard later
  // surfaces any unmapped value so we fail loudly rather than silently.
  return slugify(trimmed);
}

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

// Common Polish/medical noun endings that frequently appear across unrelated
// terms. Excluded from the substring fallback so e.g. "Zonulina" doesn't get
// matched to "Lipoproteina" purely on the shared "-ina" suffix.
const SUBSTRING_NOISE = new Set(['ina', 'yna', 'oza', 'owy', 'owa', 'ego']);

// Match a leading uppercase acronym like "AUDIT", "PHQ-9", "DASS-21",
// "ASRS v1.1", "K10", "CA 19-9". Requires at least 2 leading uppercase chars
// (first char A-Z, second char A-Z/digit/dash) so single-letter starts like
// "Cortisol" / "Insulin" / "Estradiol" don't qualify.
const ACRONYM_LEAD = /^([A-Z][A-Z0-9-]+(?:\s+v?\d+(?:\.\d+)?)?)/;

function leadingAcronym(name: string): string | null {
  const m = name.trim().match(ACRONYM_LEAD);
  return m ? m[1].replace(/[\s-]/g, '').toUpperCase() : null;
}

function namesLikelyAligned(enName: string, plName: string): boolean {
  // Hard constraint: when BOTH names start with an acronym (e.g. PHQ-9 vs
  // DAST-10, AUDIT vs EPDS, DASS-21 vs ASRS), those acronyms must match.
  // Without this, the substring fallback below produces many false positives
  // across unrelated psychometric instruments that share generic English
  // tokens like "test", "scale", "screening", "tio", "ent", etc.
  const enAbbr = leadingAcronym(enName);
  const plAbbr = leadingAcronym(plName);
  if (enAbbr && plAbbr) return enAbbr === plAbbr;

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
      const sub = a.slice(i, i + SUB);
      if (SUBSTRING_NOISE.has(sub)) continue;
      if (b.includes(sub)) return true;
    }
  }
  if (b.length >= SUB) {
    for (let i = 0; i <= b.length - SUB; i++) {
      const sub = b.slice(i, i + SUB);
      if (SUBSTRING_NOISE.has(sub)) continue;
      if (a.includes(sub)) return true;
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
  /** Canonical EN category key (e.g. 'hematology'). Overrides slugify(category) so that
   *  PL frontmatter always writes the EN key, not a Polish slug. */
  canonicalCategoryKey?: string;
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
    categorySlug: opts.canonicalCategoryKey ?? slugify(category),
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
// categories.ts.tmpl generation + drift guard
// ────────────────────────────────────────────────────────────────────────────

export function renderCategoriesTmpl(
  categories: Array<{ key: string; labelEn: string; labelPl: string }>,
): string {
  const sorted = [...categories].sort((a, b) => a.key.localeCompare(b.key));
  const body = sorted.map((c) => {
    const plSlug = slugify(c.labelPl || c.labelEn);
    return `  '${c.key}': {
    en: { slug: '${c.key}', label: '${escapeSingle(c.labelEn)}' },
    pl: { slug: '${plSlug}', label: '${escapeSingle(c.labelPl || c.labelEn)}' },
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

function escapeSingle(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function extractCategoryKeys(source: string): Set<string> {
  // Find the categoryMeta object literal and extract keys via a simple regex.
  // Matches only top-level keys: exactly 2-space indent, `key: {` with `{` at end of line.
  // This excludes nested lines like `    en: { slug: '...', label: '...' },`
  // which have 4-space indent and more content after `{`.
  const match = source.match(/export const categoryMeta\s*=\s*{([\s\S]*?)}\s*as const/);
  if (!match) return new Set();
  const body = match[1] ?? '';
  const keys = new Set<string>();
  for (const m of body.matchAll(/^  '?([a-zA-Z_][a-zA-Z0-9_-]*)'?:\s*\{$/gm)) {
    if (m[1]) keys.add(m[1]);
  }
  return keys;
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

  // ── Pass 1: index EN rows by name + category-key by EN test name.
  // Each EN test name resolves to a canonical category key — PL rows that
  // alias to an EN test inherit that key; PL-only rows resolve their own.
  const enRowByName = new Map<string, Row>();
  const enCategoryKeyByName = new Map<string, string>();
  for (const r of enRows) {
    const name = (r['test name'] ?? '').trim();
    if (!name) continue;
    if (!enRowByName.has(name)) enRowByName.set(name, r);
    const catLabel = (r['category'] ?? '').trim();
    if (catLabel) enCategoryKeyByName.set(name, lookupCategoryKey(catLabel));
  }

  // ── Pass 2: write EN MDX. Each EN row generates en/<slug>.mdx with
  // canonicalSlug = its own slug. Duplicates by slug skip silently after the
  // first occurrence (and surface in the reconcile workbook).
  const writtenEnSlugs = new Set<string>();
  for (let i = 0; i < enRows.length; i++) {
    const enRow = enRows[i];
    const enName = (enRow['test name'] ?? '').trim();
    if (!enName) continue;

    const slug = slugify(enName);
    if (writtenEnSlugs.has(slug)) {
      skipped.push({
        issue: 'DUPLICATE',
        flags: [],
        enRowIndex: i + 2,
        plRowIndex: 0,
        enName,
        plName: '',
        canonicalSlug: slug,
      });
      continue;
    }

    const catLabel = (enRow['category'] ?? '').trim();
    const categoryKey = lookupCategoryKey(catLabel);
    if (catLabel && categoryKey) {
      if (!categoriesSeen.has(categoryKey)) {
        const aliasedPlName = EN_TO_PL_TEST_ALIAS[enName] ?? enName;
        const plRow = plRows.find((r) => (r['nazwa testu'] ?? '').trim() === aliasedPlName);
        const labelPl = (plRow?.['kategoria'] ?? '').trim() || catLabel;
        categoriesSeen.set(categoryKey, { labelEn: catLabel, labelPl });
      }
    }

    if (args.onlySlug && slug !== args.onlySlug) continue;

    const flags: IssueFlag[] = [];
    if ((enRow['meta description'] ?? '').length > META_MAX) flags.push('META_TOO_LONG_EN');
    if (flags.length) {
      skipped.push({
        issue: 'OK',
        flags,
        enRowIndex: i + 2,
        plRowIndex: 0,
        enName,
        plName: '',
        canonicalSlug: slug,
      });
    }

    try {
      const fm = rowToFrontmatter(enRow, { lang: 'en', canonicalSlug: slug, canonicalCategoryKey: categoryKey, today });
      if (!args.dryRun) await writeTestMdx(fm, outputDir);
      written.en.push(slug);
      writtenEnSlugs.add(slug);
    } catch (err) {
      console.warn(`[WARN] EN row ${i + 2} "${enName}": ${(err as Error).message} — skipping`);
    }
  }

  // ── Pass 3: write PL MDX. Each PL row generates pl/<slug>.mdx. canonical
  // points to the EN counterpart's slug if the PL name appears in the alias
  // map (or has an EN row by exact-name match); otherwise it self-canonicals
  // (PL-only test, no cross-locale link).
  const writtenPlSlugs = new Set<string>();
  for (let i = 0; i < plRows.length; i++) {
    const plRow = plRows[i];
    const plName = (plRow['nazwa testu'] ?? '').trim();
    if (!plName) continue;

    const slug = slugify(plName);
    if (writtenPlSlugs.has(slug)) {
      skipped.push({
        issue: 'DUPLICATE',
        flags: [],
        enRowIndex: 0,
        plRowIndex: i + 2,
        enName: '',
        plName,
        canonicalSlug: slug,
      });
      continue;
    }

    // Resolve canonical: alias → EN → EN slug; else self.
    const aliasedEnName = PL_TO_EN_TEST_ALIAS[plName] ?? (enRowByName.has(plName) ? plName : null);
    const canonicalSlug = aliasedEnName ? slugify(aliasedEnName) : slug;
    // Resolve category: prefer EN counterpart's category key (so paired
    // pages stay in the same taxonomy bucket); fall back to PL's own.
    const enCategoryKey = aliasedEnName ? enCategoryKeyByName.get(aliasedEnName) : undefined;
    const plCatLabel = (plRow['kategoria'] ?? '').trim();
    const categoryKey = enCategoryKey ?? lookupCategoryKey(plCatLabel);

    if (plCatLabel && categoryKey && !categoriesSeen.has(categoryKey)) {
      // PL-only category (no EN-side row introduced this key). Use PL label
      // for both labelEn and labelPl placeholder; the drift guard will fail
      // loudly if the key isn't in categories.ts.
      categoriesSeen.set(categoryKey, { labelEn: plCatLabel, labelPl: plCatLabel });
    }

    if (args.onlySlug && canonicalSlug !== args.onlySlug) continue;

    const flags: IssueFlag[] = [];
    if ((plRow['meta description'] ?? '').length > META_MAX) flags.push('META_TOO_LONG_PL');
    if (flags.length) {
      skipped.push({
        issue: 'OK',
        flags,
        enRowIndex: 0,
        plRowIndex: i + 2,
        enName: aliasedEnName ?? '',
        plName,
        canonicalSlug,
      });
    }

    try {
      const fm = rowToFrontmatter(plRow, { lang: 'pl', canonicalSlug, canonicalCategoryKey: categoryKey, today });
      if (!args.dryRun) await writeTestMdx(fm, outputDir);
      written.pl.push(slug);
      writtenPlSlugs.add(slug);
    } catch (err) {
      console.warn(`[WARN] PL row ${i + 2} "${plName}": ${(err as Error).message} — skipping`);
    }
  }

  if (!args.dryRun) {
    const categoriesPath = path.join(repoRoot, 'src/i18n/categories.ts');
    const tmplPath = path.join(repoRoot, 'src/i18n/categories.ts.tmpl');
    const categoriesArray = Array.from(categoriesSeen, ([key, v]) => ({ key, ...v }));

    if (!existsSync(categoriesPath)) {
      // First run — emit template for Blazej to review.
      await writeFile(tmplPath, renderCategoriesTmpl(categoriesArray), 'utf8');
      console.log(`[INFO] Wrote ${tmplPath} — review PL slugs/labels, then rename to categories.ts.`);
    } else {
      // Subsequent runs — drift guard.
      // Read existing categoryMeta keys and ensure every classified category is covered.
      // If an unknown category appears, fail with a clear message (no silent URL churn).
      const existing = readFileSync(categoriesPath, 'utf8');
      const knownKeys = extractCategoryKeys(existing);
      const offenders = categoriesArray.filter((c) => !knownKeys.has(c.key));
      if (offenders.length > 0) {
        const names = offenders.map((o) => `${o.key} (${o.labelEn})`).join(', ');
        throw new Error(
          `[IMPORT ERROR] New categories detected that aren't in src/i18n/categories.ts: ${names}. ` +
            `Add entries to categoryMeta in that file, then re-run pnpm import:tests.`
        );
      }
    }

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

  const enCount = result.written.en.length;
  const plCount = result.written.pl.length;
  const totalSkipped = result.skipped.length;

  if (opts.dryRun) {
    console.log(`\n[dry-run] would write ${enCount + plCount} file(s) (${enCount} EN + ${plCount} PL).`);
  } else {
    console.log(`\nwrote ${enCount + plCount} file(s) (${enCount} EN + ${plCount} PL).`);
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

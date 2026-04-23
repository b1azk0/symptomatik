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
  locales: string[];
  out: string;
  dryRun: boolean;
  onlySlug: string | null;
}

function parseArgs(argv: string[]): CLIOpts {
  const opts: CLIOpts = {
    excel: path.join(repoRoot, 'content-sources/medical-tests.xlsx'),
    locales: ['en', 'pl'],
    out: path.join(repoRoot, 'src/content/medical-tests'),
    dryRun: false,
    onlySlug: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--excel') opts.excel = argv[++i] ?? opts.excel;
    else if (a === '--locales') opts.locales = (argv[++i] ?? 'en,pl').split(',');
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

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const today = new Date();
  let planned = 0;

  // Pre-read EN sheet to build the row-index → canonicalSlug map.
  // All locale sheets are assumed to be row-aligned with the EN sheet.
  const enRows = await readSheet(opts.excel, SHEET_BY_LANG['en'] ?? 'EN - SEO optimized');
  const canonicalByIndex = new Map<number, string>();
  const seen = new Map<string, string>();

  enRows.forEach((row, idx) => {
    const name = row['test name']?.trim() ?? '';
    if (!name) return;
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix = 2;
    while (seen.has(slug)) {
      // Warn on first collision only; then append numeric suffix to disambiguate
      if (suffix === 2) {
        const collider = seen.get(baseSlug) ?? seen.get(slug);
        console.warn(
          `[WARN] Slug collision in EN sheet: "${collider}" and "${name}" both → "${baseSlug}". ` +
            `Disambiguating "${name}" as "${baseSlug}-${suffix}".`,
        );
      }
      slug = `${baseSlug}-${suffix++}`;
    }
    seen.set(slug, name);
    canonicalByIndex.set(idx, slug);
  });

  for (const lang of opts.locales) {
    if (lang !== 'en' && lang !== 'pl' && lang !== 'es') {
      throw new Error(`Unsupported locale: ${lang}`);
    }
    const sheetName = SHEET_BY_LANG[lang];
    if (!sheetName) throw new Error(`No sheet mapping for locale "${lang}"`);

    const rows = lang === 'en' ? enRows : await readSheet(opts.excel, sheetName);

    if (rows.length !== enRows.length) {
      console.warn(
        `[WARN] Row count mismatch: ${lang} sheet has ${rows.length} rows but EN sheet has ${enRows.length}. ` +
          `Will process only the first ${Math.min(rows.length, enRows.length)} rows. ` +
          `Fix the Excel if full alignment is needed.`,
      );
    }

    const rowLimit = Math.min(rows.length, enRows.length);
    for (let i = 0; i < rowLimit; i++) {
      const row = rows[i];
      if (!row) continue;
      const m = colMap(lang);
      const testName = row[m['testName'] ?? '']?.trim() ?? '';
      if (!testName) continue;

      const canonicalSlug = canonicalByIndex.get(i);
      if (!canonicalSlug) {
        throw new Error(
          `Row ${i + 2} has no canonicalSlug (EN row empty at same index). Fix the EN sheet.`,
        );
      }

      if (opts.onlySlug && canonicalSlug !== opts.onlySlug) continue;

      const outDir = path.join(opts.out, lang);
      const slug = lang === 'en' ? canonicalSlug : slugify(testName);
      const outFile = path.join(outDir, `${slug}.mdx`);
      const existingPublishedAt = extractExistingPublishedAt(outFile);

      let fm;
      try {
        fm = rowToFrontmatter(row, {
          lang,
          canonicalSlug,
          today,
          ...(existingPublishedAt !== undefined ? { preservePublishedAt: existingPublishedAt } : {}),
        });
      } catch (err) {
        console.warn(`[WARN] Row ${i + 2} (${lang}): ${(err as Error).message} — skipping`);
        continue;
      }

      const mdx = renderMdx(fm);

      if (opts.dryRun) {
        console.log(`[dry-run] would write ${outFile} (${mdx.length} bytes)`);
      } else {
        await mkdir(outDir, { recursive: true });
        await writeFile(outFile, mdx, 'utf8');
        console.log(`wrote ${outFile}`);
      }
      planned++;
    }
  }

  console.log(`\n${opts.dryRun ? 'planned' : 'wrote'} ${planned} file(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

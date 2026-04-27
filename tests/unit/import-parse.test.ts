import { describe, it, expect } from 'vitest';
import { rowToFrontmatter, renderMdx, classifyRowPair, runImport, buildReconcileRows, renderCategoriesTmpl, extractCategoryKeys } from '../../scripts/import-medical-tests';
import type { IssueType } from '../../scripts/import-medical-tests';

const enRow = {
  'test name': 'Complete Blood Count (CBC)',
  'test name ii': 'Complete Blood Count (CBC)',
  'category': 'Hematology',
  'ai use-case': 'Anemia, infections, inflammatory patterns',
  'meta title': 'Complete Blood Count (CBC) - Results & Ranges',
  'meta description': 'Get your CBC results interpreted instantly. Understand normal ranges.',
  'h1 title': 'Complete Blood Count (CBC): Normal Ranges, Results & Interpretation',
  'h1_text': 'A Complete Blood Count (CBC) is a common blood test...',
  'h2_1': 'Online CBC Results Interpretation',
  'h2_1_text': 'Accessing CBC results online...',
  'h2_2': 'What Is CBC and How to Read the Results?',
  'h2_2_text': 'A CBC is a routine blood test...',
  'h2_3': 'When to Get a CBC Test',
  'h2_3_text': 'Get a CBC when you have symptoms...',
  'h2_4': 'Normal CBC Values by Age and Gender',
  'h2_4_text': 'Normal CBC values vary...',
  'h2_5': 'CBC: Indications, Preparation, Procedure & Side Effects',
  'h2_5_text': 'A CBC is a quick, commonly ordered blood test...',
};

describe('rowToFrontmatter', () => {
  it('produces canonical EN frontmatter', () => {
    const fm = rowToFrontmatter(enRow, {
      lang: 'en',
      canonicalSlug: 'complete-blood-count',
      today: new Date('2026-04-21'),
    });
    expect(fm.slug).toBe('complete-blood-count');
    expect(fm.canonicalSlug).toBe('complete-blood-count');
    expect(fm.lang).toBe('en');
    expect(fm.title).toBe('Complete Blood Count (CBC)');
    expect(fm.category).toBe('Hematology');
    expect(fm.categorySlug).toBe('hematology');
    expect(fm.aiUseCase).toBe('Anemia, infections, inflammatory patterns');
    expect(fm.sections).toHaveLength(5);
    expect(fm.sections[0]?.heading).toBe('Online CBC Results Interpretation');
    expect(fm.publishedAt).toBe('2026-04-21');
    expect(fm.updatedAt).toBe('2026-04-21');
  });

  it('truncates overlong metaTitle/metaDescription with an ellipsis (policy: match Google SERP truncation)', () => {
    const fm = rowToFrontmatter(
      { ...enRow, 'meta title': 'x'.repeat(200), 'meta description': 'y'.repeat(400) },
      { lang: 'en', canonicalSlug: 'x', today: new Date('2026-04-21') },
    );
    expect(fm.metaTitle.length).toBe(60);
    expect(fm.metaTitle.endsWith('…')).toBe(true);
    expect(fm.metaDescription.length).toBe(160);
    expect(fm.metaDescription.endsWith('…')).toBe(true);
  });
});

describe('renderMdx', () => {
  it('produces valid MDX with YAML frontmatter', () => {
    const fm = rowToFrontmatter(enRow, {
      lang: 'en',
      canonicalSlug: 'complete-blood-count',
      today: new Date('2026-04-21'),
    });
    const mdx = renderMdx(fm);
    expect(mdx.startsWith('---\n')).toBe(true);
    expect(mdx).toContain('slug: complete-blood-count');
    expect(mdx).toContain('canonicalSlug: complete-blood-count');
    expect(mdx).toContain('lang: en');
    // Body is auto-generated placeholder
    expect(mdx).toContain('auto-generated from frontmatter');
  });
});

describe('classifyRowPair', () => {
  it('returns OK when EN + PL both present and names align', () => {
    const res = classifyRowPair({
      enRow: { 'test name': 'Complete Blood Count (CBC)', 'category': 'Hematology' },
      plRow: { 'nazwa testu': 'Morfologia krwi (CBC)', 'kategoria': 'Hematologia' },
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('OK');
  });

  it('returns MISSING_PL when PL row is empty', () => {
    const res = classifyRowPair({
      enRow: { 'test name': 'Ferritin', 'category': 'Iron' },
      plRow: {},
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('MISSING_PL');
  });

  it('returns DUPLICATE when EN name collides with an already-seen slug', () => {
    const seen = new Set<string>(['homocysteine']);
    const res = classifyRowPair({
      enRow: { 'test name': 'Homocysteine', 'category': 'Cardio' },
      plRow: { 'nazwa testu': 'Homocysteina', 'kategoria': 'Kardio' },
      seenEnSlugs: seen,
    });
    expect(res.issue).toBe<IssueType>('DUPLICATE');
  });

  it('flags META_TOO_LONG but still returns OK', () => {
    const longMeta = 'x'.repeat(200);
    const res = classifyRowPair({
      enRow: { 'test name': 'Test', 'category': 'Cat', 'meta description': longMeta },
      plRow: { 'nazwa testu': 'Test PL', 'kategoria': 'Kat', 'meta description': 'short' },
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('OK');
    expect(res.flags).toContain('META_TOO_LONG_EN');
  });

  it('returns EMPTY when both EN and PL rows have no test name', () => {
    const res = classifyRowPair({
      enRow: {},
      plRow: {},
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('EMPTY');
    expect(res.canonicalSlug).toBeNull();
  });

  it('does NOT flag META_TOO_LONG_EN for exactly 160-char meta', () => {
    const meta160 = 'x'.repeat(160);
    const res = classifyRowPair({
      enRow: { 'test name': 'Test', 'meta description': meta160 },
      plRow: { 'nazwa testu': 'Test PL' },
      seenEnSlugs: new Set(),
    });
    expect(res.flags).not.toContain('META_TOO_LONG_EN');
  });

  it('flags META_TOO_LONG_EN at 161 chars (first over-limit)', () => {
    const meta161 = 'x'.repeat(161);
    const res = classifyRowPair({
      enRow: { 'test name': 'Test', 'meta description': meta161 },
      plRow: { 'nazwa testu': 'Test PL' },
      seenEnSlugs: new Set(),
    });
    expect(res.flags).toContain('META_TOO_LONG_EN');
  });

  it('returns MISALIGNED when EN and PL names refer to different tests', () => {
    const res = classifyRowPair({
      enRow: { 'test name': 'Thyroid Stimulating Hormone' },
      plRow: { 'nazwa testu': 'Morfologia krwi' }, // clearly unrelated
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('MISALIGNED');
  });

  it('does NOT flag MISALIGNED when names share detectable root tokens', () => {
    const res = classifyRowPair({
      enRow: { 'test name': 'Ferritin' },
      plRow: { 'nazwa testu': 'Ferrytyna' }, // transliteration / cognate
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('OK');
  });

  it('still aligns Cortisol/Kortyzol via shared internal substring "ort"', () => {
    const res = classifyRowPair({
      enRow: { 'test name': 'Cortisol' },
      plRow: { 'nazwa testu': 'Kortyzol' },
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('OK');
  });

  it('flags MISALIGNED when only overlap is a generic Polish noun ending', () => {
    // Real-world false positive: row 54 in the source had EN "Lipoprotein(a)"
    // paired with PL "Zonulina" — entirely different tests. The naive 3-char
    // substring fallback matched on "-ina", a common Polish suffix shared by
    // many unrelated medical terms (witamina, kreatynina, prolaktyna, …).
    const res = classifyRowPair({
      enRow: { 'test name': 'Lipoprotein(a)' },
      plRow: { 'nazwa testu': 'Zonulina' },
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('MISALIGNED');
  });

  it.each([
    ['PHQ-9 (Patient Health Questionnaire-9)', 'DAST-10 (Drug Abuse Screening Test)'],
    ['AUDIT (Alcohol Use Disorders Identification Test)', 'EPDS (Edinburgh Postnatal Depression Scale)'],
    ['C-SSRS Screener (Columbia Suicide Severity Rating Scale)', 'ISI (Insomnia Severity Index)'],
    ['K10 (Kessler Psychological Distress Scale)', 'AUDIT (Alcohol Use Disorders Identification Test)'],
    ['PCL-5 (PTSD Checklist for DSM-5)', 'K10 (Kessler Psychological Distress Scale)'],
    ['DASS-21 (Depression Anxiety Stress Scale)', 'UCLA Loneliness Scale'],
    ['DASS-21 (Depression Anxiety Stress Scales)', 'ASRS v1.1 (Adult ADHD Self-Report Scale)'],
    ['OCI-R (Obsessive-Compulsive Inventory-Revised)', 'PHQ-15 (Patient Health Questionnaire-15)'],
    ['PSQI (Pittsburgh Sleep Quality Index)', 'C-SSRS Screener (Columbia Suicide Severity Rating Scale)'],
  ])('flags MISALIGNED when leading acronyms differ: %s ↔ %s', (en, pl) => {
    const res = classifyRowPair({
      enRow: { 'test name': en },
      plRow: { 'nazwa testu': pl },
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('MISALIGNED');
  });

  it.each([
    ['DHEA-S', 'DHEA-S'],
    ['ALT', 'ALT'],
    ['SHBG', 'SHBG'],
    ['CA 19-9 Tumor Marker', 'CA 19-9'],
    ['PHQ-A (Patient Health Questionnaire - Adolescent)', 'PHQ-A (Patient Health Questionnaire - Adolescent)'],
  ])('aligns when both names share the same leading acronym: %s ↔ %s', (en, pl) => {
    const res = classifyRowPair({
      enRow: { 'test name': en, 'meta description': '', 'category': '', 'h1 title': '', 'h1_text': '', 'h2_1': 'a', 'h2_1_text': 'a', 'h2_2': 'a', 'h2_2_text': 'a', 'h2_3': 'a', 'h2_3_text': 'a', 'h2_4': 'a', 'h2_4_text': 'a', 'h2_5': 'a', 'h2_5_text': 'a' },
      plRow: { 'nazwa testu': pl },
      seenEnSlugs: new Set(),
    });
    expect(res.issue).toBe<IssueType>('OK');
  });
});

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

describe('runImport (integration, in-memory)', () => {
  // Common filled-out row helper so fixtures stay short.
  const fullEn = (name: string, category = 'Hematology'): Record<string, string> => ({
    'test name': name, 'category': category,
    'meta title': 'X', 'meta description': 'Y', 'h1 title': 'H', 'h1_text': 'T',
    'h2_1': 'a', 'h2_1_text': 'b', 'h2_2': 'c', 'h2_2_text': 'd',
    'h2_3': 'e', 'h2_3_text': 'f', 'h2_4': 'g', 'h2_4_text': 'h',
    'h2_5': 'i', 'h2_5_text': 'j', 'ai use-case': 'u',
  });
  const fullPl = (name: string, category = 'Hematologia'): Record<string, string> => ({
    'nazwa testu': name, 'kategoria': category,
    'meta title': 'X', 'meta description': 'Y', 'h1 title': 'H', 'h1_text': 'T',
    'h2_1': 'a', 'h2_1_text': 'b', 'h2_2': 'c', 'h2_2_text': 'd',
    'h2_3': 'e', 'h2_3_text': 'f', 'h2_4': 'g', 'h2_4_text': 'h',
    'h2_5': 'i', 'h2_5_text': 'j', 'ai use-case': 'u',
  });

  it('writes MDX only for OK rows; skips DUPLICATE / MISSING_PL', async () => {
    const result = await runImport({
      enRows: [
        fullEn('Complete Blood Count (CBC)'),     // row 0: OK (paired with CBC PL)
        fullEn('Complete Blood Count (CBC)'),     // row 1: DUPLICATE (same EN slug)
        fullEn('OrphanEn'),                        // row 2: MISSING_PL
      ],
      plRows: [
        fullPl('Morfologia krwi (CBC)'),           // row 0: pairs with EN row 0 → OK
        fullPl('Morfologia2 (CBC)'),               // row 1: pairs with EN row 1 → but EN row 1 is DUPLICATE
        {},                                         // row 2: empty → EN row 2 becomes MISSING_PL
      ],
      dryRun: true,
    });
    expect(result.written.en).toHaveLength(1);
    expect(result.written.pl).toHaveLength(1);
    expect(result.skipped.map((s) => s.issue).sort()).toEqual(['DUPLICATE', 'MISSING_PL']);
  });
});

describe('renderCategoriesTmpl', () => {
  it('produces valid TS with inferred slugs from labels', () => {
    const ts = renderCategoriesTmpl([
      { key: 'hematology', labelEn: 'Hematology', labelPl: 'Hematologia' },
      { key: 'thyroid', labelEn: 'Thyroid', labelPl: 'Tarczyca' },
    ]);
    expect(ts).toContain("'hematology':");
    expect(ts).toContain("slug: 'hematologia'");
    expect(ts).toContain("label: 'Hematology'");
    expect(ts).toContain("export const categoryMeta");
    expect(ts).toContain("satisfies Record");
  });

  it('quotes hyphenated keys (e.g. mental-health)', () => {
    const ts = renderCategoriesTmpl([
      { key: 'mental-health', labelEn: 'Mental Health', labelPl: 'Zdrowie Psychiczne' },
    ]);
    expect(ts).toContain("'mental-health':");
    // Verify it doesn't emit the invalid bare form.
    expect(ts).not.toMatch(/^\s+mental-health:/m);
  });
});

describe('extractCategoryKeys', () => {
  it('returns only top-level category keys, not nested en/pl', () => {
    const src = `export const categoryMeta = {
  hematology: {
    en: { slug: 'hematology', label: 'Hematology' },
    pl: { slug: 'hematologia', label: 'Hematologia' },
  },
  thyroid: {
    en: { slug: 'thyroid', label: 'Thyroid' },
    pl: { slug: 'tarczyca', label: 'Tarczyca' },
  },
} as const satisfies Record<string, Record<'en' | 'pl', { slug: string; label: string }>>;`;
    const keys = extractCategoryKeys(src);
    expect(Array.from(keys).sort()).toEqual(['hematology', 'thyroid']);
    expect(keys.has('en')).toBe(false);
    expect(keys.has('pl')).toBe(false);
  });

  it('returns an empty set when categoryMeta block not found', () => {
    const src = `// nothing here`;
    expect(extractCategoryKeys(src).size).toBe(0);
  });

  it('handles quoted keys with hyphens (e.g. mental-health)', () => {
    const src = `export const categoryMeta = {
  hematology: {
    en: { slug: 'hematology', label: 'Hematology' },
    pl: { slug: 'hematologia', label: 'Hematologia' },
  },
  'mental-health': {
    en: { slug: 'mental-health', label: 'Mental Health' },
    pl: { slug: 'zdrowie-psychiczne', label: 'Zdrowie Psychiczne' },
  },
} as const satisfies Record<string, Record<'en' | 'pl', { slug: string; label: string }>>;`;
    const keys = extractCategoryKeys(src);
    expect(keys.has('hematology')).toBe(true);
    expect(keys.has('mental-health')).toBe(true);
  });
});

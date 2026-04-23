import { describe, it, expect } from 'vitest';
import { rowToFrontmatter, renderMdx, classifyRowPair } from '../../scripts/import-medical-tests';
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
});

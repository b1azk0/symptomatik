import { describe, it, expect } from 'vitest';
import { rowToFrontmatter, renderMdx } from '../../scripts/import-medical-tests';

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

  it('throws when metaTitle exceeds 60 chars', () => {
    // Script policy: fail loudly rather than silently truncate
    expect(() =>
      rowToFrontmatter(
        { ...enRow, 'meta title': 'x'.repeat(200) },
        { lang: 'en', canonicalSlug: 'x', today: new Date('2026-04-21') },
      ),
    ).toThrow(/metaTitle exceeds 60 chars/);
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

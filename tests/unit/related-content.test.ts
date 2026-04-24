import { describe, it, expect } from 'vitest';
import { selectRelated } from '@/components/related-content-logic';
import type { TestEntry } from '@/lib/medical-tests/queries';

const mkEntry = (slug: string, lang: 'en' | 'pl', categorySlug: string, title: string): TestEntry => ({
  id: `${lang}/${slug}`,
  slug,
  collection: 'medical-tests',
  data: { slug, canonicalSlug: slug, lang, title, categorySlug, category: categorySlug, aiUseCase: '' } as any,
} as TestEntry);

describe('selectRelated', () => {
  const all: TestEntry[] = [
    mkEntry('cbc', 'en', 'hematology', 'CBC'),
    mkEntry('ferritin', 'en', 'hematology', 'Ferritin'),
    mkEntry('iron', 'en', 'hematology', 'Iron'),
    mkEntry('tsh', 'en', 'hormonal', 'TSH'),
  ];

  it('uses curated relatedTests when length >= 3', () => {
    const picks = selectRelated({
      currentSlug: 'cbc',
      categoryKey: 'hematology',
      lang: 'en',
      curated: ['ferritin', 'iron', 'tsh'],
      all,
    });
    expect(picks.map((e) => e.data.slug)).toEqual(['ferritin', 'iron', 'tsh']);
  });

  it('falls back to category siblings when curated has fewer than 3', () => {
    const picks = selectRelated({
      currentSlug: 'cbc',
      categoryKey: 'hematology',
      lang: 'en',
      curated: ['ferritin'],
      all,
    });
    expect(picks.map((e) => e.data.slug).sort()).toEqual(['ferritin', 'iron']);
  });

  it('falls back to category siblings when curated is empty', () => {
    const picks = selectRelated({
      currentSlug: 'cbc',
      categoryKey: 'hematology',
      lang: 'en',
      curated: [],
      all,
    });
    expect(picks.map((e) => e.data.slug).sort()).toEqual(['ferritin', 'iron']);
  });

  it('returns empty array when fewer than 3 items sourceable (suppress block)', () => {
    const picks = selectRelated({
      currentSlug: 'tsh',
      categoryKey: 'hormonal',
      lang: 'en',
      curated: [],
      all,
    });
    expect(picks).toEqual([]);
  });

  it('caps at 5 even when curated has more', () => {
    const many = Array.from({ length: 10 }, (_, i) => mkEntry(`t${i}`, 'en', 'hematology', `T${i}`));
    const curated = Array.from({ length: 8 }, (_, i) => `t${i + 1}`);
    const picks = selectRelated({
      currentSlug: 't0',
      categoryKey: 'hematology',
      lang: 'en',
      curated,
      all: many,
    });
    expect(picks).toHaveLength(5);
  });

  it('caps category-fallback at 5', () => {
    const many = Array.from({ length: 10 }, (_, i) => mkEntry(`t${i}`, 'en', 'hematology', `T${i}`));
    const picks = selectRelated({
      currentSlug: 't0',
      categoryKey: 'hematology',
      lang: 'en',
      curated: [],
      all: many,
    });
    expect(picks).toHaveLength(5);
  });

  it('excludes the current slug from fallback siblings', () => {
    const picks = selectRelated({
      currentSlug: 'cbc',
      categoryKey: 'hematology',
      lang: 'en',
      curated: [],
      all,
    });
    expect(picks.map((e) => e.data.slug)).not.toContain('cbc');
  });

  it('filters by lang correctly (only returns entries in the requested language)', () => {
    const mixed: TestEntry[] = [
      mkEntry('cbc', 'en', 'hematology', 'CBC'),
      mkEntry('ferritin', 'en', 'hematology', 'Ferritin'),
      mkEntry('iron', 'en', 'hematology', 'Iron'),
      mkEntry('morfologia', 'pl', 'hematology', 'Morfologia'),
    ];
    const picks = selectRelated({
      currentSlug: 'cbc',
      categoryKey: 'hematology',
      lang: 'en',
      curated: [],
      all: mixed,
    });
    expect(picks.map((e) => e.data.lang)).toEqual(['en', 'en']);
  });
});

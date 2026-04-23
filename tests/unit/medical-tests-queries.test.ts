import { describe, it, expect } from 'vitest';
import type { TestEntry } from '@/lib/medical-tests/queries';
import {
  filterByLang, groupByCategory, getSiblingsFromFixture,
} from '@/lib/medical-tests/queries';

// Build minimal fixture entries. `id` and `data` are the only fields pure helpers touch.
const mkEntry = (id: string, lang: 'en' | 'pl', slug: string, categorySlug: string, title: string): TestEntry => ({
  id, slug, collection: 'medical-tests',
  data: { slug, canonicalSlug: slug, lang, title, categorySlug, category: categorySlug, aiUseCase: '' } as any,
} as unknown as TestEntry);

const fixture: TestEntry[] = [
  mkEntry('en/cbc',       'en', 'cbc',         'hematology', 'CBC'),
  mkEntry('en/ferritin',  'en', 'ferritin',    'hematology', 'Ferritin'),
  mkEntry('en/iron',      'en', 'iron',        'hematology', 'Iron'),
  mkEntry('en/tsh',       'en', 'tsh',         'hormonal',   'TSH'),
  mkEntry('pl/morfologia','pl', 'morfologia',  'hematology', 'Morfologia'),
];

describe('filterByLang', () => {
  it('isolates EN entries', () => {
    expect(filterByLang(fixture, 'en')).toHaveLength(4);
  });
  it('isolates PL entries', () => {
    expect(filterByLang(fixture, 'pl')).toHaveLength(1);
  });
  it('returns empty for ES when no ES content exists', () => {
    expect(filterByLang(fixture, 'es')).toHaveLength(0);
  });
});

describe('groupByCategory', () => {
  it('returns a Map keyed by category with sorted tests inside', () => {
    const en = filterByLang(fixture, 'en');
    const map = groupByCategory(en);
    expect(map.get('hematology')).toHaveLength(3);
    expect(map.get('hormonal')).toHaveLength(1);
    // Sorted alphabetically by title within each category:
    expect(map.get('hematology')!.map((e) => e.data.title)).toEqual(['CBC', 'Ferritin', 'Iron']);
  });
  it('omits categories with no members', () => {
    const pl = filterByLang(fixture, 'pl');
    const map = groupByCategory(pl);
    expect(map.has('hormonal')).toBe(false);
    expect(map.has('hematology')).toBe(true);
  });
});

describe('getSiblingsFromFixture', () => {
  it('excludes the current slug and returns only same-category entries', () => {
    const en = filterByLang(fixture, 'en');
    const siblings = getSiblingsFromFixture(en, 'cbc', 'hematology', 5);
    expect(siblings.map((s) => s.data.slug).sort()).toEqual(['ferritin', 'iron']);
  });
  it('caps at limit', () => {
    const manyEntries = Array.from({ length: 10 }, (_, i) => mkEntry(`en/test${i}`, 'en', `test${i}`, 'hematology', `Test${i}`));
    const siblings = getSiblingsFromFixture(manyEntries, 'test0', 'hematology', 5);
    expect(siblings).toHaveLength(5);
  });
  it('returns empty when category has no other members', () => {
    const en = filterByLang(fixture, 'en');
    const siblings = getSiblingsFromFixture(en, 'tsh', 'hormonal', 5);
    expect(siblings).toHaveLength(0);
  });
});

import { describe, it, expect } from 'vitest';
import { findAlternatesByCanonicalSlug } from '@/lib/content/loaders';

type Entry = { data: { slug: string; canonicalSlug: string; lang: 'en' | 'pl' | 'es' } };
const entries: Entry[] = [
  { data: { slug: 'complete-blood-count', canonicalSlug: 'complete-blood-count', lang: 'en' } },
  { data: { slug: 'morfologia-krwi-cbc', canonicalSlug: 'complete-blood-count', lang: 'pl' } },
  { data: { slug: 'comprehensive-metabolic-panel', canonicalSlug: 'comprehensive-metabolic-panel', lang: 'en' } },
];

describe('findAlternatesByCanonicalSlug', () => {
  it('returns entries with the same canonicalSlug', () => {
    const result = findAlternatesByCanonicalSlug(entries as any, 'complete-blood-count');
    expect(result).toHaveLength(2);
    const langs = result.map((e: any) => e.data.lang).sort();
    expect(langs).toEqual(['en', 'pl']);
  });

  it('returns a single entry when only one locale exists', () => {
    const result = findAlternatesByCanonicalSlug(entries as any, 'comprehensive-metabolic-panel');
    expect(result).toHaveLength(1);
    expect(result[0]?.data.lang).toBe('en');
  });

  it('returns empty array for unknown canonicalSlug', () => {
    const result = findAlternatesByCanonicalSlug(entries as any, 'not-a-thing');
    expect(result).toEqual([]);
  });
});

import { describe, it, expect } from 'vitest';
import { canonicalURL, alternatesFor } from '@/lib/seo/meta';

const site = 'https://symptomatik.com';

describe('canonicalURL', () => {
  it('builds absolute EN URL', () => {
    expect(canonicalURL({ site, lang: 'en', collection: 'medical-tests', slug: 'cbc' }))
      .toBe('https://symptomatik.com/medical-tests/cbc/');
  });

  it('builds absolute PL URL', () => {
    expect(canonicalURL({ site, lang: 'pl', collection: 'medical-tests', slug: 'morfologia-krwi-cbc' }))
      .toBe('https://symptomatik.com/pl/badania/morfologia-krwi-cbc/');
  });

  it('strips trailing slash from site input', () => {
    expect(canonicalURL({ site: 'https://symptomatik.com/', lang: 'en', collection: 'medical-tests', slug: 'x' }))
      .toBe('https://symptomatik.com/medical-tests/x/');
  });
});

describe('alternatesFor', () => {
  it('emits EN + PL + x-default when both exist', () => {
    const entries = [
      { data: { lang: 'en', slug: 'cbc', canonicalSlug: 'cbc' } },
      { data: { lang: 'pl', slug: 'morfologia-krwi-cbc', canonicalSlug: 'cbc' } },
    ];
    const alts = alternatesFor({ entries: entries as any, site, collection: 'medical-tests' });
    const map = Object.fromEntries(alts.map(a => [a.hreflang, a.href]));
    expect(map['en']).toBe('https://symptomatik.com/medical-tests/cbc/');
    expect(map['pl']).toBe('https://symptomatik.com/pl/badania/morfologia-krwi-cbc/');
    expect(map['x-default']).toBe('https://symptomatik.com/medical-tests/cbc/');
  });

  it('omits missing locales cleanly', () => {
    const entries = [
      { data: { lang: 'en', slug: 'cbc', canonicalSlug: 'cbc' } },
    ];
    const alts = alternatesFor({ entries: entries as any, site, collection: 'medical-tests' });
    const langs = alts.map(a => a.hreflang).sort();
    expect(langs).toEqual(['en', 'x-default']);
  });
});

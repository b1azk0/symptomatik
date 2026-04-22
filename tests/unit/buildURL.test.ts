import { describe, it, expect } from 'vitest';
import { buildURL, localePrefix, collectionSegments } from '@/i18n/routes';

describe('localePrefix', () => {
  it('EN has empty prefix', () => {
    expect(localePrefix.en).toBe('');
  });
  it('PL prefixes with /pl', () => {
    expect(localePrefix.pl).toBe('/pl');
  });
  it('ES prefixes with /es', () => {
    expect(localePrefix.es).toBe('/es');
  });
});

describe('collectionSegments.medical-tests', () => {
  it('EN uses medical-tests', () => {
    expect(collectionSegments['medical-tests'].en).toBe('medical-tests');
  });
  it('PL uses badania', () => {
    expect(collectionSegments['medical-tests'].pl).toBe('badania');
  });
  it('ES uses pruebas', () => {
    expect(collectionSegments['medical-tests'].es).toBe('pruebas');
  });
});

describe('buildURL', () => {
  it('builds EN URL without locale prefix', () => {
    expect(buildURL({ lang: 'en', collection: 'medical-tests', slug: 'complete-blood-count' }))
      .toBe('/medical-tests/complete-blood-count/');
  });

  it('builds PL URL with /pl/ prefix and translated segment', () => {
    expect(buildURL({ lang: 'pl', collection: 'medical-tests', slug: 'morfologia-krwi-cbc' }))
      .toBe('/pl/badania/morfologia-krwi-cbc/');
  });

  it('builds ES URL with /es/ prefix and translated segment', () => {
    expect(buildURL({ lang: 'es', collection: 'medical-tests', slug: 'hemograma-completo' }))
      .toBe('/es/pruebas/hemograma-completo/');
  });

  it('always produces trailing slash', () => {
    const result = buildURL({ lang: 'en', collection: 'medical-tests', slug: 'x' });
    expect(result.endsWith('/')).toBe(true);
  });
});

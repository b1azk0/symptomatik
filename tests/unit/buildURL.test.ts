import { describe, it, expect } from 'vitest';
import { buildURL, localePrefix, collectionSegments, buildCategoryURL, buildPillarURL } from '@/i18n/routes';

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

describe('buildPillarURL', () => {
  it('EN → /medical-tests/', () => {
    expect(buildPillarURL('en', 'medical-tests')).toBe('/medical-tests/');
  });
  it('PL → /pl/badania/', () => {
    expect(buildPillarURL('pl', 'medical-tests')).toBe('/pl/badania/');
  });
  it('ES → /es/pruebas/', () => {
    expect(buildPillarURL('es', 'medical-tests')).toBe('/es/pruebas/');
  });
});

describe('buildCategoryURL', () => {
  it('EN + hematology → /medical-tests/hematology/', () => {
    expect(buildCategoryURL('en', 'hematology')).toBe('/medical-tests/hematology/');
  });
  it('PL + hematology → /pl/badania/hematologia/', () => {
    expect(buildCategoryURL('pl', 'hematology')).toBe('/pl/badania/hematologia/');
  });
  it('EN + liver → /medical-tests/liver-function-tests/', () => {
    expect(buildCategoryURL('en', 'liver')).toBe('/medical-tests/liver-function-tests/');
  });
  it('PL + gastro → /pl/badania/uklad-pokarmowy/', () => {
    expect(buildCategoryURL('pl', 'gastro')).toBe('/pl/badania/uklad-pokarmowy/');
  });
});

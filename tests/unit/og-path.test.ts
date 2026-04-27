import { describe, it, expect } from 'vitest';
import { ogPathForCanonical } from '@/lib/og/path';

describe('ogPathForCanonical', () => {
  it.each([
    // Homes — locale-aware suffix (root paths have no slug to derive from)
    ['/',                          'en', 'home-en.png'],
    ['/pl/',                       'pl', 'home-pl.png'],
    ['/es/',                       'es', 'home-es.png'],

    // Pillar roots
    ['/medical-tests/',            'en', 'medical-tests.png'],
    ['/pl/badania/',               'pl', 'pl/badania.png'],

    // Category indexes
    ['/medical-tests/cardiometabolic/',  'en', 'medical-tests/cardiometabolic.png'],
    ['/pl/badania/kardiometaboliczne/',  'pl', 'pl/badania/kardiometaboliczne.png'],

    // Test pages
    ['/medical-tests/apob/',       'en', 'medical-tests/apob.png'],
    ['/pl/badania/wapn/',          'pl', 'pl/badania/wapn.png'],

    // Edge cases — accept missing-trailing-slash too (defensive)
    ['/medical-tests/apob',        'en', 'medical-tests/apob.png'],
    ['/medical-tests',             'en', 'medical-tests.png'],
    ['/medical-tests//apob/',      'en', 'medical-tests/apob.png'],
  ])('%s (%s) → %s', (pathname, locale, expected) => {
    expect(ogPathForCanonical(pathname, locale as 'en' | 'pl' | 'es')).toBe(expected);
  });

  it('returns a path that is safe as a filesystem segment (no leading slash, no double slashes)', () => {
    const result = ogPathForCanonical('/medical-tests/apob/', 'en');
    expect(result.startsWith('/')).toBe(false);
    expect(result).not.toMatch(/\/\//);
  });
});

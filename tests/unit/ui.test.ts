import { describe, it, expect } from 'vitest';
import { ui, t } from '@/i18n/ui';
import { locales } from '@/i18n/locales';

describe('UI translations', () => {
  it('has all locales populated', () => {
    for (const locale of locales) {
      expect(ui[locale]).toBeDefined();
    }
  });

  it('every key has a value in every locale (i18n coverage)', () => {
    const enKeys = Object.keys(ui.en);
    for (const locale of locales) {
      const localeKeys = Object.keys(ui[locale]);
      for (const key of enKeys) {
        expect(localeKeys, `missing "${key}" in ${locale}`).toContain(key);
      }
    }
  });
});

describe('t() helper', () => {
  it('returns the string for the given locale', () => {
    expect(t('en', 'nav.symptoms')).toBe('Symptoms');
    expect(t('pl', 'nav.symptoms')).toBe('Symptomy');
  });

  it('returns ES translation for ES locale', () => {
    expect(t('es', 'nav.symptoms')).toBe('Síntomas');
  });
});

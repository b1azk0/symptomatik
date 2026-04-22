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
    expect(t('en', 'nav.symptomChecker')).toBe('Symptom Checker');
    expect(t('pl', 'nav.symptomChecker')).toBe('Sprawdź objawy');
  });

  it('returns EN copy for ES locale (placeholder behaviour — ES translations happen later)', () => {
    expect(t('es', 'nav.symptomChecker')).toBe('Verificador de síntomas');
  });
});

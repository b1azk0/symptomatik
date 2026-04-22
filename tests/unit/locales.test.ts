import { describe, it, expect } from 'vitest';
import { locales, defaultLocale, isLocale } from '@/i18n/locales';

describe('locales', () => {
  it('exports the 3 supported locales', () => {
    expect(locales).toEqual(['en', 'pl', 'es']);
  });

  it('default locale is en', () => {
    expect(defaultLocale).toBe('en');
  });

  it('isLocale returns true for valid locales', () => {
    expect(isLocale('en')).toBe(true);
    expect(isLocale('pl')).toBe(true);
    expect(isLocale('es')).toBe(true);
  });

  it('isLocale returns false for invalid input', () => {
    expect(isLocale('de')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale('EN')).toBe(false);
  });
});

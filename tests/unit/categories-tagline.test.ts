import { describe, it, expect } from 'vitest';
import { categoryMeta, getCategoryTagline } from '@/i18n/categories';

describe('categoryMeta taglines', () => {
  it('every category has both EN and PL taglines', () => {
    for (const [key, entry] of Object.entries(categoryMeta)) {
      expect(entry.en.tagline, `${key} EN tagline`).toBeTruthy();
      expect(entry.pl.tagline, `${key} PL tagline`).toBeTruthy();
    }
  });

  it('every tagline is between 1 and 60 characters (fits OG card)', () => {
    for (const [key, entry] of Object.entries(categoryMeta)) {
      expect(entry.en.tagline.length, `${key} EN`).toBeGreaterThan(0);
      expect(entry.en.tagline.length, `${key} EN`).toBeLessThanOrEqual(60);
      expect(entry.pl.tagline.length, `${key} PL`).toBeGreaterThan(0);
      expect(entry.pl.tagline.length, `${key} PL`).toBeLessThanOrEqual(60);
    }
  });

  it('getCategoryTagline returns the right locale string', () => {
    expect(getCategoryTagline('cardiometabolic', 'en')).toBe('Heart & metabolic risk markers.');
    expect(getCategoryTagline('cardiometabolic', 'pl')).toBe('Markery ryzyka sercowo-metabolicznego.');
  });
});

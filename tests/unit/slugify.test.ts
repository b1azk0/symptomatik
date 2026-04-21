import { describe, it, expect } from 'vitest';
import { slugify } from '../../scripts/import-medical-tests';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Complete Blood Count')).toBe('complete-blood-count');
  });

  it('strips parentheses', () => {
    expect(slugify('Complete Blood Count (CBC)')).toBe('complete-blood-count-cbc');
  });

  it('handles Polish diacritics', () => {
    expect(slugify('Morfologia krwi (CBC)')).toBe('morfologia-krwi-cbc');
    expect(slugify('Próba wątrobowa')).toBe('proba-watrobowa');
  });

  it('collapses multiple spaces', () => {
    expect(slugify('A    B')).toBe('a-b');
  });

  it('strips slashes and other special chars', () => {
    expect(slugify('HbA1c / Glycated hemoglobin')).toBe('hba1c-glycated-hemoglobin');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });
});

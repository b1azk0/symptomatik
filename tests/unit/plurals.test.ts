import { describe, it, expect } from 'vitest';
import { formatTestCount } from '@/i18n/plurals';

describe('formatTestCount — EN', () => {
  it('singular for 1', () => {
    expect(formatTestCount('en', 1)).toBe('1 test');
  });
  it.each([0, 2, 3, 5, 10, 21])('plural for %i', (n) => {
    expect(formatTestCount('en', n)).toBe(`${n} tests`);
  });
});

describe('formatTestCount — PL (3-form Slavic pluralization)', () => {
  it('one: 1', () => {
    expect(formatTestCount('pl', 1)).toBe('1 badanie');
  });
  it.each([2, 3, 4, 22, 23, 24])('few: %i', (n) => {
    expect(formatTestCount('pl', n)).toBe(`${n} badania`);
  });
  it.each([0, 5, 10, 11, 12, 13, 14, 15, 20, 21, 25, 100])('many: %i', (n) => {
    expect(formatTestCount('pl', n)).toBe(`${n} badań`);
  });
});

describe('formatTestCount — ES', () => {
  it('singular for 1', () => {
    expect(formatTestCount('es', 1)).toBe('1 prueba');
  });
  it.each([0, 2, 3, 5, 10])('plural for %i', (n) => {
    expect(formatTestCount('es', n)).toBe(`${n} pruebas`);
  });
});

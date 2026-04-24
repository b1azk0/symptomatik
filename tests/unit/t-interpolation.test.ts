import { describe, it, expect } from 'vitest';
import { t } from '@/i18n/ui';

describe('t() interpolation', () => {
  it('substitutes {name} tokens from vars', () => {
    expect(t('en', 'category.description', { label: 'Hematology' }))
      .toBe('All Hematology tests we currently interpret.');
  });
  it('leaves raw string when vars omitted', () => {
    expect(t('en', 'category.description'))
      .toBe('All {label} tests we currently interpret.');
  });
  it('PL locale substitutes correctly', () => {
    expect(t('pl', 'category.description', { label: 'Hematologia' }))
      .toBe('Wszystkie badania z kategorii Hematologia, które interpretujemy.');
  });
});

import type { Locale } from './locales';

// Intl.PluralRules returns CLDR categories per locale:
// - en / es: 'one' (1), 'other' (everything else)
// - pl:      'one' (1), 'few' (2-4 excluding teens), 'many' (0, 5+, teens), 'other'
const RULES: Record<Locale, Intl.PluralRules> = {
  en: new Intl.PluralRules('en'),
  pl: new Intl.PluralRules('pl'),
  es: new Intl.PluralRules('es'),
};

type PluralDict = Partial<Record<Intl.LDMLPluralRule, (n: number) => string>>;

const TEST_COUNT: Record<Locale, PluralDict> = {
  en: {
    one: (n) => `${n} test`,
    other: (n) => `${n} tests`,
  },
  pl: {
    one: (n) => `${n} badanie`,
    few: (n) => `${n} badania`,
    many: (n) => `${n} badań`,
    other: (n) => `${n} badań`,
  },
  es: {
    one: (n) => `${n} prueba`,
    other: (n) => `${n} pruebas`,
  },
};

export function formatTestCount(locale: Locale, count: number): string {
  const rule = RULES[locale].select(count);
  const dict = TEST_COUNT[locale];
  const fn = dict[rule] ?? dict.other ?? dict.one!;
  return fn(count);
}

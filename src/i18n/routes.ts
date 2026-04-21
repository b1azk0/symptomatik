import type { Locale } from './locales';

export const localePrefix: Record<Locale, string> = {
  en: '',
  pl: '/pl',
  es: '/es',
} as const;

export const collectionSegments = {
  'medical-tests': { en: 'medical-tests', pl: 'badania', es: 'pruebas' },
  // Future: 'symptoms', 'diseases', 'calculators', 'mental-health-assessments'
} as const;

export type Collection = keyof typeof collectionSegments;

export interface BuildURLArgs {
  lang: Locale;
  collection: Collection;
  slug: string;
}

export function buildURL(args: BuildURLArgs): string {
  const prefix = localePrefix[args.lang];
  const segment = collectionSegments[args.collection][args.lang];
  return `${prefix}/${segment}/${args.slug}/`;
}

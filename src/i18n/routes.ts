import type { Locale } from './locales';
import { categoryMeta, type CategoryKey } from './categories';

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

export const legalSlugSegments = {
  privacy: { en: 'privacy', pl: 'polityka-prywatnosci', es: 'privacidad' },
  terms: { en: 'terms', pl: 'regulamin', es: 'terminos' },
  'medical-disclaimer': { en: 'medical-disclaimer', pl: 'zastrzezenie-medyczne', es: 'aviso-medico' },
  cookies: { en: 'cookies', pl: 'polityka-cookies', es: 'politica-cookies' },
} as const;

export type LegalKey = keyof typeof legalSlugSegments;

export function legalSlugFor(key: LegalKey, lang: Locale): string {
  return legalSlugSegments[key][lang];
}

export function buildLegalURL(lang: Locale, key: LegalKey): string {
  const prefix = localePrefix[lang];
  return `${prefix}/${legalSlugFor(key, lang)}/`;
}

export function buildPillarURL(lang: Locale, collection: Collection): string {
  const prefix = localePrefix[lang];
  const segment = collectionSegments[collection][lang];
  return `${prefix}/${segment}/`;
}

export function buildCategoryURL(lang: 'en' | 'pl', key: CategoryKey): string {
  const prefix = localePrefix[lang];
  const collectionSeg = collectionSegments['medical-tests'][lang];
  const categorySeg = categoryMeta[key][lang].slug;
  return `${prefix}/${collectionSeg}/${categorySeg}/`;
}

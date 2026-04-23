// Source of truth for medical-tests category URLs and labels.
//
// Keys match the slugified EN `category` column from content-sources/medical-tests.xlsx;
// MDX frontmatter's `categorySlug` must be a key in this map (enforced by zod refine in
// src/content/schemas.ts). When a new category appears in the Excel source, the importer
// fails fast and prompts to add an entry here — preventing silent URL drift.
//
// Slug + label choices cross-referenced against Ahrefs (2026-04-23) to prefer accessible
// intent-match terms over high-difficulty pillar words. See
// docs/superpowers/specs/2026-04-23-symptomatik-s1-content-platform-design.md §"Category URL i18n".

export const categoryMeta = {
  'autoimmunology': {
    en: { slug: 'autoimmunology', label: 'Autoimmunology' },
    pl: { slug: 'autoimmunologia', label: 'Autoimmunologia' },
  },
  'cardiometabolic': {
    en: { slug: 'cardiometabolic', label: 'Cardiometabolic' },
    pl: { slug: 'kardiometaboliczne', label: 'Kardiometaboliczne' },
  },
  'gastro': {
    en: { slug: 'gastrointestinal', label: 'Gastrointestinal' },
    pl: { slug: 'uklad-pokarmowy', label: 'Układ pokarmowy' },
  },
  'heart': {
    en: { slug: 'heart-tests', label: 'Heart Tests' },
    pl: { slug: 'serce', label: 'Serce' },
  },
  'hematology': {
    en: { slug: 'hematology', label: 'Hematology' },
    pl: { slug: 'hematologia', label: 'Hematologia' },
  },
  'hormonal': {
    en: { slug: 'hormones', label: 'Hormones' },
    pl: { slug: 'hormony', label: 'Hormony' },
  },
  'inflammatory': {
    en: { slug: 'inflammatory-markers', label: 'Inflammatory Markers' },
    pl: { slug: 'stan-zapalny', label: 'Stan zapalny' },
  },
  'liver': {
    en: { slug: 'liver-function-tests', label: 'Liver Function Tests' },
    pl: { slug: 'proby-watrobowe', label: 'Próby wątrobowe' },
  },
  'mental-health': {
    en: { slug: 'mental-health', label: 'Mental Health' },
    pl: { slug: 'zdrowie-psychiczne', label: 'Zdrowie psychiczne' },
  },
  'metabolism': {
    en: { slug: 'metabolic-panel', label: 'Metabolic Panel' },
    pl: { slug: 'metabolizm', label: 'Metabolizm' },
  },
  'oncology': {
    en: { slug: 'tumor-markers', label: 'Tumor Markers' },
    pl: { slug: 'markery-nowotworowe', label: 'Markery nowotworowe' },
  },
  'urine': {
    en: { slug: 'urinalysis', label: 'Urinalysis' },
    pl: { slug: 'badanie-moczu', label: 'Badanie moczu' },
  },
} as const satisfies Record<string, Record<'en' | 'pl', { slug: string; label: string }>>;

export type CategoryKey = keyof typeof categoryMeta;

export function getCategoryLabel(key: CategoryKey, lang: 'en' | 'pl'): string {
  return categoryMeta[key][lang].label;
}

export function getCategorySlug(key: CategoryKey, lang: 'en' | 'pl'): string {
  return categoryMeta[key][lang].slug;
}

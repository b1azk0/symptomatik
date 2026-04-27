// Source of truth for medical-tests category URLs, labels, illustrations, and palette accents.
//
// Keys match the slugified EN `category` column from content-sources/medical-tests.xlsx;
// MDX frontmatter's `categorySlug` must be a key in this map (enforced by zod refine in
// src/content/schemas.ts). When a new category appears in the Excel source, the importer
// fails fast and prompts to add an entry here — preventing silent URL drift.
//
// Slug + label choices cross-referenced against Ahrefs (2026-04-23) to prefer accessible
// intent-match terms over high-difficulty pillar words. See
// docs/superpowers/specs/2026-04-23-symptomatik-s1-content-platform-design.md §"Category URL i18n".
//
// `illustration` and `paletteAccent` reference the design system locked in
// docs/design/illustration-brief.md. Illustrations live under public/assets/illustrations/
// and are served as static files. `illustration` is optional so new categories can be
// registered before their hero illustration is generated.

interface CategoryLocale {
  slug: string;
  label: string;
  tagline: string;   // ≤ 60 chars, used as H1 on OG card for category index
}

interface CategoryMetaEntry {
  en: CategoryLocale;
  pl: CategoryLocale;
  illustration?: string;   // URL path under public/; omit if not yet generated
  paletteAccent: string;   // hex color used for pill backgrounds, borders, focal shapes
}

export const categoryMeta = {
  'autoimmunology': {
    en: { slug: 'autoimmunology', label: 'Autoimmunology', tagline: 'Antibodies & autoimmune markers.' },
    pl: { slug: 'autoimmunologia', label: 'Autoimmunologia', tagline: 'Autoprzeciwciała i markery autoimmunologiczne.' },
    illustration: '/assets/illustrations/category/autoimmunology.webp',
    paletteAccent: '#8B5A75',
  },
  'cardiometabolic': {
    en: { slug: 'cardiometabolic', label: 'Cardiometabolic', tagline: 'Heart & metabolic risk markers.' },
    pl: { slug: 'kardiometaboliczne', label: 'Kardiometaboliczne', tagline: 'Markery ryzyka sercowo-metabolicznego.' },
    illustration: '/assets/illustrations/category/cardiometabolic.webp',
    paletteAccent: '#C75040',
  },
  'coagulation': {
    en: { slug: 'coagulation', label: 'Blood Coagulation', tagline: 'Clotting time & bleeding risk.' },
    pl: { slug: 'krzepniecie', label: 'Krzepnięcie krwi', tagline: 'Czas krzepnięcia i ryzyko krwawień.' },
    illustration: '/assets/illustrations/category/coagulation.svg',
    paletteAccent: '#A05050',
  },
  'gastro': {
    en: { slug: 'gastrointestinal', label: 'Gastrointestinal', tagline: 'Gut & digestive health markers.' },
    pl: { slug: 'uklad-pokarmowy', label: 'Układ pokarmowy', tagline: 'Markery zdrowia układu pokarmowego.' },
    illustration: '/assets/illustrations/category/gastro.webp',
    paletteAccent: '#8B6020',
  },
  'heart': {
    en: { slug: 'heart-tests', label: 'Heart Tests', tagline: 'Cardiac function & heart strain.' },
    pl: { slug: 'serce', label: 'Serce', tagline: 'Praca i obciążenie serca.' },
    illustration: '/assets/illustrations/category/heart.webp',
    paletteAccent: '#A0404A',
  },
  'hematology': {
    en: { slug: 'hematology', label: 'Hematology', tagline: 'Blood counts & cell health.' },
    pl: { slug: 'hematologia', label: 'Hematologia', tagline: 'Morfologia i parametry krwi.' },
    illustration: '/assets/illustrations/category/hematology.webp',
    paletteAccent: '#D4654A',
  },
  'hormonal': {
    en: { slug: 'hormones', label: 'Hormones', tagline: 'Hormone levels & balance.' },
    pl: { slug: 'hormony', label: 'Hormony', tagline: 'Poziomy i równowaga hormonów.' },
    illustration: '/assets/illustrations/category/hormonal.webp',
    paletteAccent: '#8B5A75',
  },
  'immunology': {
    en: { slug: 'immunology', label: 'Immunology', tagline: 'Immune system function.' },
    pl: { slug: 'immunologia', label: 'Immunologia', tagline: 'Funkcja układu odpornościowego.' },
    illustration: '/assets/illustrations/category/immunology.svg',
    paletteAccent: '#7A6090',
  },
  'infections': {
    en: { slug: 'infections', label: 'Infections', tagline: 'Infection markers & pathogens.' },
    pl: { slug: 'infekcje', label: 'Infekcje', tagline: 'Markery infekcji i patogeny.' },
    illustration: '/assets/illustrations/category/infections.svg',
    paletteAccent: '#5A8A6F',
  },
  'inflammatory': {
    en: { slug: 'inflammatory-markers', label: 'Inflammatory Markers', tagline: 'Inflammation & acute-phase markers.' },
    pl: { slug: 'stan-zapalny', label: 'Stan zapalny', tagline: 'Markery zapalenia i fazy ostrej.' },
    illustration: '/assets/illustrations/category/inflammatory.webp',
    paletteAccent: '#C75040',
  },
  'kidneys': {
    en: { slug: 'kidney-tests', label: 'Kidney Function Tests', tagline: 'Kidney function & filtration.' },
    pl: { slug: 'nerki', label: 'Nerki', tagline: 'Funkcja i filtracja nerek.' },
    illustration: '/assets/illustrations/category/kidneys.svg',
    paletteAccent: '#5570A5',
  },
  'liver': {
    en: { slug: 'liver-function-tests', label: 'Liver Function Tests', tagline: 'Liver enzymes & function.' },
    pl: { slug: 'proby-watrobowe', label: 'Próby wątrobowe', tagline: 'Enzymy i funkcja wątroby.' },
    illustration: '/assets/illustrations/category/liver.webp',
    paletteAccent: '#B08944',
  },
  'mental-health': {
    en: { slug: 'mental-health', label: 'Mental Health', tagline: 'Self-assessments & screeners.' },
    pl: { slug: 'zdrowie-psychiczne', label: 'Zdrowie psychiczne', tagline: 'Samoocena i skale przesiewowe.' },
    illustration: '/assets/illustrations/category/mental-health.webp',
    paletteAccent: '#8B7B65',
  },
  'metabolism': {
    en: { slug: 'metabolic-panel', label: 'Metabolic Panel', tagline: 'Glucose, electrolytes, basic panel.' },
    pl: { slug: 'metabolizm', label: 'Metabolizm', tagline: 'Glukoza, elektrolity, panel podstawowy.' },
    illustration: '/assets/illustrations/category/metabolism.webp',
    paletteAccent: '#6B7040',
  },
  'oncology': {
    en: { slug: 'tumor-markers', label: 'Tumor Markers', tagline: 'Tumor markers & cancer screening.' },
    pl: { slug: 'markery-nowotworowe', label: 'Markery nowotworowe', tagline: 'Markery nowotworowe i przesiewowe.' },
    illustration: '/assets/illustrations/category/oncology.webp',
    paletteAccent: '#6A5485',
  },
  'urine': {
    en: { slug: 'urinalysis', label: 'Urinalysis', tagline: 'Urine composition & function.' },
    pl: { slug: 'badanie-moczu', label: 'Badanie moczu', tagline: 'Skład moczu i funkcja.' },
    illustration: '/assets/illustrations/category/urine.webp',
    paletteAccent: '#4A6F5C',
  },
} as const satisfies Record<string, CategoryMetaEntry>;

export type CategoryKey = keyof typeof categoryMeta;

export const pillarIllustration = '/assets/illustrations/pillar/medical-tests.webp';

export function getCategoryLabel(key: CategoryKey, lang: 'en' | 'pl'): string {
  return categoryMeta[key][lang].label;
}

export function getCategorySlug(key: CategoryKey, lang: 'en' | 'pl'): string {
  return categoryMeta[key][lang].slug;
}

export function getCategoryIllustration(key: CategoryKey): string | undefined {
  const entry = categoryMeta[key];
  return 'illustration' in entry ? entry.illustration : undefined;
}

export function getCategoryPaletteAccent(key: CategoryKey): string {
  return categoryMeta[key].paletteAccent;
}

export function getCategoryTagline(key: CategoryKey, lang: 'en' | 'pl'): string {
  return categoryMeta[key][lang].tagline;
}

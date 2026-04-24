// Hand-curated 3-card "Start here" featured list per locale.
// Slugs reference src/content/medical-tests/{locale}/{slug}.mdx
//
// Typed 'en' | 'pl' (not `Locale`) matching the `buildCategoryURL` convention:
// ES pillar pages are excluded from S1 scope per locked product decision.
export const featuredSlugs: Record<'en' | 'pl', readonly string[]> = {
  en: ['complete-blood-count-cbc', 'phq-9-patient-health-questionnaire-9', 'alt'],
  pl: ['morfologia-krwi-cbc', 'phq-15-patient-health-questionnaire-15', 'alt'],
} as const;

export function getFeaturedSlugs(lang: 'en' | 'pl'): readonly string[] {
  return featuredSlugs[lang];
}

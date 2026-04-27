import type { Locale } from '@/i18n/locales';

/**
 * Derives the OG card filename (relative to public/og/) from a page's
 * canonical pathname. Mirrors the URL hierarchy.
 *
 * Examples:
 *   "/" + "en"               → "home-en.png"
 *   "/pl/"                   → "home-pl.png"
 *   "/medical-tests/apob/"   → "medical-tests/apob.png"
 *   "/pl/badania/wapn/"      → "pl/badania/wapn.png"
 *
 * Used by both the build-time generator and SEOHead.astro at runtime so
 * the two never diverge.
 */
export function ogPathForCanonical(pathname: string, locale: Locale): string {
  // Homes: "/" or "/<locale>/" — they have no slug, so suffix with locale.
  const trimmed = pathname.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
  if (trimmed === '' || trimmed === locale) return `home-${locale}.png`;

  return `${trimmed}.png`;
}

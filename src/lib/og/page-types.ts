import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { categoryMeta, type CategoryKey, getCategoryTagline, getCategorySlug, getCategoryLabel, pillarIllustration } from '@/i18n/categories';
import { ui } from '@/i18n/ui';
import type { Locale } from '@/i18n/locales';

export interface OGCardData {
  pageType: 'home' | 'pillar' | 'category' | 'test';
  locale: Locale;
  title: string;          // serif H1 on the card
  pillLabel: string;      // small uppercase pill
  illustration: string;   // public/-relative path, e.g. "/assets/illustrations/category/cardiometabolic.webp"
  accent: string;         // hex
  outputPath: string;     // relative to public/og/, e.g. "medical-tests/apob.png"
  pageUrl: string;        // canonical pathname, e.g. "/medical-tests/apob/"
}

const HOME_ACCENT = '#1a1a1a';
const PILLAR_ACCENT = '#8B6F4F';

// Resolve project root from this module's location so it works under both
// `tsx scripts/...` and Vitest, regardless of `process.cwd()`.
const REPO_ROOT = join(
  // import.meta.dirname is Node 20.11+; fall back to url-based resolution
  // @ts-ignore — import.meta.dirname may be undefined on older runtimes
  (import.meta as Record<string, unknown>).dirname as string ?? new URL('.', import.meta.url).pathname,
  '..', '..', '..'
);
const TESTS_DIR = join(REPO_ROOT, 'src', 'content', 'medical-tests');

function homeCards(): OGCardData[] {
  return (['en', 'pl', 'es'] as const).map(locale => ({
    pageType: 'home' as const,
    locale,
    title: ui[locale]['og.home.title'],
    pillLabel: ui[locale]['og.home.pill'],
    illustration: pillarIllustration,
    accent: HOME_ACCENT,
    outputPath: `home-${locale}.png`,
    pageUrl: locale === 'en' ? '/' : `/${locale}/`,
  }));
}

function pillarCards(): OGCardData[] {
  return (['en', 'pl'] as const).map(locale => ({
    pageType: 'pillar' as const,
    locale,
    title: ui[locale]['og.pillar.title'],
    pillLabel: ui[locale]['og.pillar.pill'],
    illustration: pillarIllustration,
    accent: PILLAR_ACCENT,
    outputPath: locale === 'en' ? 'medical-tests.png' : 'pl/badania.png',
    pageUrl: locale === 'en' ? '/medical-tests/' : '/pl/badania/',
  }));
}

function categoryCards(): OGCardData[] {
  const out: OGCardData[] = [];
  for (const key of Object.keys(categoryMeta) as CategoryKey[]) {
    for (const locale of ['en', 'pl'] as const) {
      const slug = getCategorySlug(key, locale);
      const pageUrl = locale === 'en' ? `/medical-tests/${slug}/` : `/pl/badania/${slug}/`;
      const outputPath = locale === 'en' ? `medical-tests/${slug}.png` : `pl/badania/${slug}.png`;
      out.push({
        pageType: 'category',
        locale,
        title: getCategoryTagline(key, locale),
        pillLabel: getCategoryLabel(key, locale),
        illustration: categoryMeta[key].illustration ?? pillarIllustration,
        accent: categoryMeta[key].paletteAccent,
        outputPath,
        pageUrl,
      });
    }
  }
  return out;
}

interface TestFrontmatter {
  lang: Locale;
  slug: string;
  title: string;
  categorySlug: CategoryKey;
}

function readTestFrontmatter(filePath: string): TestFrontmatter {
  const raw = readFileSync(filePath, 'utf-8');
  const { data } = matter(raw);
  return {
    lang: data.lang as Locale,
    slug: data.slug as string,
    title: data.title as string,
    categorySlug: data.categorySlug as CategoryKey,
  };
}

function testCards(): OGCardData[] {
  const out: OGCardData[] = [];
  for (const locale of ['en', 'pl'] as const) {
    const dir = join(TESTS_DIR, locale);
    const files = readdirSync(dir).filter(f => f.endsWith('.mdx'));
    for (const file of files) {
      const fm = readTestFrontmatter(join(dir, file));
      const cat = categoryMeta[fm.categorySlug];
      const pageUrl = locale === 'en'
        ? `/medical-tests/${fm.slug}/`
        : `/pl/badania/${fm.slug}/`;
      const outputPath = locale === 'en'
        ? `medical-tests/${fm.slug}.png`
        : `pl/badania/${fm.slug}.png`;
      out.push({
        pageType: 'test',
        locale,
        title: fm.title,
        pillLabel: getCategoryLabel(fm.categorySlug, locale),
        illustration: cat.illustration ?? pillarIllustration,
        accent: cat.paletteAccent,
        outputPath,
        pageUrl,
      });
    }
  }
  return out;
}

export async function collectAllCards(): Promise<OGCardData[]> {
  return [...homeCards(), ...pillarCards(), ...categoryCards(), ...testCards()];
}

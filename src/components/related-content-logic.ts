import type { TestEntry } from '@/lib/medical-tests/queries';
import type { CategoryKey } from '@/i18n/categories';
import type { Locale } from '@/i18n/locales';

export interface SelectRelatedArgs {
  currentSlug: string;
  categoryKey: CategoryKey;
  lang: Locale;
  curated: string[];
  all: TestEntry[];
}

const MAX_ITEMS = 5;
// Curated list must provide at least this many slugs to bypass the fallback.
const MIN_CURATED = 3;
// Suppress the block entirely when fewer than 2 items can be sourced (honest visual).
const MIN_TO_SHOW = 2;

export function selectRelated(args: SelectRelatedArgs): TestEntry[] {
  const inLang = args.all.filter((e) => e.data.lang === args.lang);
  const bySlug = new Map(inLang.map((e) => [e.data.slug, e] as const));

  // Prefer curated when it has >= MIN_CURATED sourceable entries.
  if (args.curated.length >= MIN_CURATED) {
    const picked = args.curated
      .map((s) => bySlug.get(s))
      .filter((x): x is TestEntry => Boolean(x));
    if (picked.length >= MIN_CURATED) return picked.slice(0, MAX_ITEMS);
  }

  // Fallback: same-category siblings, excluding the current slug.
  const siblings = inLang
    .filter((e) => e.data.categorySlug === args.categoryKey && e.data.slug !== args.currentSlug)
    .sort((a, b) => a.data.title.localeCompare(b.data.title))
    .slice(0, MAX_ITEMS);

  // Suppress block entirely when fewer than MIN_TO_SHOW items are available.
  if (siblings.length < MIN_TO_SHOW) return [];
  return siblings;
}

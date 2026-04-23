import { getCollection, type CollectionEntry } from 'astro:content';
import { type Locale } from '@/i18n/locales';
import { type CategoryKey } from '@/i18n/categories';

export type TestEntry = CollectionEntry<'medical-tests'>;

// ─── Pure helpers (unit-tested with fixtures) ──────────────────────────────

export function filterByLang(all: TestEntry[], lang: Locale): TestEntry[] {
  return all.filter((e) => e.data.lang === lang);
}

export function groupByCategory(entries: TestEntry[]): Map<CategoryKey, TestEntry[]> {
  const map = new Map<CategoryKey, TestEntry[]>();
  for (const e of entries) {
    const key = e.data.categorySlug as CategoryKey;
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  // Sort tests within each category alphabetically by title — stable output for SSG.
  for (const arr of map.values()) {
    arr.sort((a, b) => (a.data.title as string).localeCompare(b.data.title as string));
  }
  return map;
}

export function getSiblingsFromFixture(
  entries: TestEntry[],
  currentSlug: string,
  categoryKey: CategoryKey,
  limit: number,
): TestEntry[] {
  return entries
    .filter((e) => e.data.categorySlug === categoryKey && e.data.slug !== currentSlug)
    .sort((a, b) => (a.data.title as string).localeCompare(b.data.title as string))
    .slice(0, limit);
}

// ─── Astro-facing wrappers (thin; not unit-tested) ─────────────────────────

export async function getAllTests(lang: Locale): Promise<TestEntry[]> {
  const all = await getCollection('medical-tests');
  return filterByLang(all, lang);
}

export async function getTestsByCategory(lang: Locale): Promise<Map<CategoryKey, TestEntry[]>> {
  return groupByCategory(await getAllTests(lang));
}

export async function getTestsInCategory(lang: Locale, key: CategoryKey): Promise<TestEntry[]> {
  return (await getAllTests(lang))
    .filter((e) => e.data.categorySlug === key)
    .sort((a, b) => (a.data.title as string).localeCompare(b.data.title as string));
}

export async function getSiblingsByCategory(
  slug: string, categoryKey: CategoryKey, lang: Locale, limit: number,
): Promise<TestEntry[]> {
  return getSiblingsFromFixture(await getAllTests(lang), slug, categoryKey, limit);
}

export async function getTestBySlug(lang: Locale, slug: string): Promise<TestEntry | null> {
  const all = await getAllTests(lang);
  return all.find((e) => e.data.slug === slug) ?? null;
}

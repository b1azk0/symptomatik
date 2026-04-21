import type { CollectionEntry } from 'astro:content';

export function findAlternatesByCanonicalSlug<C extends 'medical-tests'>(
  entries: CollectionEntry<C>[],
  canonicalSlug: string,
): CollectionEntry<C>[] {
  return entries.filter(
    (e) => (e.data as { canonicalSlug: string }).canonicalSlug === canonicalSlug,
  );
}

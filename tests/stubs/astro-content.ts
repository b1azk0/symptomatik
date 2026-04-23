export { z } from 'astro/zod';
export function defineCollection<T>(c: T) { return c; }
export function getCollection(_name: string): Promise<never[]> { return Promise.resolve([]); }

// Minimal structural type so tests that import CollectionEntry can compile.
export type CollectionEntry<_C extends string> = {
  id: string;
  slug: string;
  collection: _C;
  data: Record<string, unknown>;
  body?: string;
};

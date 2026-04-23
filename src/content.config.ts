import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { medicalTestSchema, legalSchema } from '@/content/schemas';

const medicalTests = defineCollection({
  loader: glob({
    pattern: '**/*.mdx',
    base: './src/content/medical-tests',
    // IDs must include the locale path since many tests share the same slug stem
    // across locales (e.g., en/crp.mdx + pl/crp.mdx); default behavior uses only
    // the filename and later entries silently overwrite earlier ones.
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: medicalTestSchema,
});

const legal = defineCollection({
  loader: glob({
    pattern: '**/*.mdx',
    base: './src/content/legal',
    // IDs must include the locale path since the same slug (privacy, terms, etc.)
    // exists in multiple locales; default behavior uses only the filename and collides.
    generateId: ({ entry }) => entry.replace(/\.mdx$/, ''),
  }),
  schema: legalSchema,
});

export const collections = {
  'medical-tests': medicalTests,
  legal,
};

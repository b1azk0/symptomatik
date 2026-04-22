import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { medicalTestSchema, legalSchema } from '@/content/schemas';

const medicalTests = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/medical-tests' }),
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

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { medicalTestSchema } from '@/content/schemas';

const medicalTests = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/medical-tests' }),
  schema: medicalTestSchema,
});

export const collections = {
  'medical-tests': medicalTests,
};

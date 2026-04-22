import { z } from 'zod';

export const medicalTestSchema = z.object({
  slug: z.string(),
  canonicalSlug: z.string(),
  lang: z.enum(['en', 'pl', 'es']),
  title: z.string(),
  titleAlt: z.string().optional(),
  category: z.string(),
  categorySlug: z.string(),
  aiUseCase: z.string(),
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(160),
  h1: z.string(),
  h1Text: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string(),
    }),
  ).length(5),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  relatedTests: z.array(z.string()).optional(),
  relatedSymptoms: z.array(z.string()).optional(),
});

export type MedicalTestData = z.infer<typeof medicalTestSchema>;

export const legalSchema = z.object({
  slug: z.enum(['privacy', 'terms', 'medical-disclaimer', 'cookies']),
  lang: z.enum(['en', 'pl', 'es']),
  title: z.string(),
  metaTitle: z.string().max(60),
  metaDescription: z.string().max(160),
  h1: z.string(),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type LegalData = z.infer<typeof legalSchema>;

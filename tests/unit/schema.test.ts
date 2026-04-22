import { describe, it, expect } from 'vitest';
import { medicalTestSchema } from '@/content/schemas';

const validRow = {
  slug: 'complete-blood-count',
  canonicalSlug: 'complete-blood-count',
  lang: 'en',
  title: 'Complete Blood Count (CBC)',
  category: 'Hematology',
  categorySlug: 'hematology',
  aiUseCase: 'Anemia, infections, inflammatory patterns',
  metaTitle: 'CBC Results & Ranges | Symptomatik',
  metaDescription: 'Understand your Complete Blood Count results and normal ranges.',
  h1: 'Complete Blood Count (CBC): Normal Ranges, Results & Interpretation',
  h1Text: 'A Complete Blood Count (CBC) is a common blood test...',
  sections: Array.from({ length: 5 }, (_, i) => ({ heading: `H2 ${i + 1}`, body: `Body ${i + 1}` })),
  publishedAt: '2026-04-21',
  updatedAt: '2026-04-21',
};

describe('medicalTestSchema', () => {
  it('accepts a valid row', () => {
    const result = medicalTestSchema.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  it('rejects metaTitle > 60 chars', () => {
    const result = medicalTestSchema.safeParse({
      ...validRow,
      metaTitle: 'x'.repeat(61),
    });
    expect(result.success).toBe(false);
  });

  it('rejects metaDescription > 160 chars', () => {
    const result = medicalTestSchema.safeParse({
      ...validRow,
      metaDescription: 'x'.repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it('rejects fewer than 5 sections', () => {
    const result = medicalTestSchema.safeParse({
      ...validRow,
      sections: validRow.sections.slice(0, 4),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid lang', () => {
    const result = medicalTestSchema.safeParse({ ...validRow, lang: 'de' });
    expect(result.success).toBe(false);
  });
});

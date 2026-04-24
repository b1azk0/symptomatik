/**
 * categories-drift.test.ts
 *
 * Runtime safety net: every MDX file's categorySlug must be a key in categoryMeta.
 * This catches drift between content files and the categories source of truth without
 * relying on the Astro content runtime (which is unavailable in plain Vitest).
 *
 * Complement: src/content/schemas.ts enforces the same constraint at Zod / build time
 * (compile-time safety net).
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { categoryMeta } from '@/i18n/categories';

const CONTENT_ROOT = resolve(import.meta.dirname, '../../src/content/medical-tests');

/** Extract the value of `categorySlug` from an MDX file's YAML frontmatter. */
function extractCategorySlug(filePath: string): string | null {
  const raw = readFileSync(filePath, 'utf8');
  // Frontmatter is between the first two --- delimiters
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fm = match[1];
  const field = fm.match(/^categorySlug:\s*"?([^"\n]+)"?/m);
  return field ? field[1].trim() : null;
}

/** Collect all .mdx file paths under a locale directory. */
function mdxFiles(locale: string): string[] {
  const dir = join(CONTENT_ROOT, locale);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => join(dir, f));
}

describe('category slug drift', () => {
  it('every categorySlug in medical-tests content is a key in categoryMeta', () => {
    const knownKeys = new Set(Object.keys(categoryMeta));
    const locales = readdirSync(CONTENT_ROOT).filter((d) => {
      try {
        return readdirSync(join(CONTENT_ROOT, d)).length > 0;
      } catch {
        return false;
      }
    });

    const offenders: { file: string; slug: string }[] = [];

    for (const locale of locales) {
      for (const filePath of mdxFiles(locale)) {
        const slug = extractCategorySlug(filePath);
        if (slug !== null && !knownKeys.has(slug)) {
          offenders.push({ file: filePath, slug });
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

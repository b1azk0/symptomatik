import { describe, it, expect } from 'vitest';
import { collectAllCards } from '@/lib/og/page-types';

describe('collectAllCards', () => {
  it('returns expected counts: 3 homes + 2 pillars + 32 categories + 242 tests = 279', async () => {
    const cards = await collectAllCards();
    const byType = cards.reduce<Record<string, number>>((acc, c) => {
      acc[c.pageType] = (acc[c.pageType] ?? 0) + 1;
      return acc;
    }, {});
    expect(byType).toEqual({ home: 3, pillar: 2, category: 32, test: 242 });
    expect(cards.length).toBe(279);
  });

  it('every card has a non-empty title, pillLabel, illustration path, accent', async () => {
    const cards = await collectAllCards();
    for (const c of cards) {
      expect(c.title, `${c.pageType}/${c.outputPath}`).toBeTruthy();
      expect(c.pillLabel).toBeTruthy();
      expect(c.illustration).toMatch(/\.(webp|svg)$/);
      expect(c.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('outputPath values are unique (no duplicate filenames)', async () => {
    const cards = await collectAllCards();
    const paths = cards.map(c => c.outputPath);
    const unique = new Set(paths);
    expect(unique.size).toBe(paths.length);
  });

  it('every illustration filesystem path exists', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const cards = await collectAllCards();
    for (const c of cards) {
      const fsPath = join(process.cwd(), 'public', c.illustration);
      expect(existsSync(fsPath), `missing illustration: ${fsPath}`).toBe(true);
    }
  });

  it('test cards inherit their category illustration + accent', async () => {
    const cards = await collectAllCards();
    const adiponectin = cards.find(c => c.outputPath === 'medical-tests/adiponectin.png');
    expect(adiponectin).toBeDefined();
    expect(adiponectin!.accent).toBe('#C75040'); // cardiometabolic
    expect(adiponectin!.illustration).toBe('/assets/illustrations/category/cardiometabolic.webp');
  });
});

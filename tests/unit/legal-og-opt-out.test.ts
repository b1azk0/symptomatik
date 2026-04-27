// @vitest-environment node
/**
 * Regression guard: legal pages must use /og-default.png, never a derived
 * /og/<slug>.png card. Asserts against LegalLayout source so any accidental
 * removal of the default is caught immediately.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = new URL('../..', import.meta.url).pathname;
const source = readFileSync(
  join(ROOT, 'src/components/LegalLayout.astro'),
  'utf-8',
);

describe('LegalLayout — OG image opt-out', () => {
  it('defaults ogImage to /og-default.png', () => {
    expect(source).toContain("ogImage = '/og-default.png'");
  });

  it('does not derive a per-path OG card for legal pages', () => {
    // Derived cards live under /og/<slug>.png — legal layout must never use that pattern
    expect(source).not.toMatch(/ogPathForCanonical/);
  });
});

import { test, expect } from '@playwright/test';

// hreflang hrefs are absolute (https://symptomatik.com/...) because astro.config.mjs
// sets `site`. Preview runs at http://localhost:4321, so strip the production host
// before re-requesting to stay self-contained against the local preview server.
const relPath = (absoluteUrl: string) => absoluteUrl.replace(/^https?:\/\/[^/]+/, '');

test.describe('hreflang parity (S1 routes)', () => {
  test('pillar alternates cross-link and return 200', async ({ page, request }) => {
    await page.goto('/medical-tests/');
    const pl = await page.locator('link[rel="alternate"][hreflang="pl"]').getAttribute('href');
    expect(pl).toBeTruthy();
    expect(pl).toMatch(/\/pl\/badania\/?$/);
    const r = await request.get(relPath(pl!));
    expect(r.status()).toBe(200);
  });

  test('category page cross-links match the matching category key', async ({ page, request }) => {
    await page.goto('/medical-tests/hematology/');
    const pl = await page.locator('link[rel="alternate"][hreflang="pl"]').getAttribute('href');
    expect(pl).toMatch(/\/pl\/badania\/hematologia\/?$/);
    const r = await request.get(relPath(pl!));
    expect(r.status()).toBe(200);
  });

  test('PL pillar cross-links back to EN pillar', async ({ page, request }) => {
    await page.goto('/pl/badania/');
    const en = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute('href');
    expect(en).toMatch(/\/medical-tests\/?$/);
    const r = await request.get(relPath(en!));
    expect(r.status()).toBe(200);
  });
});

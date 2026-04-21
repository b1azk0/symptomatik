import { test, expect } from '@playwright/test';

test.describe('core routes respond 200', () => {
  for (const path of [
    '/',
    '/medical-tests/complete-blood-count-cbc/',
    '/pl/',
    '/pl/badania/morfologia-krwi-cbc/',
    '/es/',
  ]) {
    test(`GET ${path}`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    });
  }
});

test('/en/... redirect (runs only against a Cloudflare preview deploy)', async ({ request }) => {
  // Middleware runs at CF runtime, not in `pnpm preview`. In static preview,
  // /en/... simply 404s. Enable this check with CF_PREVIEW=1 against a real
  // preview deploy URL.
  test.skip(!process.env['CF_PREVIEW'], 'requires Cloudflare preview deploy — enable with CF_PREVIEW=1');
  const res = await request.get('/en/medical-tests/complete-blood-count-cbc/', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(res.headers()['location']).toBe('/medical-tests/complete-blood-count-cbc/');
});

test('hreflang cross-links match between EN and PL CBC', async ({ page }) => {
  await page.goto('/medical-tests/complete-blood-count-cbc/');
  const enHreflangPL = await page.locator('link[rel="alternate"][hreflang="pl"]').getAttribute('href');
  expect(enHreflangPL).toContain('/pl/badania/morfologia-krwi-cbc/');

  await page.goto('/pl/badania/morfologia-krwi-cbc/');
  const plHreflangEN = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute('href');
  expect(plHreflangEN).toMatch(/\/medical-tests\/complete-blood-count-cbc\/$/);
  expect(plHreflangEN).not.toContain('/en/');
});

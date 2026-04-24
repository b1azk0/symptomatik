import { test, expect } from '@playwright/test';

test.describe('Pillar search', () => {
  test('EN search "blood" returns ≥ 1 result', async ({ page }) => {
    await page.goto('/medical-tests/');
    const input = page.locator('.pagefind-ui__search-input');
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    await input.fill('blood');
    await page.locator('.pagefind-ui__result').first().waitFor({ timeout: 10_000 });
    expect(await page.locator('.pagefind-ui__result').count()).toBeGreaterThanOrEqual(1);
  });

  test('PL search "morfologia" returns ≥ 1 result', async ({ page }) => {
    await page.goto('/pl/badania/');
    const input = page.locator('.pagefind-ui__search-input');
    await input.waitFor({ state: 'visible', timeout: 15_000 });
    await input.fill('morfologia');
    await page.locator('.pagefind-ui__result').first().waitFor({ timeout: 10_000 });
    expect(await page.locator('.pagefind-ui__result').count()).toBeGreaterThanOrEqual(1);
  });
});

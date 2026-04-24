import { test, expect } from '@playwright/test';

test.describe('Pillar pages', () => {
  test('EN pillar renders with h1, search, and category cards', async ({ page }) => {
    await page.goto('/medical-tests/');
    await expect(page.locator('main h1')).toContainText(/medical tests/i);
    // #pillar-search is the empty mount point Pagefind UI populates; assert it's attached.
    await expect(page.locator('#pillar-search')).toBeAttached();
    expect(await page.locator('a.category-card').count()).toBeGreaterThanOrEqual(8);
  });

  test('PL pillar renders with h1, search, and category cards', async ({ page }) => {
    await page.goto('/pl/badania/');
    await expect(page.locator('main h1')).toContainText(/badania/i);
    await expect(page.locator('#pillar-search')).toBeAttached();
    expect(await page.locator('a.category-card').count()).toBeGreaterThanOrEqual(8);
  });

  test('featured "Start here" section renders 3 TestCards', async ({ page }) => {
    await page.goto('/medical-tests/');
    // Pillar has a "Start here" section with featured TestCards; verify count.
    const featuredSection = page.locator('section', { has: page.locator('h2', { hasText: /start here/i }) });
    expect(await featuredSection.locator('a.test-card').count()).toBe(3);
  });
});

import { test, expect } from '@playwright/test';

test('pillar → category → test navigation path (EN)', async ({ page }) => {
  await page.goto('/medical-tests/');
  // First CategoryCard in the "Browse by category" section
  const categoryLink = page.locator('a.category-card').first();
  await categoryLink.click();
  await expect(page).toHaveURL(/\/medical-tests\/[^/]+\/$/);
  await expect(page.locator('main h1')).toBeVisible();

  // First TestCard on the category page
  const testLink = page.locator('main a.test-card').first();
  await testLink.click();
  await expect(page).toHaveURL(/\/medical-tests\/[^/]+\/$/);
  await expect(page.locator('main h1')).toBeVisible();
});

test('nav "Medical Tests" → pillar (EN)', async ({ page }) => {
  await page.goto('/');
  await page.locator('header nav a', { hasText: /^medical tests$/i }).click();
  await expect(page).toHaveURL(/\/medical-tests\/?$/);
  await expect(page.locator('main h1')).toContainText(/medical tests/i);
});

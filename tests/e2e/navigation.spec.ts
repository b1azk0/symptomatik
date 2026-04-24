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

test('nav "Check Your Lab Results" → pillar (EN)', async ({ page }) => {
  await page.goto('/');
  // The nav link wired in Task 20 — label is "Check Your Lab Results"
  await page.locator('header nav a', { hasText: /check your lab results/i }).click();
  await expect(page).toHaveURL(/\/medical-tests\/?$/);
  await expect(page.locator('main h1')).toContainText(/medical tests/i);
});

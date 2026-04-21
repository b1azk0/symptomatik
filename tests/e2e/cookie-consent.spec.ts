import { test, expect } from '@playwright/test';

test('cookie consent banner appears on first visit', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: /cookie/i })).toBeVisible();
});

test('accept persists and hides banner', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /accept analytics/i }).click();
  await expect(page.getByRole('dialog', { name: /cookie/i })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', { name: /cookie/i })).not.toBeVisible();
});

test('reject persists and hides banner', async ({ page, context }) => {
  // Clear browser storage BEFORE first navigation (localStorage isn't available
  // until a page is loaded; using context.clearCookies + page.evaluate after
  // navigation is the right order).
  await context.clearCookies();
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /^reject$/i }).click();
  await expect(page.getByRole('dialog', { name: /cookie/i })).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog', { name: /cookie/i })).not.toBeVisible();
});

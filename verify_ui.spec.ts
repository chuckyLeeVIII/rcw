import { test, expect } from '@playwright/test';

test('verify computer scan page', async ({ page }) => {
  await page.goto('http://localhost:4173/#/scan');
  await expect(page.locator('h1')).toContainText('Computer Recovery Scan');

  const startButton = page.locator('button', { hasText: 'Start Scan' });
  await expect(startButton).toBeVisible();
  await startButton.click();

  await expect(page.locator('button', { hasText: 'Stop Scan' })).toBeVisible();
  await page.screenshot({ path: 'scan_page.png' });
});

test('verify recovery pool page', async ({ page }) => {
  await page.goto('http://localhost:4173/#/pool');
  await expect(page.locator('h2')).toContainText('Recovery Pool');
  await page.screenshot({ path: 'pool_page.png' });
});

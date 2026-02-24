import { expect, test } from '@playwright/test';

test('home page has expected content', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.home')).toBeVisible();
});

test('dictionary page has expected h1', async ({ page }) => {
	await page.goto('/dictionary');
	await expect(page.locator('h1')).toBeVisible();
});

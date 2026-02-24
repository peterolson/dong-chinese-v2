import { expect, test } from '@playwright/test';

for (const jsEnabled of [true, false]) {
	test.describe(`Wiki pages (JS ${jsEnabled ? 'enabled' : 'disabled'})`, () => {
		test.use({ javaScriptEnabled: jsEnabled });

		test.describe('Home', () => {
			test('renders with h1 and component type overview', async ({ page }) => {
				await page.goto('/wiki');
				await expect(page.locator('h1')).toHaveText('Chinese Character Wiki');
			});

			test('lists all 8 component types', async ({ page }) => {
				await page.goto('/wiki');
				const badges = page.locator('.type-badge');
				await expect(badges).toHaveCount(8);
			});

			test('has quick links to search, lists, and recent changes', async ({ page }) => {
				await page.goto('/wiki');
				await expect(page.getByRole('link', { name: 'Search characters' })).toBeVisible();
				await expect(page.getByRole('link', { name: 'Browse frequency lists' })).toBeVisible();
				await expect(page.getByRole('link', { name: 'View recent changes' })).toBeVisible();
			});

			test('has How to Contribute and Data Sources sections', async ({ page }) => {
				await page.goto('/wiki');
				await expect(page.getByRole('heading', { name: 'How to Contribute' })).toBeVisible();
				await expect(page.getByRole('heading', { name: 'Data Sources' })).toBeVisible();
			});
		});

		test.describe('Search', () => {
			test('renders search form with input and button', async ({ page }) => {
				await page.goto('/wiki/search');
				await expect(page.locator('h1')).toHaveText('Character Search');
				await expect(page.locator('.search-form input[type="search"]')).toBeVisible();
				await expect(page.locator('.search-form .search-button')).toBeVisible();
			});

			test('search form uses GET method (no-JS baseline)', async ({ page }) => {
				await page.goto('/wiki/search');
				const form = page.locator('form.search-form');
				await expect(form).toHaveAttribute('method', 'get');
				await expect(form).toHaveAttribute('action', '/wiki/search');
			});

			test('searching for 人 returns results', async ({ page }) => {
				await page.goto('/wiki/search?q=%E4%BA%BA');
				await expect(page.locator('.results-table')).toBeVisible();
				const rows = page.locator('.results-table tbody tr');
				expect(await rows.count()).toBeGreaterThan(0);
			});

			test('shows "no results" for gibberish query', async ({ page }) => {
				await page.goto('/wiki/search?q=zzzzxxx999');
				await expect(page.locator('.no-results')).toBeVisible();
			});

			test('search result links point to wiki character pages', async ({ page }) => {
				await page.goto('/wiki/search?q=%E4%BA%BA');
				const firstLink = page.locator('.char-cell a').first();
				const href = await firstLink.getAttribute('href');
				expect(href).toMatch(/\/wiki\/.+/);
			});

			test('submitting search form navigates with query parameter', async ({ page }) => {
				await page.goto('/wiki/search');
				await page.locator('.search-form input[type="search"]').fill('水');
				await page.locator('.search-form .search-button').click();
				await expect(page).toHaveURL(/\/wiki\/search\?q=/);
			});
		});

		test.describe('Lists', () => {
			test('renders list index page with 4 list types', async ({ page }) => {
				await page.goto('/wiki/lists');
				await expect(page.locator('h1')).toHaveText('Character Lists');
				const cards = page.locator('.list-card');
				await expect(cards).toHaveCount(4);
			});

			test('list cards have correct headings', async ({ page }) => {
				await page.goto('/wiki/lists');
				await expect(page.getByRole('heading', { name: 'Movie Frequency' })).toBeVisible();
				await expect(page.getByRole('heading', { name: 'Context Diversity' })).toBeVisible();
				await expect(page.getByRole('heading', { name: 'Book Frequency' })).toBeVisible();
				await expect(page.getByRole('heading', { name: 'Most Common Components' })).toBeVisible();
			});

			test('list cards are links to list pages', async ({ page }) => {
				await page.goto('/wiki/lists');
				const firstCard = page.locator('.list-card').first();
				const href = await firstCard.getAttribute('href');
				expect(href).toMatch(/\/wiki\/lists\/.+/);
			});

			test('subtlex-rank list loads with characters', async ({ page }) => {
				await page.goto('/wiki/lists/subtlex-rank/0/100');
				const rows = page.locator('table tbody tr');
				expect(await rows.count()).toBeGreaterThan(0);
			});
		});

		test.describe('Character entry', () => {
			test('renders character data for a known character', async ({ page }) => {
				// First search to find a character that exists, then visit it
				await page.goto('/wiki/search?q=%E4%BA%BA');
				const firstLink = page.locator('.char-cell a').first();
				const href = await firstLink.getAttribute('href');
				expect(href).toBeTruthy();

				await page.goto(href!);
				// The page should render without error (has main content area)
				await expect(page.locator('.main-content')).toBeVisible();
			});
		});

		test.describe('Character edit', () => {
			test('edit page has form with POST method', async ({ page }) => {
				// Navigate via search to find a valid character
				await page.goto('/wiki/search?q=%E4%BA%BA');
				const firstLink = page.locator('.char-cell a').first();
				const href = await firstLink.getAttribute('href');
				expect(href).toBeTruthy();

				// Go to the edit page for that character
				await page.goto(href + '/edit');
				// The edit form should have a POST form action
				const form = page.locator('form[action*="submitEdit"]');
				expect(await form.count()).toBeGreaterThan(0);
			});
		});

		test.describe('Navigation', () => {
			test('wiki home → search via quick link', async ({ page }) => {
				await page.goto('/wiki');
				await page.getByRole('link', { name: 'Search characters' }).click();
				await expect(page).toHaveURL(/\/wiki\/search/);
				await expect(page.locator('h1')).toHaveText('Character Search');
			});

			test('wiki home → lists via quick link', async ({ page }) => {
				await page.goto('/wiki');
				await page.getByRole('link', { name: 'Browse frequency lists' }).click();
				await expect(page).toHaveURL(/\/wiki\/lists/);
				await expect(page.locator('h1')).toHaveText('Character Lists');
			});

			test('wiki home → recent changes via quick link', async ({ page }) => {
				await page.goto('/wiki');
				await page.getByRole('link', { name: 'View recent changes' }).click();
				await expect(page).toHaveURL(/\/wiki\/recent-changes/);
			});
		});
	});
}

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

			test('search page handles query without errors', async ({ page }) => {
				// In CI the database may be empty, so we verify the page renders correctly
				// regardless of whether results exist
				await page.goto('/wiki/search?q=%E4%BA%BA');
				await expect(page.locator('h1')).toHaveText('Character Search');
				// Should show either results table or "no results" message
				const hasResults = (await page.locator('.results-table').count()) > 0;
				const hasNoResults = (await page.locator('.no-results').count()) > 0;
				expect(hasResults || hasNoResults).toBe(true);
			});

			test('shows "no results" for gibberish query', async ({ page }) => {
				await page.goto('/wiki/search?q=zzzzxxx999');
				await expect(page.locator('.no-results')).toBeVisible();
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

			test('subtlex-rank list page loads without error', async ({ page }) => {
				// In CI the database may be empty. Verify the page loads (h1 renders).
				await page.goto('/wiki/lists/subtlex-rank/0/100');
				await expect(page.locator('h1')).toBeVisible();
			});
		});

		test.describe('Recent changes', () => {
			test('recent changes page loads without error', async ({ page }) => {
				await page.goto('/wiki/recent-changes');
				await expect(page.locator('h1')).toBeVisible();
			});
		});

		test.describe('Edit', () => {
			test('rejects a no-change edit and shows error', async ({ page }) => {
				await page.goto('/wiki/%E8%8A%B1/edit');
				const editComment = page.getByRole('textbox', { name: 'Edit Comment (required)' });
				await editComment.fill('test no changes');
				await page.getByRole('button', { name: /Submit/ }).click();

				// Should stay on the edit page (not redirect)
				await expect(page).toHaveURL(/\/wiki\/.*\/edit/);

				// Should show an error alert
				await expect(page.getByRole('alert')).toContainText('No fields were changed');
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

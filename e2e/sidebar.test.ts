import { expect, test } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 375, height: 812 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

for (const jsEnabled of [true, false]) {
	test.describe(`Sidebar (JS ${jsEnabled ? 'enabled' : 'disabled'})`, () => {
		test.use({ javaScriptEnabled: jsEnabled });

		test.describe('Desktop', () => {
			test.use({ viewport: DESKTOP_VIEWPORT });

			if (jsEnabled) {
				test('hidden sidebar stays hidden after client-side navigation', async ({ page }) => {
					await page.goto('/dictionary');
					const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
					const menuButton = page.getByLabel('Toggle navigation');

					// Hide sidebar via toggle
					await menuButton.click();
					await expect(sidebar).toBeHidden();

					// Trigger client-side navigation by clicking a link elsewhere on the page
					await page.getByRole('link', { name: 'Dong Chinese' }).click();
					await page.waitForURL('/');

					// Sidebar should still be hidden (afterNavigate must not uncheck on desktop)
					await expect(sidebar).toBeHidden();
				});
			}

			test('sidebar is visible by default', async ({ page }) => {
				await page.goto('/dictionary');
				const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
				await expect(sidebar).toBeVisible();
			});

			test('sidebar contains all navigation links', async ({ page }) => {
				await page.goto('/dictionary');
				const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
				await expect(sidebar.getByRole('link', { name: 'Learn' })).toBeVisible();
				await expect(sidebar.getByRole('link', { name: 'Dictionary' })).toBeVisible();
				await expect(sidebar.getByRole('link', { name: 'Media' })).toBeVisible();
				await expect(sidebar.getByRole('link', { name: 'Settings' })).toBeVisible();
			});

			test('hamburger menu button is visible on desktop', async ({ page }) => {
				await page.goto('/dictionary');
				const menuButton = page.getByLabel('Toggle navigation');
				await expect(menuButton).toBeVisible();
			});

			test('sidebar shifts the main content layout', async ({ page }) => {
				await page.goto('/dictionary');
				const main = page.locator('main');
				const mainBox = await main.boundingBox();
				// Main content should be offset from the left by at least the sidebar width
				expect(mainBox!.x).toBeGreaterThanOrEqual(200);
			});

			test('clicking hamburger hides sidebar on desktop', async ({ page }) => {
				await page.goto('/dictionary');
				const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
				await expect(sidebar).toBeVisible();

				const menuButton = page.getByLabel('Toggle navigation');
				await menuButton.click();

				await expect(sidebar).toBeHidden();

				// Main content should now start near the left edge
				const main = page.locator('main');
				const mainBox = await main.boundingBox();
				expect(mainBox!.x).toBeLessThan(100);
			});

			test('clicking hamburger twice restores sidebar on desktop', async ({ page }) => {
				await page.goto('/dictionary');
				const menuButton = page.getByLabel('Toggle navigation');
				const sidebar = page.getByRole('navigation', { name: 'Main navigation' });

				// Hide
				await menuButton.click();
				await expect(sidebar).toBeHidden();

				// Show again
				await menuButton.click();
				await expect(sidebar).toBeVisible();
			});
		});

		test.describe('Mobile', () => {
			test.use({ viewport: MOBILE_VIEWPORT });

			if (jsEnabled) {
				test('sidebar closes after clicking a nav link', async ({ page }) => {
					await page.goto('/dictionary');
					const menuButton = page.getByLabel('Toggle navigation');
					await menuButton.click();

					const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
					await expect(sidebar).toBeInViewport();

					// Click a nav link to trigger client-side navigation
					const settingsLink = sidebar.getByRole('link', { name: 'Settings' });
					await settingsLink.click();

					await expect(page).toHaveURL(/\/settings/);
					await expect(sidebar).not.toBeInViewport();
				});
			}

			test('sidebar is hidden by default', async ({ page }) => {
				await page.goto('/dictionary');
				const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
				await expect(sidebar).not.toBeInViewport();
			});

			test('hamburger menu button is visible', async ({ page }) => {
				await page.goto('/dictionary');
				const menuButton = page.getByLabel('Toggle navigation');
				await expect(menuButton).toBeVisible();
			});

			test('clicking hamburger opens sidebar', async ({ page }) => {
				await page.goto('/dictionary');
				const menuButton = page.getByLabel('Toggle navigation');
				await menuButton.click();

				const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
				await expect(sidebar).toBeInViewport();
			});

			test('backdrop appears when sidebar is open', async ({ page }) => {
				await page.goto('/dictionary');
				const menuButton = page.getByLabel('Toggle navigation');
				const backdrop = page.locator('.sidebar-backdrop');

				// Backdrop should not be visible initially
				await expect(backdrop).toBeHidden();

				await menuButton.click();

				// Backdrop should now be visible
				await expect(backdrop).toBeVisible();
			});

			test('clicking backdrop closes sidebar', async ({ page }) => {
				await page.goto('/dictionary');
				const menuButton = page.getByLabel('Toggle navigation');
				await menuButton.click();

				const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
				await expect(sidebar).toBeInViewport();

				// Click the backdrop to close
				const backdrop = page.locator('.sidebar-backdrop');
				await backdrop.click({ position: { x: 350, y: 400 } });

				await expect(sidebar).not.toBeInViewport();
			});

			test('sidebar floats over content (does not shift layout)', async ({ page }) => {
				await page.goto('/dictionary');
				const main = page.locator('main');
				const mainBoxBefore = await main.boundingBox();

				const menuButton = page.getByLabel('Toggle navigation');
				await menuButton.click();

				const mainBoxAfter = await main.boundingBox();
				// Main content should stay in the same position
				expect(mainBoxAfter!.x).toBe(mainBoxBefore!.x);
			});

			test('navigation links are accessible when sidebar is open', async ({ page }) => {
				await page.goto('/dictionary');
				const menuButton = page.getByLabel('Toggle navigation');
				await menuButton.click();

				const sidebar = page.getByRole('navigation', { name: 'Main navigation' });
				const learnLink = sidebar.getByRole('link', { name: 'Learn' });
				await expect(learnLink).toBeVisible();
				const href = await learnLink.getAttribute('href');
				expect(href === '/learn' || href === './learn').toBe(true);
			});
		});
	});
}

test.describe('Component type explain modal', () => {
	test('modal closes when clicking a character link inside it', async ({ page }) => {
		// Navigate to a character with component types (好 has meaning + sound)
		await page.goto('/dictionary/好');

		// Click a component type link to open the explain modal
		const typeLink = page.locator('.component-type-link').first();
		await typeLink.click();

		// Modal should be visible
		const dialog = page.locator('dialog[open]');
		await expect(dialog).toBeVisible();

		// Click a character link inside the modal to navigate
		const charLink = dialog.locator('.cell-char').first();
		await charLink.click();

		// URL should change to the clicked character's page
		await expect(page).not.toHaveURL(/\/dictionary\/好/);
		await expect(page).toHaveURL(/\/dictionary\/.+/);

		// Modal should close after navigation
		await expect(dialog).not.toBeVisible();
	});
});

test.describe('Header', () => {
	test('displays logo', async ({ page }) => {
		await page.goto('/dictionary');
		const logo = page.locator('.site-logo');
		await expect(logo).toBeVisible();
		await expect(logo).toHaveAttribute('alt', '懂中文 Dong Chinese');
	});

	test('displays login link when not authenticated', async ({ page }) => {
		await page.goto('/dictionary');
		const loginLink = page.getByRole('link', { name: 'Log in' });
		await expect(loginLink).toBeVisible();
	});
});

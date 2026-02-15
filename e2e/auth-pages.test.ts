import { expect, test } from '@playwright/test';

for (const jsEnabled of [true, false]) {
	test.describe(`Auth pages (JS ${jsEnabled ? 'enabled' : 'disabled'})`, () => {
		test.use({ javaScriptEnabled: jsEnabled });

		test.describe('Login page', () => {
			test('renders login form with correct fields', async ({ page }) => {
				await page.goto('/login');

				await expect(page.locator('h1')).toHaveText('Log in');

				const signInForm = page.locator('form[action="?/signIn"]');
				await expect(signInForm.locator('input[name="identifier"]')).toBeVisible();
				await expect(signInForm.locator('input[name="password"]')).toBeVisible();
				await expect(signInForm.locator('button[type="submit"]')).toContainText('Log in');
			});

			test('has link to register page', async ({ page }) => {
				await page.goto('/login');

				const registerLink = page.locator('.auth-links a', { hasText: 'Create an account' });
				await expect(registerLink).toBeVisible();
				await expect(registerLink).toHaveAttribute('href', /register/);
			});

			test('has link to forgot password page', async ({ page }) => {
				await page.goto('/login');

				const forgotLink = page.locator('.auth-links a', { hasText: 'Forgot password?' });
				await expect(forgotLink).toBeVisible();
				await expect(forgotLink).toHaveAttribute('href', /forgot-password/);
			});

			test('form submits via POST (no-JS baseline)', async ({ page }) => {
				await page.goto('/login');

				const form = page.locator('form[action="?/signIn"]');
				await expect(form).toHaveAttribute('method', 'post');
			});

			test('magic link form is present', async ({ page }) => {
				await page.goto('/login');

				const magicForm = page.locator('form[action="?/sendMagicLink"]');
				await expect(magicForm).toBeVisible();
				await expect(magicForm.locator('input[name="email"]')).toBeVisible();
			});

			test('navigating to register works', async ({ page }) => {
				await page.goto('/login');
				await page.locator('.auth-links a', { hasText: 'Create an account' }).click();
				await expect(page.locator('h1')).toHaveText('Create an account');
			});

			test('navigating to forgot password works', async ({ page }) => {
				await page.goto('/login');
				await page.locator('.auth-links a', { hasText: 'Forgot password?' }).click();
				await expect(page.locator('h1')).toHaveText('Reset your password');
			});
		});

		test.describe('Register page', () => {
			test('renders registration form with correct fields', async ({ page }) => {
				await page.goto('/register');

				await expect(page.locator('h1')).toHaveText('Create an account');

				const signUpForm = page.locator('form[action="?/signUp"]');
				await expect(signUpForm.locator('input[name="name"]')).toBeVisible();
				await expect(signUpForm.locator('input[name="email"]')).toBeVisible();
				await expect(signUpForm.locator('input[name="username"]')).toBeVisible();
				await expect(signUpForm.locator('input[name="password"]')).toBeVisible();
				await expect(signUpForm.locator('input[name="confirmPassword"]')).toBeVisible();
				await expect(signUpForm.locator('button[type="submit"]')).toContainText('Create account');
			});

			test('form submits via POST (no-JS baseline)', async ({ page }) => {
				await page.goto('/register');

				const form = page.locator('form[action="?/signUp"]');
				await expect(form).toHaveAttribute('method', 'post');
			});

			test('has link back to login', async ({ page }) => {
				await page.goto('/register');

				const loginLink = page.locator('.auth-footer a', { hasText: 'Log in' });
				await expect(loginLink).toBeVisible();
				await expect(loginLink).toHaveAttribute('href', /login/);
			});

			test('name and username are optional (no required attribute)', async ({ page }) => {
				await page.goto('/register');

				const signUpForm = page.locator('form[action="?/signUp"]');
				await expect(signUpForm.locator('input[name="name"]')).not.toHaveAttribute('required', '');
				await expect(signUpForm.locator('input[name="username"]')).not.toHaveAttribute(
					'required',
					''
				);
			});

			test('email and password are required', async ({ page }) => {
				await page.goto('/register');

				const signUpForm = page.locator('form[action="?/signUp"]');
				await expect(signUpForm.locator('input[name="email"]')).toHaveAttribute('required', '');
				await expect(signUpForm.locator('input[name="password"]')).toHaveAttribute('required', '');
				await expect(signUpForm.locator('input[name="confirmPassword"]')).toHaveAttribute(
					'required',
					''
				);
			});
		});

		test.describe('Forgot password page', () => {
			test('renders forgot password form', async ({ page }) => {
				await page.goto('/forgot-password');

				await expect(page.locator('h1')).toHaveText('Reset your password');

				const form = page.locator('form[action="?/requestReset"]');
				await expect(form.locator('input[name="email"]')).toBeVisible();
				await expect(form.locator('button[type="submit"]')).toContainText('Send reset link');
			});

			test('form submits via POST (no-JS baseline)', async ({ page }) => {
				await page.goto('/forgot-password');

				const form = page.locator('form[action="?/requestReset"]');
				await expect(form).toHaveAttribute('method', 'post');
			});

			test('has link back to login', async ({ page }) => {
				await page.goto('/forgot-password');

				const loginLink = page.locator('.auth-footer a', { hasText: 'Back to log in' });
				await expect(loginLink).toBeVisible();
				await expect(loginLink).toHaveAttribute('href', /login/);
			});
		});

		test.describe('Reset password page', () => {
			test('redirects to forgot-password when no token is present', async ({ page }) => {
				await page.goto('/reset-password');
				await expect(page).toHaveURL(/forgot-password/);
			});

			test('renders reset form when token is present', async ({ page }) => {
				await page.goto('/reset-password?token=test-token');

				await expect(page.locator('h1')).toHaveText('Set a new password');

				const form = page.locator('form[action="?/resetPassword"]');
				await expect(form.locator('input[name="newPassword"]')).toBeVisible();
				await expect(form.locator('input[name="confirmPassword"]')).toBeVisible();
				await expect(form.locator('button[type="submit"]')).toContainText('Reset password');
			});

			test('form submits via POST with hidden token (no-JS baseline)', async ({ page }) => {
				await page.goto('/reset-password?token=test-token');

				const form = page.locator('form[action="?/resetPassword"]');
				await expect(form).toHaveAttribute('method', 'post');

				const hiddenToken = form.locator('input[name="token"][type="hidden"]');
				await expect(hiddenToken).toHaveValue('test-token');
			});

			test('has link back to login', async ({ page }) => {
				await page.goto('/reset-password?token=test-token');

				const loginLink = page.locator('.auth-footer a', { hasText: 'Back to log in' });
				await expect(loginLink).toBeVisible();
			});
		});

		test.describe('Navigation between auth pages', () => {
			test('login → register → login round-trip', async ({ page }) => {
				await page.goto('/login');
				await expect(page.locator('h1')).toHaveText('Log in');

				await page.locator('.auth-links a', { hasText: 'Create an account' }).click();
				await expect(page.locator('h1')).toHaveText('Create an account');

				await page.locator('.auth-footer a', { hasText: 'Log in' }).click();
				await expect(page.locator('h1')).toHaveText('Log in');
			});

			test('login → forgot password → login round-trip', async ({ page }) => {
				await page.goto('/login');
				await expect(page.locator('h1')).toHaveText('Log in');

				await page.locator('.auth-links a', { hasText: 'Forgot password?' }).click();
				await expect(page.locator('h1')).toHaveText('Reset your password');

				await page.locator('.auth-footer a', { hasText: 'Back to log in' }).click();
				await expect(page.locator('h1')).toHaveText('Log in');
			});
		});
	});
}

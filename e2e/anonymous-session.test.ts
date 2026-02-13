import { expect, test, type BrowserContext } from '@playwright/test';

const COOKIE_NAME = 'anonymous_session_id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

function getAnonymousCookie(context: BrowserContext) {
	return context.cookies().then((cookies) => cookies.find((c) => c.name === COOKIE_NAME));
}

for (const jsEnabled of [true, false]) {
	test.describe(`Anonymous session (JS ${jsEnabled ? 'enabled' : 'disabled'})`, () => {
		test.use({ javaScriptEnabled: jsEnabled });

		test('first visit sets cookie with correct attributes', async ({ page }) => {
			await page.goto('/');

			const cookie = await getAnonymousCookie(page.context());
			expect(cookie).toBeDefined();
			expect(cookie!.value).toMatch(UUID_REGEX);
			expect(cookie!.httpOnly).toBe(true);
			expect(cookie!.sameSite).toBe('Lax');
			expect(cookie!.path).toBe('/');
			// Max-Age should be approximately 30 days (allow some tolerance for test execution time)
			expect(cookie!.expires).toBeGreaterThan(Date.now() / 1000 + THIRTY_DAYS_SECONDS - 60);
		});

		test('return visit reuses existing session', async ({ page, context }) => {
			// First visit — sets the cookie
			await page.goto('/');
			const cookie = await getAnonymousCookie(context);
			expect(cookie).toBeDefined();
			const firstId = cookie!.value;

			// Second visit — intercept response to check for set-cookie header
			const [response] = await Promise.all([page.waitForResponse('**/'), page.goto('/')]);

			const setCookieHeaders = response?.headers()['set-cookie'] ?? '';
			expect(setCookieHeaders).not.toContain(COOKIE_NAME);

			// Cookie value should remain the same
			const cookieAfter = await getAnonymousCookie(context);
			expect(cookieAfter!.value).toBe(firstId);
		});

		test('invalid cookie gets replaced with a new session', async ({ page, context }) => {
			const fakeId = '00000000-0000-0000-0000-000000000000';

			// Set a fake cookie that doesn't exist in the DB
			await context.addCookies([
				{
					name: COOKIE_NAME,
					value: fakeId,
					domain: 'localhost',
					path: '/'
				}
			]);

			await page.goto('/');

			const cookie = await getAnonymousCookie(context);
			expect(cookie).toBeDefined();
			expect(cookie!.value).toMatch(UUID_REGEX);
			expect(cookie!.value).not.toBe(fakeId);
		});

		test('cookie persists across different pages', async ({ page, context }) => {
			await page.goto('/');
			const cookie = await getAnonymousCookie(context);
			expect(cookie).toBeDefined();
			const firstId = cookie!.value;

			// Navigate to a different page
			const [response] = await Promise.all([page.waitForResponse('**/demo'), page.goto('/demo')]);

			const setCookieHeaders = response?.headers()['set-cookie'] ?? '';
			expect(setCookieHeaders).not.toContain(COOKIE_NAME);

			const cookieAfter = await getAnonymousCookie(context);
			expect(cookieAfter!.value).toBe(firstId);
		});
	});
}

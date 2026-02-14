import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock all external dependencies before importing the module under test
const mockEnv: Record<string, string | undefined> = {};

vi.mock('$env/dynamic/private', () => ({
	env: new Proxy(mockEnv, {
		get: (target, prop: string) => target[prop]
	})
}));

vi.mock('$app/server', () => ({
	getRequestEvent: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {}
}));

vi.mock('better-auth', () => ({
	betterAuth: vi.fn(() => ({
		api: {},
		$Infer: { Session: { user: {} } }
	}))
}));

vi.mock('better-auth/adapters/drizzle', () => ({
	drizzleAdapter: vi.fn()
}));

vi.mock('better-auth/plugins/username', () => ({
	username: vi.fn(() => ({}))
}));

vi.mock('better-auth/svelte-kit', () => ({
	sveltekitCookies: vi.fn(() => ({}))
}));

// Must use dynamic import so mocks are active when module loads
const { getConfiguredSocialProviders } = await import('./auth');

describe('getConfiguredSocialProviders', () => {
	beforeEach(() => {
		// Clear all env vars between tests
		for (const key of Object.keys(mockEnv)) {
			delete mockEnv[key];
		}
	});

	it('returns empty array when no providers are configured', () => {
		const providers = getConfiguredSocialProviders();
		expect(providers).toEqual([]);
	});

	it('returns github when both GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set', () => {
		mockEnv['GITHUB_CLIENT_ID'] = 'gh-id';
		mockEnv['GITHUB_CLIENT_SECRET'] = 'gh-secret';

		const providers = getConfiguredSocialProviders();
		expect(providers).toEqual([{ name: 'github', label: 'GitHub' }]);
	});

	it('does not return github when only GITHUB_CLIENT_ID is set', () => {
		mockEnv['GITHUB_CLIENT_ID'] = 'gh-id';

		const providers = getConfiguredSocialProviders();
		expect(providers).toEqual([]);
	});

	it('returns multiple providers when configured', () => {
		mockEnv['GITHUB_CLIENT_ID'] = 'gh-id';
		mockEnv['GITHUB_CLIENT_SECRET'] = 'gh-secret';
		mockEnv['GOOGLE_CLIENT_ID'] = 'google-id';
		mockEnv['GOOGLE_CLIENT_SECRET'] = 'google-secret';

		const providers = getConfiguredSocialProviders();
		expect(providers).toHaveLength(2);
		expect(providers).toContainEqual({ name: 'github', label: 'GitHub' });
		expect(providers).toContainEqual({ name: 'google', label: 'Google' });
	});

	it('returns all four providers when all are configured', () => {
		mockEnv['GITHUB_CLIENT_ID'] = 'gh-id';
		mockEnv['GITHUB_CLIENT_SECRET'] = 'gh-secret';
		mockEnv['GOOGLE_CLIENT_ID'] = 'google-id';
		mockEnv['GOOGLE_CLIENT_SECRET'] = 'google-secret';
		mockEnv['FACEBOOK_CLIENT_ID'] = 'fb-id';
		mockEnv['FACEBOOK_CLIENT_SECRET'] = 'fb-secret';
		mockEnv['TWITTER_CLIENT_ID'] = 'tw-id';
		mockEnv['TWITTER_CLIENT_SECRET'] = 'tw-secret';

		const providers = getConfiguredSocialProviders();
		expect(providers).toHaveLength(4);
		expect(providers.map((p) => p.name)).toEqual(['github', 'google', 'facebook', 'twitter']);
	});
});

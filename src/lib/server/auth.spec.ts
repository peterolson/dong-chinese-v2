import { createHash } from 'node:crypto';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

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
		expect(providers).toEqual([{ name: 'github', label: 'GitHub', order: 3 }]);
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
		expect(providers).toContainEqual({ name: 'github', label: 'GitHub', order: 3 });
		expect(providers).toContainEqual({ name: 'google', label: 'Google', order: 1 });
	});

	it('returns all three providers sorted by order when all are configured', () => {
		mockEnv['GITHUB_CLIENT_ID'] = 'gh-id';
		mockEnv['GITHUB_CLIENT_SECRET'] = 'gh-secret';
		mockEnv['GOOGLE_CLIENT_ID'] = 'google-id';
		mockEnv['GOOGLE_CLIENT_SECRET'] = 'google-secret';
		mockEnv['FACEBOOK_CLIENT_ID'] = 'fb-id';
		mockEnv['FACEBOOK_CLIENT_SECRET'] = 'fb-secret';

		const providers = getConfiguredSocialProviders();
		expect(providers).toHaveLength(3);
		expect(providers.map((p) => p.name)).toEqual(['google', 'facebook', 'github']);
	});
});

describe('bcrypt(sha256(password)) — Meteor-compatible password scheme', () => {
	// Helper matching the auth.ts implementation
	const hashFn = async (password: string) => {
		const sha256 = createHash('sha256').update(password).digest('hex');
		return bcrypt.hash(sha256, 10);
	};
	const verifyFn = async ({ hash, password }: { hash: string; password: string }) => {
		const sha256 = createHash('sha256').update(password).digest('hex');
		return bcrypt.compare(sha256, hash);
	};

	it('hashes and verifies a new password', async () => {
		const hash = await hashFn('mySecurePassword!');
		expect(hash).toMatch(/^\$2[ab]\$10\$/);
		expect(await verifyFn({ hash, password: 'mySecurePassword!' })).toBe(true);
		expect(await verifyFn({ hash, password: 'wrong' })).toBe(false);
	});

	it('verifies a Meteor-imported hash (bcrypt of sha256 digest)', async () => {
		// Simulate a Meteor-stored hash
		const sha256 = createHash('sha256').update('tester').digest('hex');
		const meteorHash = await bcrypt.hash(sha256, 10);

		expect(await verifyFn({ hash: meteorHash, password: 'tester' })).toBe(true);
		expect(await verifyFn({ hash: meteorHash, password: 'wrong' })).toBe(false);
	});

	it('rejects raw password against a Meteor hash (must sha256 first)', async () => {
		const sha256 = createHash('sha256').update('tester').digest('hex');
		const meteorHash = await bcrypt.hash(sha256, 10);

		// Without sha256, raw password should NOT match
		expect(await bcrypt.compare('tester', meteorHash)).toBe(false);
	});

	it('round-trips correctly: hash then verify', async () => {
		const password = 'café☕unicode';
		const hash = await hashFn(password);
		expect(await verifyFn({ hash, password })).toBe(true);
	});
});

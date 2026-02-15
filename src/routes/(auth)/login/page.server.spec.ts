import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SocialProviderName } from '$lib/server/auth';

// ── Mocks ──────────────────────────────────────────────────────

type SocialProvider = { name: SocialProviderName; label: string };

const mockSignInEmail = vi.fn();
const mockSignInUsername = vi.fn();
const mockSignInSocial = vi.fn();
const mockSignOut = vi.fn();
const mockGetConfiguredSocialProviders = vi.fn<() => SocialProvider[]>(() => []);

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			signInEmail: (...args: unknown[]) => mockSignInEmail(...args),
			signInUsername: (...args: unknown[]) => mockSignInUsername(...args),
			signInSocial: (...args: unknown[]) => mockSignInSocial(...args),
			signOut: (...args: unknown[]) => mockSignOut(...args)
		}
	},
	getConfiguredSocialProviders: () => mockGetConfiguredSocialProviders()
}));

// Mock the db module — mockDbSelect controls what the user_email query returns
const mockDbSelectResult = vi.fn<() => Array<{ userId: string }>>(() => []);
const mockDbSelectUserResult = vi.fn<() => Array<{ email: string }>>(() => []);
let dbSelectCallCount = 0;

vi.mock('$lib/server/db', () => {
	// Build a chainable mock for db.select().from().innerJoin().where().limit()
	const makeChain = (resultFn: () => unknown[]) => {
		const chain = {
			from: vi.fn().mockReturnThis(),
			innerJoin: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn(() => resultFn())
		};
		return chain;
	};

	return {
		db: {
			select: vi.fn(() => {
				dbSelectCallCount++;
				// First select() call is the user_email lookup, second is the user primary email lookup
				if (dbSelectCallCount % 2 === 1) {
					return makeChain(mockDbSelectResult);
				}
				return makeChain(mockDbSelectUserResult);
			})
		}
	};
});

vi.mock('$lib/server/db/schema', () => ({
	userEmail: { userId: 'user_id', email: 'email' }
}));

vi.mock('$lib/server/db/auth.schema', () => ({
	user: { id: 'id', email: 'email' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

vi.mock('$lib/server/services/sanitize-redirect', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/services/sanitize-redirect')>(
		'$lib/server/services/sanitize-redirect'
	);
	return actual;
});

const { load, actions } = await import('./+page.server');

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(
	overrides: {
		user?: { id: string; name: string } | null;
		searchParams?: Record<string, string>;
	} = {}
) {
	const url = new URL('http://localhost:5173/login');
	if (overrides.searchParams) {
		for (const [k, v] of Object.entries(overrides.searchParams)) {
			url.searchParams.set(k, v);
		}
	}
	return {
		locals: { user: overrides.user ?? null },
		url
	} as Parameters<typeof load>[0];
}

function makeActionEvent(formEntries: Record<string, string>) {
	const form = new FormData();
	for (const [k, v] of Object.entries(formEntries)) {
		form.set(k, v);
	}
	return {
		request: {
			formData: () => Promise.resolve(form),
			headers: new Headers()
		}
	} as Parameters<NonNullable<typeof actions>['signIn']>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetConfiguredSocialProviders.mockReturnValue([]);
	mockDbSelectResult.mockReturnValue([]);
	mockDbSelectUserResult.mockReturnValue([]);
	dbSelectCallCount = 0;
});

describe('load', () => {
	it('redirects authenticated users to /', async () => {
		const event = makeEvent({ user: { id: '1', name: 'Alice' } });
		await expect(load(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: '/' })
		);
		expect.assertions(1);
	});

	it('returns social providers and redirectTo for anonymous users', async () => {
		mockGetConfiguredSocialProviders.mockReturnValue([{ name: 'github', label: 'GitHub' }]);
		const event = makeEvent({ searchParams: { redirectTo: '/dashboard' } });
		const result = await load(event);

		expect(result).toEqual({
			socialProviders: [{ name: 'github', label: 'GitHub' }],
			redirectTo: '/dashboard'
		});
	});

	it('sanitizes redirectTo from search params', async () => {
		const event = makeEvent({ searchParams: { redirectTo: '//evil.com' } });
		const result = (await load(event)) as { redirectTo: string };

		expect(result.redirectTo).toBe('/');
	});

	it('defaults redirectTo to / when not provided', async () => {
		const event = makeEvent();
		const result = (await load(event)) as { redirectTo: string };

		expect(result.redirectTo).toBe('/');
	});
});

describe('actions.signIn', () => {
	it('returns 400 when identifier is missing', async () => {
		const event = makeActionEvent({ identifier: '', password: 'pw' });
		const result = await actions!.signIn(event);

		expect(result?.status).toBe(400);
	});

	it('returns 400 when password is missing', async () => {
		const event = makeActionEvent({ identifier: 'user@test.com', password: '' });
		const result = await actions!.signIn(event);

		expect(result?.status).toBe(400);
	});

	it('calls signInEmail when identifier contains @', async () => {
		const event = makeActionEvent({
			identifier: 'user@test.com',
			password: 'secret',
			redirectTo: '/dashboard'
		});
		mockSignInEmail.mockResolvedValue({});

		await expect(actions!.signIn(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: '/dashboard' })
		);

		expect(mockSignInEmail).toHaveBeenCalledWith({
			body: { email: 'user@test.com', password: 'secret' }
		});
		expect(mockSignInUsername).not.toHaveBeenCalled();
		expect.assertions(3);
	});

	it('resolves secondary email to primary email via user_email table', async () => {
		// Simulate: user enters secondary@test.com, user_email lookup finds userId,
		// then user table lookup returns primary@test.com
		mockDbSelectResult.mockReturnValue([{ userId: 'user-123' }]);
		mockDbSelectUserResult.mockReturnValue([{ email: 'primary@test.com' }]);

		const event = makeActionEvent({
			identifier: 'secondary@test.com',
			password: 'secret',
			redirectTo: '/'
		});
		mockSignInEmail.mockResolvedValue({});

		await expect(actions!.signIn(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: '/' })
		);

		// Should call signInEmail with the primary email, not the secondary
		expect(mockSignInEmail).toHaveBeenCalledWith({
			body: { email: 'primary@test.com', password: 'secret' }
		});
		expect.assertions(2);
	});

	it('calls signInUsername when identifier does not contain @', async () => {
		const event = makeActionEvent({
			identifier: 'myuser',
			password: 'secret',
			redirectTo: '/'
		});
		mockSignInUsername.mockResolvedValue({});

		await expect(actions!.signIn(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: '/' })
		);

		expect(mockSignInUsername).toHaveBeenCalledWith({
			body: { username: 'myuser', password: 'secret' }
		});
		expect(mockSignInEmail).not.toHaveBeenCalled();
		expect.assertions(3);
	});

	it('returns 400 with message on APIError', async () => {
		const { APIError } = await import('better-auth');
		mockSignInEmail.mockRejectedValue(new APIError('UNAUTHORIZED', { message: 'bad creds' }));

		const event = makeActionEvent({
			identifier: 'user@test.com',
			password: 'wrong',
			redirectTo: '/'
		});
		const result = await actions!.signIn(event);

		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Invalid credentials.');
	});

	it('returns 500 on unexpected error', async () => {
		mockSignInEmail.mockRejectedValue(new Error('network failure'));

		const event = makeActionEvent({
			identifier: 'user@test.com',
			password: 'pw',
			redirectTo: '/'
		});
		const result = await actions!.signIn(event);

		expect(result?.status).toBe(500);
		expect((result?.data as { message: string }).message).toBe(
			'An unexpected error occurred. Please try again.'
		);
	});
});

describe('actions.signInSocial', () => {
	it('returns 400 for unconfigured provider', async () => {
		mockGetConfiguredSocialProviders.mockReturnValue([]);
		const event = makeActionEvent({ provider: 'github', redirectTo: '/' });
		const result = await actions!.signInSocial(event);

		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Invalid provider.');
	});

	it('redirects to social provider URL on success', async () => {
		mockGetConfiguredSocialProviders.mockReturnValue([{ name: 'github', label: 'GitHub' }]);
		mockSignInSocial.mockResolvedValue({ url: 'https://github.com/login/oauth' });

		const event = makeActionEvent({ provider: 'github', redirectTo: '/dashboard' });

		await expect(actions!.signInSocial(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: 'https://github.com/login/oauth' })
		);
		expect(mockSignInSocial).toHaveBeenCalledWith({
			body: { provider: 'github', callbackURL: '/dashboard' }
		});
		expect.assertions(2);
	});

	it('returns 400 when social sign-in returns no URL', async () => {
		mockGetConfiguredSocialProviders.mockReturnValue([{ name: 'github', label: 'GitHub' }]);
		mockSignInSocial.mockResolvedValue({});

		const event = makeActionEvent({ provider: 'github', redirectTo: '/' });
		const result = await actions!.signInSocial(event);

		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Social sign-in failed.');
	});
});

describe('actions.signOut', () => {
	it('calls auth.api.signOut and redirects to /', async () => {
		mockSignOut.mockResolvedValue({});
		const event = makeActionEvent({});

		await expect(actions!.signOut(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: '/' })
		);
		expect(mockSignOut).toHaveBeenCalled();
		expect.assertions(2);
	});
});

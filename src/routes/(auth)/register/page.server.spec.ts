import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SocialProviderName } from '$lib/server/auth';

// ── Mocks ──────────────────────────────────────────────────────

type SocialProvider = { name: SocialProviderName; label: string };

const mockSignUpEmail = vi.fn();
const mockSignInSocial = vi.fn();
const mockSignInMagicLink = vi.fn();
const mockGetConfiguredSocialProviders = vi.fn<() => SocialProvider[]>(() => []);
const mockSendEmail = vi.fn<(...args: unknown[]) => Promise<boolean>>(() => Promise.resolve(true));

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			signUpEmail: (...args: unknown[]) => mockSignUpEmail(...args),
			signInSocial: (...args: unknown[]) => mockSignInSocial(...args),
			signInMagicLink: (...args: unknown[]) => mockSignInMagicLink(...args)
		}
	},
	getConfiguredSocialProviders: () => mockGetConfiguredSocialProviders()
}));

const mockDbSelectResult = vi.fn<() => Array<{ userId: string }>>(() => []);
const mockDbSelectUserResult = vi.fn<() => Array<Record<string, string>>>(() => []);
let dbSelectCallCount = 0;

vi.mock('$lib/server/db', () => {
	const makeChain = (resultFn: () => unknown[]) => ({
		from: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		limit: vi.fn(() => resultFn())
	});

	return {
		db: {
			select: vi.fn(() => {
				dbSelectCallCount++;
				if (dbSelectCallCount % 2 === 1) return makeChain(mockDbSelectResult);
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

vi.mock('$lib/server/services/email', () => ({
	sendEmail: (...args: unknown[]) => mockSendEmail(...args)
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
	const url = new URL('http://localhost:5173/register');
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

function makeActionEvent(
	formEntries: Record<string, string>,
	locals: Record<string, unknown> = {}
) {
	const form = new FormData();
	for (const [k, v] of Object.entries(formEntries)) {
		form.set(k, v);
	}
	return {
		request: {
			formData: () => Promise.resolve(form),
			headers: new Headers()
		},
		locals
	} as unknown as Parameters<NonNullable<typeof actions>['signUp']>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetConfiguredSocialProviders.mockReturnValue([]);
	mockDbSelectResult.mockReturnValue([]);
	mockDbSelectUserResult.mockReturnValue([]);
	mockSendEmail.mockResolvedValue(true);
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

	it('sanitizes redirectTo', async () => {
		const event = makeEvent({ searchParams: { redirectTo: '//evil.com' } });
		const result = (await load(event)) as { redirectTo: string };
		expect(result.redirectTo).toBe('/');
	});

	it('defaults redirectTo to /', async () => {
		const event = makeEvent();
		const result = (await load(event)) as { redirectTo: string };
		expect(result.redirectTo).toBe('/');
	});
});

describe('actions.signUp', () => {
	it('returns 400 when email is missing', async () => {
		const event = makeActionEvent({
			email: '',
			password: 'pw',
			confirmPassword: 'pw',
			redirectTo: '/'
		});
		const result = await actions!.signUp(event);
		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Email and password are required.');
	});

	it('returns 400 when password is missing', async () => {
		const event = makeActionEvent({
			email: 'user@test.com',
			password: '',
			confirmPassword: '',
			redirectTo: '/'
		});
		const result = await actions!.signUp(event);
		expect(result?.status).toBe(400);
	});

	it('returns 400 when passwords do not match', async () => {
		const event = makeActionEvent({
			email: 'user@test.com',
			password: 'abc123',
			confirmPassword: 'different',
			redirectTo: '/'
		});
		const result = await actions!.signUp(event);
		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Passwords do not match.');
	});

	it('calls signUpEmail and redirects on success', async () => {
		mockSignUpEmail.mockResolvedValue({});
		const event = makeActionEvent({
			name: 'Alice',
			email: 'alice@test.com',
			password: 'secret',
			confirmPassword: 'secret',
			redirectTo: '/dashboard'
		});

		await expect(actions!.signUp(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: '/dashboard' })
		);

		expect(mockSignUpEmail).toHaveBeenCalledWith({
			body: {
				name: 'Alice',
				email: 'alice@test.com',
				password: 'secret'
			}
		});
		expect.assertions(2);
	});

	it('uses email prefix as name when name is empty', async () => {
		mockSignUpEmail.mockResolvedValue({});
		const event = makeActionEvent({
			name: '',
			email: 'bob@test.com',
			password: 'secret',
			confirmPassword: 'secret',
			redirectTo: '/'
		});

		await expect(actions!.signUp(event)).rejects.toEqual(expect.objectContaining({ status: 302 }));

		expect(mockSignUpEmail).toHaveBeenCalledWith({
			body: expect.objectContaining({ name: 'bob' })
		});
		expect.assertions(2);
	});

	it('includes username when provided', async () => {
		mockSignUpEmail.mockResolvedValue({});
		const event = makeActionEvent({
			name: 'Alice',
			email: 'alice@test.com',
			username: 'alice123',
			password: 'secret',
			confirmPassword: 'secret',
			redirectTo: '/'
		});

		await expect(actions!.signUp(event)).rejects.toEqual(expect.objectContaining({ status: 302 }));

		expect(mockSignUpEmail).toHaveBeenCalledWith({
			body: expect.objectContaining({ username: 'alice123' })
		});
		expect.assertions(2);
	});

	it('trims and lowercases email', async () => {
		mockSignUpEmail.mockResolvedValue({});
		const event = makeActionEvent({
			email: '  User@TEST.com  ',
			password: 'secret',
			confirmPassword: 'secret',
			redirectTo: '/'
		});

		await expect(actions!.signUp(event)).rejects.toEqual(expect.objectContaining({ status: 302 }));

		expect(mockSignUpEmail).toHaveBeenCalledWith({
			body: expect.objectContaining({ email: 'user@test.com' })
		});
		expect.assertions(2);
	});

	it('returns 400 with specific message when user already exists', async () => {
		const { APIError } = await import('better-auth');
		mockSignUpEmail.mockRejectedValue(
			new APIError('BAD_REQUEST', { message: 'User already exists' })
		);

		const event = makeActionEvent({
			email: 'taken@test.com',
			password: 'secret',
			confirmPassword: 'secret',
			redirectTo: '/'
		});
		const result = await actions!.signUp(event);

		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe(
			'An account with this email already exists.'
		);
	});

	it('returns 400 with specific message when username is taken', async () => {
		const { APIError } = await import('better-auth');
		mockSignUpEmail.mockRejectedValue(
			new APIError('BAD_REQUEST', { message: 'Username is already taken' })
		);

		const event = makeActionEvent({
			email: 'new@test.com',
			username: 'taken',
			password: 'secret',
			confirmPassword: 'secret',
			redirectTo: '/'
		});
		const result = await actions!.signUp(event);

		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('This username is already taken.');
	});

	it('returns 400 with generic APIError message', async () => {
		const { APIError } = await import('better-auth');
		mockSignUpEmail.mockRejectedValue(
			new APIError('BAD_REQUEST', { message: 'Password too weak' })
		);

		const event = makeActionEvent({
			email: 'new@test.com',
			password: 'a',
			confirmPassword: 'a',
			redirectTo: '/'
		});
		const result = await actions!.signUp(event);

		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Password too weak');
	});

	it('returns empty message for APIError with no body', async () => {
		const { APIError } = await import('better-auth');
		mockSignUpEmail.mockRejectedValue(new APIError('BAD_REQUEST'));

		const event = makeActionEvent({
			email: 'new@test.com',
			password: 'secret',
			confirmPassword: 'secret',
			redirectTo: '/'
		});
		const result = await actions!.signUp(event);

		expect(result?.status).toBe(400);
	});

	it('returns 500 on unexpected error', async () => {
		mockSignUpEmail.mockRejectedValue(new Error('network failure'));

		const event = makeActionEvent({
			email: 'new@test.com',
			password: 'secret',
			confirmPassword: 'secret',
			redirectTo: '/'
		});
		const result = await actions!.signUp(event);

		expect(result?.status).toBe(500);
		expect((result?.data as { message: string }).message).toBe(
			'An unexpected error occurred. Please try again.'
		);
	});

	it('preserves form data on validation error', async () => {
		const event = makeActionEvent({
			name: 'Alice',
			email: 'alice@test.com',
			username: 'alice123',
			password: 'abc',
			confirmPassword: 'different',
			redirectTo: '/'
		});
		const result = await actions!.signUp(event);

		const data = result?.data as { name: string; email: string; username: string };
		expect(data.name).toBe('Alice');
		expect(data.email).toBe('alice@test.com');
		expect(data.username).toBe('alice123');
	});
});

describe('actions.signInSocial', () => {
	it('returns 400 for unconfigured provider', async () => {
		mockGetConfiguredSocialProviders.mockReturnValue([]);
		const event = makeActionEvent({ provider: 'github', redirectTo: '/' });
		const result = await actions!.signInSocial(event);
		expect(result?.status).toBe(400);
	});

	it('redirects to social provider URL on success', async () => {
		mockGetConfiguredSocialProviders.mockReturnValue([{ name: 'github', label: 'GitHub' }]);
		mockSignInSocial.mockResolvedValue({ url: 'https://github.com/login/oauth' });

		const event = makeActionEvent({ provider: 'github', redirectTo: '/' });
		await expect(actions!.signInSocial(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: 'https://github.com/login/oauth' })
		);
		expect.assertions(1);
	});

	it('returns 400 when social sign-in returns no URL', async () => {
		mockGetConfiguredSocialProviders.mockReturnValue([{ name: 'github', label: 'GitHub' }]);
		mockSignInSocial.mockResolvedValue({});

		const event = makeActionEvent({ provider: 'github', redirectTo: '/' });
		const result = await actions!.signInSocial(event);
		expect(result?.status).toBe(400);
	});
});

describe('actions.sendMagicLink', () => {
	it('returns 400 when email is empty', async () => {
		const event = makeActionEvent({ email: '', redirectTo: '/' });
		const result = await actions!.sendMagicLink(event);
		expect(result?.status).toBe(400);
	});
});

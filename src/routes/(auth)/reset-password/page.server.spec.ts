import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockResetPassword = vi.fn();

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			resetPassword: (...args: unknown[]) => mockResetPassword(...args)
		}
	}
}));

const { load, actions } = await import('./+page.server');

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(searchParams: Record<string, string> = {}) {
	const url = new URL('http://localhost:5173/reset-password');
	for (const [k, v] of Object.entries(searchParams)) {
		url.searchParams.set(k, v);
	}
	return { url } as Parameters<typeof load>[0];
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
	} as unknown as Parameters<NonNullable<typeof actions>['resetPassword']>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
});

describe('load', () => {
	it('redirects to /forgot-password when token is missing', async () => {
		const event = makeEvent();
		await expect(load(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: '/forgot-password' })
		);
		expect.assertions(1);
	});

	it('returns token when present in search params', async () => {
		const event = makeEvent({ token: 'abc123' });
		const result = await load(event);
		expect(result).toEqual({ token: 'abc123' });
	});
});

describe('actions.resetPassword', () => {
	it('returns 400 when token is missing', async () => {
		const event = makeActionEvent({
			token: '',
			newPassword: 'secret',
			confirmPassword: 'secret'
		});
		const result = await actions!.resetPassword(event);
		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Invalid or missing reset token.');
	});

	it('returns 400 when password is empty', async () => {
		const event = makeActionEvent({
			token: 'abc',
			newPassword: '',
			confirmPassword: ''
		});
		const result = await actions!.resetPassword(event);
		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Password is required.');
	});

	it('returns 400 when passwords do not match', async () => {
		const event = makeActionEvent({
			token: 'abc',
			newPassword: 'secret1',
			confirmPassword: 'secret2'
		});
		const result = await actions!.resetPassword(event);
		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Passwords do not match.');
	});

	it('calls resetPassword and redirects to login on success', async () => {
		mockResetPassword.mockResolvedValue({});
		const event = makeActionEvent({
			token: 'valid-token',
			newPassword: 'newsecret',
			confirmPassword: 'newsecret'
		});

		await expect(actions!.resetPassword(event)).rejects.toEqual(
			expect.objectContaining({ status: 302, location: '/login?reset=success' })
		);

		expect(mockResetPassword).toHaveBeenCalledWith({
			body: { newPassword: 'newsecret', token: 'valid-token' }
		});
		expect.assertions(2);
	});

	it('returns 400 with expired token message on token-related APIError', async () => {
		const { APIError } = await import('better-auth');
		mockResetPassword.mockRejectedValue(new APIError('BAD_REQUEST', { message: 'Token expired' }));

		const event = makeActionEvent({
			token: 'expired-token',
			newPassword: 'newsecret',
			confirmPassword: 'newsecret'
		});
		const result = await actions!.resetPassword(event);

		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe(
			'This reset link has expired or is invalid. Please request a new one.'
		);
	});

	it('returns 400 with generic APIError message', async () => {
		const { APIError } = await import('better-auth');
		mockResetPassword.mockRejectedValue(
			new APIError('BAD_REQUEST', { message: 'Something went wrong' })
		);

		const event = makeActionEvent({
			token: 'some-token',
			newPassword: 'newsecret',
			confirmPassword: 'newsecret'
		});
		const result = await actions!.resetPassword(event);

		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Something went wrong');
	});

	it('returns 400 for APIError with no body', async () => {
		const { APIError } = await import('better-auth');
		mockResetPassword.mockRejectedValue(new APIError('BAD_REQUEST'));

		const event = makeActionEvent({
			token: 'some-token',
			newPassword: 'newsecret',
			confirmPassword: 'newsecret'
		});
		const result = await actions!.resetPassword(event);

		expect(result?.status).toBe(400);
	});

	it('returns 500 on unexpected error', async () => {
		mockResetPassword.mockRejectedValue(new Error('network failure'));

		const event = makeActionEvent({
			token: 'some-token',
			newPassword: 'newsecret',
			confirmPassword: 'newsecret'
		});
		const result = await actions!.resetPassword(event);

		expect(result?.status).toBe(500);
		expect((result?.data as { message: string }).message).toBe(
			'An unexpected error occurred. Please try again.'
		);
	});
});

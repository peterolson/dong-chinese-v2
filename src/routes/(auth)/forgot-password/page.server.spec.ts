import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockRequestPasswordReset = vi.fn();
const mockSendEmail = vi.fn<(...args: unknown[]) => Promise<boolean>>(() => Promise.resolve(true));

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			requestPasswordReset: (...args: unknown[]) => mockRequestPasswordReset(...args)
		}
	}
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

const { load, actions } = await import('./+page.server');

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(
	overrides: {
		user?: { id: string; name: string } | null;
	} = {}
) {
	return {
		locals: { user: overrides.user ?? null },
		url: new URL('http://localhost:5173/forgot-password')
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
		url: new URL('http://localhost:5173/forgot-password'),
		locals
	} as unknown as Parameters<NonNullable<typeof actions>['requestReset']>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
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

	it('returns undefined for anonymous users', async () => {
		const event = makeEvent();
		const result = await load(event);
		expect(result).toBeUndefined();
	});
});

describe('actions.requestReset', () => {
	it('returns 400 when email is empty', async () => {
		const event = makeActionEvent({ email: '' });
		const result = await actions!.requestReset(event);
		expect(result?.status).toBe(400);
		expect((result?.data as { message: string }).message).toBe('Email is required.');
	});

	it('always returns success even for nonexistent email (prevents enumeration)', async () => {
		mockRequestPasswordReset.mockResolvedValue({});
		const event = makeActionEvent({ email: 'nobody@test.com' });
		const result = await actions!.requestReset(event);
		expect((result as { success: boolean }).success).toBe(true);
	});

	it('sends reset email when resetPasswordUrl is stashed', async () => {
		mockRequestPasswordReset.mockResolvedValue({});
		const event = makeActionEvent(
			{ email: 'user@test.com' },
			{ resetPasswordUrl: 'https://example.com/reset?token=abc' }
		);
		const result = await actions!.requestReset(event);

		expect(mockSendEmail).toHaveBeenCalledWith(
			'user@test.com',
			'Reset your Dong Chinese password',
			expect.stringContaining('https://example.com/reset?token=abc'),
			expect.stringContaining('https://example.com/reset?token=abc')
		);
		expect((result as { success: boolean }).success).toBe(true);
	});

	it('does not send email when resetPasswordUrl is not stashed', async () => {
		mockRequestPasswordReset.mockResolvedValue({});
		const event = makeActionEvent({ email: 'user@test.com' });
		const result = await actions!.requestReset(event);

		expect(mockSendEmail).not.toHaveBeenCalled();
		expect((result as { success: boolean }).success).toBe(true);
	});

	it('resolves secondary email to primary for the API call', async () => {
		mockDbSelectResult.mockReturnValue([{ userId: 'user-123' }]);
		mockDbSelectUserResult.mockReturnValue([{ email: 'primary@test.com' }]);
		mockRequestPasswordReset.mockResolvedValue({});

		const event = makeActionEvent(
			{ email: 'secondary@test.com' },
			{ resetPasswordUrl: 'https://example.com/reset?token=abc' }
		);
		await actions!.requestReset(event);

		expect(mockRequestPasswordReset).toHaveBeenCalledWith(
			expect.objectContaining({
				body: expect.objectContaining({ email: 'primary@test.com' })
			})
		);
		// But sends the email to the address the user typed
		expect(mockSendEmail).toHaveBeenCalledWith(
			'secondary@test.com',
			expect.any(String),
			expect.any(String),
			expect.any(String)
		);
	});

	it('returns success even when requestPasswordReset throws', async () => {
		mockRequestPasswordReset.mockRejectedValue(new Error('not found'));
		const event = makeActionEvent({ email: 'nobody@test.com' });
		const result = await actions!.requestReset(event);

		expect((result as { success: boolean }).success).toBe(true);
	});
});

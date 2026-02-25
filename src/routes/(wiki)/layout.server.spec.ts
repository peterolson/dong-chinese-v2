import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockHasPermission = vi.fn();
const mockCountAllPendingEdits = vi.fn();

vi.mock('$lib/server/services/permissions', () => ({
	hasPermission: (...args: unknown[]) => mockHasPermission(...args)
}));

vi.mock('$lib/server/services/char-edit', () => ({
	countAllPendingEdits: (...args: unknown[]) => mockCountAllPendingEdits(...args)
}));

const { load } = await import('./+layout.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(
	overrides: {
		user?: { id: string; name: string } | null;
		settings?: Record<string, unknown>;
		anonymousSessionId?: string | null;
	} = {}
) {
	return {
		locals: {
			user: overrides.user ?? null,
			settings: overrides.settings ?? { theme: 'light', characterSet: 'simplified' },
			anonymousSessionId: overrides.anonymousSessionId ?? null
		}
	} as unknown as Parameters<typeof load>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockHasPermission.mockResolvedValue(false);
	mockCountAllPendingEdits.mockResolvedValue(0);
});

describe('load', () => {
	it('returns canReview=false when no user', async () => {
		const result = await loadResult(makeEvent());

		expect(result.canReview).toBe(false);
		expect(result.user).toBeNull();
		expect(mockHasPermission).not.toHaveBeenCalled();
	});

	it('returns canReview=true when user has wikiEdit permission', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockCountAllPendingEdits.mockResolvedValue(5);
		const user = { id: 'user-1', name: 'Alice' };

		const result = await loadResult(makeEvent({ user }));

		expect(result.canReview).toBe(true);
		expect(result.user).toEqual(user);
		expect(mockHasPermission).toHaveBeenCalledWith('user-1', 'wikiEdit');
	});

	it('returns canReview=false when user lacks wikiEdit permission', async () => {
		mockHasPermission.mockResolvedValue(false);
		const user = { id: 'user-2', name: 'Bob' };

		const result = await loadResult(makeEvent({ user }));

		expect(result.canReview).toBe(false);
		expect(mockHasPermission).toHaveBeenCalledWith('user-2', 'wikiEdit');
	});

	it('passes through settings from locals', async () => {
		const settings = { theme: 'dark', characterSet: 'traditional' };
		const result = await loadResult(makeEvent({ settings }));

		expect(result.settings).toEqual(settings);
	});

	it('returns empty object for settings when not set', async () => {
		const event = {
			locals: {
				user: null,
				settings: undefined,
				anonymousSessionId: null
			}
		} as unknown as Parameters<typeof load>[0];

		const result = await loadResult(event);

		expect(result.settings).toEqual({});
	});

	it('returns pendingBadgeCount for reviewers', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockCountAllPendingEdits.mockResolvedValue(7);
		const user = { id: 'user-1', name: 'Alice' };

		const result = await loadResult(makeEvent({ user }));

		expect(result.pendingBadgeCount).toBe(7);
		expect(mockCountAllPendingEdits).toHaveBeenCalled();
	});

	it('returns pendingBadgeCount=0 for non-reviewers', async () => {
		mockHasPermission.mockResolvedValue(false);
		const user = { id: 'user-2', name: 'Bob' };

		const result = await loadResult(makeEvent({ user }));

		expect(result.pendingBadgeCount).toBe(0);
		expect(mockCountAllPendingEdits).not.toHaveBeenCalled();
	});

	it('passes through anonymousSessionId from locals', async () => {
		const result = await loadResult(makeEvent({ anonymousSessionId: 'anon-123' }));

		expect(result.anonymousSessionId).toBe('anon-123');
	});

	it('returns null anonymousSessionId when not set', async () => {
		const result = await loadResult(makeEvent());

		expect(result.anonymousSessionId).toBeNull();
	});
});

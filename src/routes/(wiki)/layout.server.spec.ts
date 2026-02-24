import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockHasPermission = vi.fn();

vi.mock('$lib/server/services/permissions', () => ({
	hasPermission: (...args: unknown[]) => mockHasPermission(...args)
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
	} = {}
) {
	return {
		locals: {
			user: overrides.user ?? null,
			settings: overrides.settings ?? { theme: 'light', characterSet: 'simplified' }
		}
	} as unknown as Parameters<typeof load>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockHasPermission.mockResolvedValue(false);
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
				settings: undefined
			}
		} as unknown as Parameters<typeof load>[0];

		const result = await loadResult(event);

		expect(result.settings).toEqual({});
	});
});

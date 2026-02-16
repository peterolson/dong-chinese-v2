import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockApplySettings = vi.fn();

vi.mock('$lib/server/services/settings', () => ({
	applySettings: (...args: unknown[]) => mockApplySettings(...args)
}));

vi.mock('$lib/server/db', () => ({
	db: {}
}));

const { load, actions } = await import('./+page.server');

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(settings: Record<string, unknown> = {}, user: { id: string } | null = null) {
	return {
		locals: { settings, user }
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
	const cookieJar = new Map<string, string>();
	return {
		request: {
			formData: () => Promise.resolve(form)
		},
		url: new URL('http://localhost:5173/settings'),
		cookies: {
			get: (name: string) => cookieJar.get(name),
			set: (name: string, value: string) => cookieJar.set(name, value),
			delete: (name: string) => cookieJar.delete(name)
		},
		locals
	} as unknown as Parameters<NonNullable<typeof actions>['updateSettings']>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
});

describe('load', () => {
	it('returns current settings from locals', async () => {
		const result = await load(makeEvent({ theme: 'dark' }));
		expect(result).toEqual({ settings: { theme: 'dark' } });
	});

	it('returns empty settings when none are set', async () => {
		const result = await load(makeEvent());
		expect(result).toEqual({ settings: {} });
	});
});

describe('actions.updateSettings', () => {
	it('applies dark theme', async () => {
		const event = makeActionEvent({ theme: 'dark' }, { settings: {}, user: null });
		const result = await actions!.updateSettings(event);

		expect(mockApplySettings).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ theme: 'dark' }),
			false,
			undefined,
			undefined
		);
		expect(result).toEqual({ settings: expect.objectContaining({ theme: 'dark' }) });
	});

	it('applies light theme', async () => {
		const event = makeActionEvent({ theme: 'light' }, { settings: {}, user: null });
		const result = await actions!.updateSettings(event);

		expect(mockApplySettings).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ theme: 'light' }),
			false,
			undefined,
			undefined
		);
		expect(result).toEqual({ settings: expect.objectContaining({ theme: 'light' }) });
	});

	it('treats invalid theme as null (system default)', async () => {
		const event = makeActionEvent({ theme: 'bogus' }, { settings: {}, user: null });
		const result = await actions!.updateSettings(event);

		expect(mockApplySettings).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ theme: null }),
			false,
			undefined,
			undefined
		);
		expect(result).toEqual({ settings: expect.objectContaining({ theme: null }) });
	});

	it('treats empty theme as null (system default)', async () => {
		const event = makeActionEvent({ theme: '' }, { settings: {}, user: null });
		const result = await actions!.updateSettings(event);

		expect(mockApplySettings).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ theme: null }),
			false,
			undefined,
			undefined
		);
		expect(result).toEqual({ settings: expect.objectContaining({ theme: null }) });
	});

	it('passes userId and db when user is authenticated', async () => {
		const event = makeActionEvent({ theme: 'dark' }, { settings: {}, user: { id: 'user-1' } });
		const result = await actions!.updateSettings(event);

		expect(mockApplySettings).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ theme: 'dark' }),
			false,
			'user-1',
			expect.anything()
		);
		expect(result).toEqual({ settings: expect.objectContaining({ theme: 'dark' }) });
	});

	it('updates event.locals.settings for transformPageChunk', async () => {
		const locals = { settings: {}, user: null } as Record<string, unknown>;
		const event = makeActionEvent({ theme: 'dark' }, locals);
		await actions!.updateSettings(event);

		expect(locals.settings).toEqual(expect.objectContaining({ theme: 'dark' }));
	});
});

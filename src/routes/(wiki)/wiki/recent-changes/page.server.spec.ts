import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetRecentEdits = vi.fn();
const mockResolveUserNames = vi.fn();

vi.mock('$lib/server/services/char-edit', () => ({
	getRecentEdits: (...args: unknown[]) => mockGetRecentEdits(...args)
}));

vi.mock('$lib/server/services/user', () => ({
	resolveUserNames: (...args: unknown[]) => mockResolveUserNames(...args)
}));

const { load } = await import('./+page.server');

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(searchParams: Record<string, string> = {}) {
	const url = new URL('http://localhost:5173/wiki/recent-changes');
	for (const [k, v] of Object.entries(searchParams)) {
		url.searchParams.set(k, v);
	}
	return { url } as Parameters<typeof load>[0];
}

function makeFakeEdit(overrides: Record<string, unknown> = {}) {
	return {
		id: 'edit-1',
		character: '\u6C34',
		status: 'approved',
		editComment: 'Fixed gloss',
		editedBy: 'user-1',
		reviewedBy: 'user-2',
		reviewComment: 'Looks good',
		createdAt: new Date('2025-01-15T10:00:00Z'),
		reviewedAt: new Date('2025-01-15T11:00:00Z'),
		...overrides
	};
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetRecentEdits.mockResolvedValue({ edits: [], total: 0 });
	mockResolveUserNames.mockResolvedValue(new Map());
});

describe('load', () => {
	it('defaults to page 1 when no page param', async () => {
		await load(makeEvent());

		expect(mockGetRecentEdits).toHaveBeenCalledWith({ limit: 50, offset: 0 });
	});

	it('calculates offset from page number', async () => {
		await load(makeEvent({ page: '3' }));

		expect(mockGetRecentEdits).toHaveBeenCalledWith({ limit: 50, offset: 100 });
	});

	it('clamps page to minimum of 1 for zero', async () => {
		await load(makeEvent({ page: '0' }));

		expect(mockGetRecentEdits).toHaveBeenCalledWith({ limit: 50, offset: 0 });
	});

	it('clamps page to minimum of 1 for negative values', async () => {
		await load(makeEvent({ page: '-5' }));

		expect(mockGetRecentEdits).toHaveBeenCalledWith({ limit: 50, offset: 0 });
	});

	it('defaults to page 1 for non-numeric page param', async () => {
		await load(makeEvent({ page: 'abc' }));

		expect(mockGetRecentEdits).toHaveBeenCalledWith({ limit: 50, offset: 0 });
	});

	it('resolves user names for editors and reviewers', async () => {
		const edits = [
			makeFakeEdit({ editedBy: 'user-1', reviewedBy: 'user-2' }),
			makeFakeEdit({ id: 'edit-2', editedBy: 'user-3', reviewedBy: null })
		];
		mockGetRecentEdits.mockResolvedValue({ edits, total: 2 });
		mockResolveUserNames.mockResolvedValue(
			new Map([
				['user-1', 'Alice'],
				['user-2', 'Bob'],
				['user-3', 'Charlie']
			])
		);

		await load(makeEvent());

		// Should be called with all non-null user IDs
		expect(mockResolveUserNames).toHaveBeenCalledWith(['user-1', 'user-3', 'user-2']);
	});

	it('returns pagination metadata', async () => {
		mockGetRecentEdits.mockResolvedValue({ edits: [], total: 150 });

		const result = await load(makeEvent({ page: '2' }));

		expect(result.pageNum).toBe(2);
		expect(result.pageSize).toBe(50);
		expect(result.total).toBe(150);
		expect(result.totalPages).toBe(3);
	});

	it('maps edits with resolved editor and reviewer names', async () => {
		const edit = makeFakeEdit();
		mockGetRecentEdits.mockResolvedValue({ edits: [edit], total: 1 });
		mockResolveUserNames.mockResolvedValue(
			new Map([
				['user-1', 'Alice'],
				['user-2', 'Bob']
			])
		);

		const result = await load(makeEvent());

		expect(result.items).toEqual([
			{
				id: 'edit-1',
				character: '\u6C34',
				status: 'approved',
				editComment: 'Fixed gloss',
				editorName: 'Alice',
				reviewerName: 'Bob',
				reviewComment: 'Looks good',
				createdAt: '2025-01-15T10:00:00.000Z',
				reviewedAt: '2025-01-15T11:00:00.000Z'
			}
		]);
	});

	it('handles anonymous editors (no editedBy)', async () => {
		const edit = makeFakeEdit({ editedBy: null, reviewedBy: null });
		mockGetRecentEdits.mockResolvedValue({ edits: [edit], total: 1 });
		mockResolveUserNames.mockResolvedValue(new Map());

		const result = await load(makeEvent());

		expect(result.items[0].editorName).toBe('Anonymous');
		expect(result.items[0].reviewerName).toBeNull();
	});

	it('shows "Unknown" when user name cannot be resolved', async () => {
		const edit = makeFakeEdit({ editedBy: 'deleted-user', reviewedBy: 'deleted-reviewer' });
		mockGetRecentEdits.mockResolvedValue({ edits: [edit], total: 1 });
		mockResolveUserNames.mockResolvedValue(new Map());

		const result = await load(makeEvent());

		expect(result.items[0].editorName).toBe('Unknown');
		expect(result.items[0].reviewerName).toBe('Unknown');
	});
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetRecentEdits = vi.fn();
const mockResolveUserNames = vi.fn();
const mockDbExecute = vi.fn();

vi.mock('$lib/server/services/char-edit', () => ({
	getRecentEdits: (...args: unknown[]) => mockGetRecentEdits(...args)
}));

vi.mock('$lib/server/services/user', () => ({
	resolveUserNames: (...args: unknown[]) => mockResolveUserNames(...args)
}));

// Mock db with both chain (select/from/where) and execute (raw SQL for lateral join)
const mockDbThen = vi.fn();

vi.mock('$lib/server/db', () => {
	const chain = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		then: (onFulfilled: (value: unknown[]) => unknown) => {
			const result = mockDbThen();
			return Promise.resolve(result).then(onFulfilled);
		}
	};
	return {
		db: {
			select: vi.fn(() => chain),
			execute: (...args: unknown[]) => mockDbExecute(...args)
		}
	};
});

vi.mock('$lib/server/db/dictionary.schema', () => ({
	charBase: { character: 'character' },
	charManual: {}
}));

vi.mock('drizzle-orm', () => ({
	inArray: vi.fn(),
	sql: Object.assign(
		(strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values }),
		{ raw: (s: string) => s }
	)
}));

const EDITABLE_FIELDS = [
	'gloss',
	'hint',
	'originalMeaning',
	'isVerified',
	'pinyin',
	'simplifiedVariants',
	'traditionalVariants',
	'components',
	'strokeCountSimp',
	'strokeCountTrad',
	'strokeDataSimp',
	'strokeDataTrad',
	'fragmentsSimp',
	'fragmentsTrad',
	'historicalImages',
	'historicalPronunciations',
	'customSources'
] as const;

vi.mock('$lib/data/editable-fields', () => ({
	EDITABLE_FIELDS,
	pickEditableFields: (row: Record<string, unknown>) => {
		const result: Record<string, unknown> = {};
		for (const field of EDITABLE_FIELDS) {
			result[field] = row[field] ?? null;
		}
		return result;
	}
}));

const { load } = await import('./+page.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

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
		changedFields: ['gloss'],
		gloss: 'water',
		...overrides
	};
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetRecentEdits.mockResolvedValue({ edits: [], total: 0 });
	mockResolveUserNames.mockResolvedValue(new Map());
	mockDbThen.mockReturnValue([]);
	mockDbExecute.mockResolvedValue([]);
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

		const result = await loadResult(makeEvent({ page: '2' }));

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

		const result = await loadResult(makeEvent());

		expect(result.items[0]).toMatchObject({
			id: 'edit-1',
			character: '\u6C34',
			status: 'approved',
			editComment: 'Fixed gloss',
			editorName: 'Alice',
			reviewerName: 'Bob',
			reviewComment: 'Looks good',
			createdAt: '2025-01-15T10:00:00.000Z',
			reviewedAt: '2025-01-15T11:00:00.000Z',
			changedFields: ['gloss']
		});
	});

	it('handles anonymous editors (no editedBy)', async () => {
		const edit = makeFakeEdit({ editedBy: null, reviewedBy: null });
		mockGetRecentEdits.mockResolvedValue({ edits: [edit], total: 1 });
		mockResolveUserNames.mockResolvedValue(new Map());

		const result = await loadResult(makeEvent());

		expect(result.items[0].editorName).toBe('Anonymous');
		expect(result.items[0].reviewerName).toBeNull();
	});

	it('shows "Unknown" when user name cannot be resolved', async () => {
		const edit = makeFakeEdit({ editedBy: 'deleted-user', reviewedBy: 'deleted-reviewer' });
		mockGetRecentEdits.mockResolvedValue({ edits: [edit], total: 1 });
		mockResolveUserNames.mockResolvedValue(new Map());

		const result = await loadResult(makeEvent());

		expect(result.items[0].editorName).toBe('Unknown');
		expect(result.items[0].reviewerName).toBe('Unknown');
	});

	it('returns empty baselineMap when no edits', async () => {
		mockGetRecentEdits.mockResolvedValue({ edits: [], total: 0 });

		const result = await loadResult(makeEvent());

		expect(result.baselineMap).toEqual({});
	});

	it('uses same-page predecessor as baseline for same-character edits', async () => {
		const edit1 = makeFakeEdit({
			id: 'edit-1',
			character: '水',
			gloss: 'water (old)',
			createdAt: new Date('2025-01-15T10:00:00Z')
		});
		const edit2 = makeFakeEdit({
			id: 'edit-2',
			character: '水',
			gloss: 'water (new)',
			createdAt: new Date('2025-01-16T10:00:00Z')
		});
		mockGetRecentEdits.mockResolvedValue({ edits: [edit2, edit1], total: 2 });
		// The predecessor query returns empty (edit-1 is the oldest and has no predecessor in DB)
		mockDbExecute.mockResolvedValue([]);
		// char_base fallback
		mockDbThen.mockReturnValue([
			{ character: '水', gloss: 'base water', hint: null, originalMeaning: null }
		]);

		const result = await loadResult(makeEvent());

		// edit-2 should use edit-1 as baseline (same-page predecessor)
		expect(result.baselineMap['edit-2']).toMatchObject({ gloss: 'water (old)' });
		// edit-1 should fall back to char_base
		expect(result.baselineMap['edit-1']).toMatchObject({ gloss: 'base water' });
	});

	it('loads predecessor from DB for oldest same-character edit on page', async () => {
		const edit = makeFakeEdit({
			id: 'edit-2',
			character: '水',
			gloss: 'water (v2)',
			createdAt: new Date('2025-01-16T10:00:00Z')
		});
		mockGetRecentEdits.mockResolvedValue({ edits: [edit], total: 1 });
		// DB lateral join returns a predecessor row
		mockDbExecute.mockResolvedValue([
			{
				edit_id: 'edit-2',
				character: '水',
				gloss: 'water (v1)',
				hint: null,
				originalMeaning: null
			}
		]);

		const result = await loadResult(makeEvent());

		expect(result.baselineMap['edit-2']).toMatchObject({ gloss: 'water (v1)' });
	});
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetPendingEdits = vi.fn();
const mockGetUserPendingEdits = vi.fn();
const mockApproveCharEdit = vi.fn();
const mockRejectCharEdit = vi.fn();
const mockHasPermission = vi.fn();
const mockResolveUserNames = vi.fn();

vi.mock('$lib/server/services/char-edit', () => ({
	getPendingEdits: (...args: unknown[]) => mockGetPendingEdits(...args),
	getUserPendingEdits: (...args: unknown[]) => mockGetUserPendingEdits(...args),
	approveCharEdit: (...args: unknown[]) => mockApproveCharEdit(...args),
	rejectCharEdit: (...args: unknown[]) => mockRejectCharEdit(...args)
}));

vi.mock('$lib/server/services/permissions', () => ({
	hasPermission: (...args: unknown[]) => mockHasPermission(...args)
}));

vi.mock('$lib/server/services/user', () => ({
	resolveUserNames: (...args: unknown[]) => mockResolveUserNames(...args)
}));

// Mock the db chain for charView batch-load
const mockDbThen = vi.fn();

vi.mock('$lib/server/db', () => {
	const chain = {
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		then: (...args: unknown[]) => mockDbThen(...args)
	};
	return {
		db: {
			select: vi.fn(() => chain)
		}
	};
});

vi.mock('$lib/server/db/dictionary.views', () => ({
	charView: { character: 'character' }
}));

vi.mock('drizzle-orm', () => ({
	inArray: vi.fn()
}));

vi.mock('$lib/data/editable-fields', () => ({
	EDITABLE_FIELDS: [
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
	]
}));

const { load, actions } = await import('./+page.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

// ── Helpers ────────────────────────────────────────────────────

function makeEdit(overrides: Record<string, unknown> = {}) {
	return {
		id: 'edit-1',
		character: '水',
		editComment: 'Updated gloss',
		editedBy: 'user-1',
		createdAt: new Date('2025-01-15T10:00:00Z'),
		changedFields: ['gloss'],
		gloss: 'water',
		hint: null,
		originalMeaning: null,
		isVerified: true,
		pinyin: ['shuǐ'],
		components: null,
		simplifiedVariants: null,
		traditionalVariants: null,
		customSources: null,
		strokeDataSimp: null,
		strokeDataTrad: null,
		strokeCountSimp: 4,
		strokeCountTrad: null,
		fragmentsSimp: null,
		fragmentsTrad: null,
		historicalImages: null,
		historicalPronunciations: null,
		...overrides
	};
}

function makeLoadEvent(canReview: boolean, userId?: string, anonymousSessionId?: string) {
	return {
		parent: () => Promise.resolve({ canReview }),
		locals: {
			user: userId ? { id: userId } : null,
			anonymousSessionId: anonymousSessionId ?? null
		}
	} as unknown as Parameters<typeof load>[0];
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
			formData: () => Promise.resolve(form)
		},
		locals
	} as unknown as Parameters<NonNullable<typeof actions>['approve']>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetPendingEdits.mockResolvedValue([]);
	mockGetUserPendingEdits.mockResolvedValue([]);
	mockResolveUserNames.mockResolvedValue(new Map());
	mockHasPermission.mockResolvedValue(false);
	// Default: no charView rows found (empty batch load)
	mockDbThen.mockImplementation((cb: (rows: unknown[]) => unknown) => cb([]));
});

describe('load', () => {
	it('calls getPendingEdits for reviewers', async () => {
		const edit = makeEdit();
		mockGetPendingEdits.mockResolvedValue([edit]);
		mockResolveUserNames.mockResolvedValue(new Map([['user-1', 'Alice']]));

		const event = makeLoadEvent(true, 'reviewer-1');
		const result = await loadResult(event);

		expect(result.items).toHaveLength(1);
		expect(result.canReview).toBe(true);
		expect(mockGetPendingEdits).toHaveBeenCalled();
		expect(mockGetUserPendingEdits).not.toHaveBeenCalled();
	});

	it('calls getUserPendingEdits for non-reviewers', async () => {
		const edit = makeEdit({ editedBy: null });
		mockGetUserPendingEdits.mockResolvedValue([edit]);
		mockResolveUserNames.mockResolvedValue(new Map());

		const event = makeLoadEvent(false, undefined, 'anon-1');
		const result = await loadResult(event);

		expect(result.items).toHaveLength(1);
		expect(result.canReview).toBe(false);
		expect(mockGetPendingEdits).not.toHaveBeenCalled();
		expect(mockGetUserPendingEdits).toHaveBeenCalledWith({
			userId: undefined,
			anonymousSessionId: 'anon-1'
		});
	});

	it('resolves editor names from user IDs', async () => {
		const edits = [
			makeEdit({ id: 'edit-1', editedBy: 'user-1' }),
			makeEdit({ id: 'edit-2', editedBy: 'user-2' })
		];
		mockGetPendingEdits.mockResolvedValue(edits);
		mockResolveUserNames.mockResolvedValue(
			new Map([
				['user-1', 'Alice'],
				['user-2', 'Bob']
			])
		);

		const event = makeLoadEvent(true);
		const result = await loadResult(event);

		expect(mockResolveUserNames).toHaveBeenCalledWith(['user-1', 'user-2']);
		expect(result.items[0].editorName).toBe('Alice');
		expect(result.items[1].editorName).toBe('Bob');
	});

	it('labels anonymous editors as "Anonymous"', async () => {
		const edit = makeEdit({ editedBy: null });
		mockGetPendingEdits.mockResolvedValue([edit]);
		mockResolveUserNames.mockResolvedValue(new Map());

		const event = makeLoadEvent(true);
		const result = await loadResult(event);

		expect(result.items[0].editorName).toBe('Anonymous');
	});

	it('labels unknown user IDs as "Unknown"', async () => {
		const edit = makeEdit({ editedBy: 'deleted-user' });
		mockGetPendingEdits.mockResolvedValue([edit]);
		// Name map does not contain 'deleted-user'
		mockResolveUserNames.mockResolvedValue(new Map());

		const event = makeLoadEvent(true);
		const result = await loadResult(event);

		expect(result.items[0].editorName).toBe('Unknown');
	});

	it('batch-loads charView data and returns charBaseDataMap', async () => {
		const edit = makeEdit({ character: '水' });
		mockGetPendingEdits.mockResolvedValue([edit]);
		mockResolveUserNames.mockResolvedValue(new Map([['user-1', 'Alice']]));
		mockDbThen.mockImplementation((cb: (rows: unknown[]) => unknown) =>
			cb([{ character: '水', gloss: 'water', hint: null, originalMeaning: null }])
		);

		const event = makeLoadEvent(true);
		const result = await loadResult(event);

		expect(result.charBaseDataMap).toHaveProperty('水');
		expect(result.charBaseDataMap['水']).toMatchObject({ gloss: 'water' });
	});

	it('deduplicates characters for batch charView query', async () => {
		const edits = [
			makeEdit({ id: 'edit-1', character: '水' }),
			makeEdit({ id: 'edit-2', character: '水' }),
			makeEdit({ id: 'edit-3', character: '火' })
		];
		mockGetPendingEdits.mockResolvedValue(edits);
		mockResolveUserNames.mockResolvedValue(new Map([['user-1', 'Alice']]));
		mockDbThen.mockImplementation((cb: (rows: unknown[]) => unknown) =>
			cb([
				{ character: '水', gloss: 'water' },
				{ character: '火', gloss: 'fire' }
			])
		);

		const event = makeLoadEvent(true);
		const result = await loadResult(event);

		expect(Object.keys(result.charBaseDataMap)).toHaveLength(2);
		expect(result.charBaseDataMap['水']).toMatchObject({ gloss: 'water' });
		expect(result.charBaseDataMap['火']).toMatchObject({ gloss: 'fire' });
	});

	it('returns empty items when non-reviewer has no pending edits', async () => {
		mockGetUserPendingEdits.mockResolvedValue([]);

		const event = makeLoadEvent(false, undefined, 'anon-1');
		const result = await loadResult(event);

		expect(result.items).toEqual([]);
		expect(result.canReview).toBe(false);
	});
});

describe('actions.approve', () => {
	it('fails 401 when no user', async () => {
		const event = makeActionEvent({ editId: 'edit-1' }, { user: null });
		const result = await actions!.approve(event);

		expect(result).toMatchObject({ status: 401 });
	});

	it('fails 403 when user lacks wikiEdit permission', async () => {
		mockHasPermission.mockResolvedValue(false);
		const event = makeActionEvent({ editId: 'edit-1' }, { user: { id: 'user-1' } });
		const result = await actions!.approve(event);

		expect(result).toMatchObject({ status: 403 });
		expect(mockHasPermission).toHaveBeenCalledWith('user-1', 'wikiEdit');
	});

	it('fails 400 when no editId', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent({}, { user: { id: 'user-1' } });
		const result = await actions!.approve(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('returns approved:true on success', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockApproveCharEdit.mockResolvedValue(true);

		const event = makeActionEvent(
			{ editId: 'edit-1', reviewComment: 'Looks good' },
			{ user: { id: 'reviewer-1' } }
		);
		const result = await actions!.approve(event);

		expect(result).toEqual({ approved: true, editId: 'edit-1' });
		expect(mockApproveCharEdit).toHaveBeenCalledWith('edit-1', 'reviewer-1', 'Looks good');
	});

	it('passes undefined reviewComment when not provided', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockApproveCharEdit.mockResolvedValue(true);

		const event = makeActionEvent({ editId: 'edit-1' }, { user: { id: 'reviewer-1' } });
		await actions!.approve(event);

		expect(mockApproveCharEdit).toHaveBeenCalledWith('edit-1', 'reviewer-1', undefined);
	});

	it('fails 404 when edit not found', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockApproveCharEdit.mockResolvedValue(false);

		const event = makeActionEvent({ editId: 'nonexistent' }, { user: { id: 'reviewer-1' } });
		const result = await actions!.approve(event);

		expect(result).toMatchObject({ status: 404 });
	});
});

describe('actions.reject', () => {
	it('fails 401 when no user', async () => {
		const event = makeActionEvent({ editId: 'edit-1', rejectComment: 'Bad edit' }, { user: null });
		const result = await actions!.reject(event);

		expect(result).toMatchObject({ status: 401 });
	});

	it('fails 403 when user lacks wikiEdit permission', async () => {
		mockHasPermission.mockResolvedValue(false);
		const event = makeActionEvent(
			{ editId: 'edit-1', rejectComment: 'Bad edit' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.reject(event);

		expect(result).toMatchObject({ status: 403 });
		expect(mockHasPermission).toHaveBeenCalledWith('user-1', 'wikiEdit');
	});

	it('fails 400 when no editId', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent({ rejectComment: 'Bad edit' }, { user: { id: 'user-1' } });
		const result = await actions!.reject(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when no rejectComment', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent({ editId: 'edit-1' }, { user: { id: 'user-1' } });
		const result = await actions!.reject(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when rejectComment is whitespace only', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent(
			{ editId: 'edit-1', rejectComment: '   ' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.reject(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('returns rejected:true on success', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockRejectCharEdit.mockResolvedValue(true);

		const event = makeActionEvent(
			{ editId: 'edit-1', rejectComment: 'Incorrect gloss' },
			{ user: { id: 'reviewer-1' } }
		);
		const result = await actions!.reject(event);

		expect(result).toEqual({ rejected: true, editId: 'edit-1' });
		expect(mockRejectCharEdit).toHaveBeenCalledWith('edit-1', 'reviewer-1', 'Incorrect gloss');
	});

	it('fails 404 when edit not found', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockRejectCharEdit.mockResolvedValue(false);

		const event = makeActionEvent(
			{ editId: 'nonexistent', rejectComment: 'Bad' },
			{ user: { id: 'reviewer-1' } }
		);
		const result = await actions!.reject(event);

		expect(result).toMatchObject({ status: 404 });
	});
});

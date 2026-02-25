import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetCharEditHistory = vi.fn();
const mockGetCharManualById = vi.fn();
const mockSubmitCharEdit = vi.fn();
const mockApproveCharEdit = vi.fn();
const mockRejectCharEdit = vi.fn();
const mockHasPermission = vi.fn();
const mockResolveUserNames = vi.fn();

vi.mock('$lib/server/services/char-edit', () => ({
	getCharEditHistory: (...args: unknown[]) => mockGetCharEditHistory(...args),
	getCharManualById: (...args: unknown[]) => mockGetCharManualById(...args),
	submitCharEdit: (...args: unknown[]) => mockSubmitCharEdit(...args),
	approveCharEdit: (...args: unknown[]) => mockApproveCharEdit(...args),
	rejectCharEdit: (...args: unknown[]) => mockRejectCharEdit(...args)
}));

vi.mock('$lib/server/services/permissions', () => ({
	hasPermission: (...args: unknown[]) => mockHasPermission(...args)
}));

vi.mock('$lib/server/services/user', () => ({
	resolveUserNames: (...args: unknown[]) => mockResolveUserNames(...args)
}));

// Mock the db chain for: db.select().from(charBase).where(...).then(rows => rows[0])
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

vi.mock('$lib/server/db/dictionary.schema', () => ({
	charBase: { character: 'character' }
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
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
		status: 'approved',
		editComment: 'Updated gloss',
		reviewComment: 'LGTM',
		editedBy: 'user-1',
		reviewedBy: 'reviewer-1',
		createdAt: new Date('2025-01-15T10:00:00Z'),
		reviewedAt: new Date('2025-01-15T11:00:00Z'),
		anonymousSessionId: null,
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
		// Fields that exist on charManual but are NOT editable data columns
		codepoint: null,
		junDaRank: null,
		junDaFrequency: null,
		junDaPerMillion: null,
		subtlexRank: null,
		subtlexCount: null,
		subtlexPerMillion: null,
		subtlexContextDiversity: null,
		shuowenExplanation: null,
		shuowenPronunciation: null,
		shuowenPinyin: null,
		pinyinFrequencies: null,
		...overrides
	};
}

function makeBaseRow(overrides: Record<string, unknown> = {}) {
	return {
		character: '水',
		gloss: 'base water',
		hint: null,
		originalMeaning: null,
		isVerified: false,
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

function makeLoadEvent(character: string, canReview = false, page = '1') {
	const url = new URL(`http://localhost:5173/wiki/${character}/history`);
	if (page !== '1') url.searchParams.set('page', page);
	return {
		params: { character },
		url,
		parent: () => Promise.resolve({ canReview })
	} as unknown as Parameters<typeof load>[0];
}

function makeActionEvent(
	formEntries: Record<string, string>,
	locals: Record<string, unknown> = {},
	character = '水'
) {
	const form = new FormData();
	for (const [k, v] of Object.entries(formEntries)) {
		form.set(k, v);
	}
	return {
		request: {
			formData: () => Promise.resolve(form)
		},
		params: { character },
		locals
	} as unknown as Parameters<NonNullable<typeof actions>['rollback']>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCharEditHistory.mockResolvedValue({ edits: [], total: 0 });
	mockResolveUserNames.mockResolvedValue(new Map());
	mockHasPermission.mockResolvedValue(false);
	mockDbThen.mockImplementation((cb: (rows: unknown[]) => unknown) => cb([]));
});

describe('load', () => {
	it('returns edits with resolved names', async () => {
		const edit = makeEdit();
		mockGetCharEditHistory.mockResolvedValue({ edits: [edit], total: 1 });
		mockResolveUserNames.mockResolvedValue(
			new Map([
				['user-1', 'Alice'],
				['reviewer-1', 'Bob']
			])
		);

		const event = makeLoadEvent('水');
		const result = await loadResult(event);

		expect(result.edits).toHaveLength(1);
		expect(result.edits[0]).toMatchObject({
			id: 'edit-1',
			character: '水',
			status: 'approved',
			editorName: 'Alice',
			reviewerName: 'Bob',
			createdAt: '2025-01-15T10:00:00.000Z',
			reviewedAt: '2025-01-15T11:00:00.000Z',
			gloss: 'water',
			changedFields: ['gloss']
		});
		expect(mockGetCharEditHistory).toHaveBeenCalledWith('水', { limit: 51, offset: 0 });
	});

	it('uses char_base as baseline for a single edit', async () => {
		const edit = makeEdit();
		const baseRow = makeBaseRow();
		mockGetCharEditHistory.mockResolvedValue({ edits: [edit], total: 1 });
		mockDbThen.mockImplementation((cb: (rows: unknown[]) => unknown) => cb([baseRow]));

		const event = makeLoadEvent('水');
		const result = await loadResult(event);

		expect(result.baselineMap['edit-1']).toMatchObject({
			gloss: 'base water',
			isVerified: false,
			strokeCountSimp: 4
		});
	});

	it('uses preceding edit as baseline for sequential edits', async () => {
		const edit2 = makeEdit({
			id: 'edit-2',
			gloss: 'water (updated)',
			createdAt: new Date('2025-01-16T10:00:00Z')
		});
		const edit1 = makeEdit({
			id: 'edit-1',
			gloss: 'water',
			createdAt: new Date('2025-01-15T10:00:00Z')
		});
		// Edits returned newest-first: [edit2, edit1]
		mockGetCharEditHistory.mockResolvedValue({ edits: [edit2, edit1], total: 2 });
		const baseRow = makeBaseRow();
		mockDbThen.mockImplementation((cb: (rows: unknown[]) => unknown) => cb([baseRow]));

		const event = makeLoadEvent('水');
		const result = await loadResult(event);

		// edit-2's baseline should be edit-1's data
		expect(result.baselineMap['edit-2']).toMatchObject({ gloss: 'water' });
		// edit-1's baseline should be char_base data
		expect(result.baselineMap['edit-1']).toMatchObject({ gloss: 'base water' });
	});

	it('returns empty baselineMap when no char_base found', async () => {
		mockDbThen.mockImplementation((cb: (rows: unknown[]) => unknown) => cb([]));

		const event = makeLoadEvent('水');
		const result = await loadResult(event);

		expect(result.baselineMap).toEqual({});
	});

	it('labels anonymous editors as "Anonymous"', async () => {
		const edit = makeEdit({ editedBy: null, reviewedBy: null, reviewedAt: null });
		mockGetCharEditHistory.mockResolvedValue({ edits: [edit], total: 1 });
		mockResolveUserNames.mockResolvedValue(new Map());

		const event = makeLoadEvent('水');
		const result = await loadResult(event);

		expect(result.edits[0].editorName).toBe('Anonymous');
		expect(result.edits[0].reviewerName).toBeNull();
	});

	it('labels unknown user IDs as "Unknown"', async () => {
		const edit = makeEdit({ editedBy: 'deleted-user', reviewedBy: 'deleted-reviewer' });
		mockGetCharEditHistory.mockResolvedValue({ edits: [edit], total: 1 });
		mockResolveUserNames.mockResolvedValue(new Map());

		const event = makeLoadEvent('水');
		const result = await loadResult(event);

		expect(result.edits[0].editorName).toBe('Unknown');
		expect(result.edits[0].reviewerName).toBe('Unknown');
	});

	it('passes canReview from parent', async () => {
		const event = makeLoadEvent('水', true);
		const result = await loadResult(event);

		expect(result.canReview).toBe(true);
	});

	it('collects both editedBy and reviewedBy user IDs for resolution', async () => {
		const edits = [
			makeEdit({ id: 'e1', editedBy: 'u1', reviewedBy: 'u2' }),
			makeEdit({ id: 'e2', editedBy: 'u3', reviewedBy: null, reviewedAt: null })
		];
		mockGetCharEditHistory.mockResolvedValue({ edits, total: 2 });
		mockResolveUserNames.mockResolvedValue(new Map());

		const event = makeLoadEvent('水');
		await load(event);

		// Should include u1, u3 from editedBy and u2 from reviewedBy (null filtered out)
		expect(mockResolveUserNames).toHaveBeenCalledWith(['u1', 'u3', 'u2']);
	});
});

describe('actions.rollback', () => {
	it('fails 401 when no user', async () => {
		const event = makeActionEvent(
			{ editId: 'edit-1', rollbackComment: 'Reverting' },
			{ user: null }
		);
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 401 });
	});

	it('fails 403 when user lacks wikiEdit permission', async () => {
		mockHasPermission.mockResolvedValue(false);
		const event = makeActionEvent(
			{ editId: 'edit-1', rollbackComment: 'Reverting' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 403 });
		expect(mockHasPermission).toHaveBeenCalledWith('user-1', 'wikiEdit');
	});

	it('fails 400 when no editId', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent({ rollbackComment: 'Reverting' }, { user: { id: 'user-1' } });
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when no rollbackComment', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent({ editId: 'edit-1' }, { user: { id: 'user-1' } });
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when rollbackComment is whitespace only', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent(
			{ editId: 'edit-1', rollbackComment: '   ' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 404 when edit not found', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockGetCharManualById.mockResolvedValue(null);

		const event = makeActionEvent(
			{ editId: 'nonexistent', rollbackComment: 'Reverting' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 404 });
	});

	it('fails 400 when edit belongs to different character', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockGetCharManualById.mockResolvedValue(makeEdit({ character: '火' }));

		const event = makeActionEvent(
			{ editId: 'edit-1', rollbackComment: 'Reverting' },
			{ user: { id: 'user-1' } },
			'水' // params.character
		);
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when edit is not approved (e.g. pending)', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockGetCharManualById.mockResolvedValue(makeEdit({ status: 'pending' }));

		const event = makeActionEvent(
			{ editId: 'edit-1', rollbackComment: 'Reverting' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when edit is rejected', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockGetCharManualById.mockResolvedValue(makeEdit({ status: 'rejected' }));

		const event = makeActionEvent(
			{ editId: 'edit-1', rollbackComment: 'Reverting' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('creates rollback edit with [Rollback] prefix and redirects on success', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockGetCharManualById.mockResolvedValue(makeEdit({ character: '水', status: 'approved' }));
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'approved' });

		const event = makeActionEvent(
			{ editId: 'edit-1', rollbackComment: 'Bad data in this edit' },
			{ user: { id: 'reviewer-1' } }
		);

		// redirect() throws a Redirect object after successful submitCharEdit
		await expect(actions!.rollback(event)).rejects.toMatchObject({
			status: 303,
			location: `/wiki/${encodeURIComponent('水')}/history`
		});

		expect(mockSubmitCharEdit).toHaveBeenCalledWith(
			expect.objectContaining({
				character: '水',
				editedBy: { userId: 'reviewer-1' },
				editComment: '[Rollback] Bad data in this edit',
				autoApprove: true
			})
		);

		// Verify the data columns are passed (should NOT include metadata fields)
		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		expect(callArgs.data).not.toHaveProperty('id');
		expect(callArgs.data).not.toHaveProperty('status');
		expect(callArgs.data).not.toHaveProperty('editedBy');
		expect(callArgs.data).not.toHaveProperty('reviewedBy');
		expect(callArgs.data).not.toHaveProperty('reviewedAt');
		expect(callArgs.data).not.toHaveProperty('reviewComment');
		expect(callArgs.data).not.toHaveProperty('anonymousSessionId');
		expect(callArgs.data).not.toHaveProperty('editComment');
		expect(callArgs.data).not.toHaveProperty('createdAt');
		expect(callArgs.data).not.toHaveProperty('character');
		expect(callArgs.data).not.toHaveProperty('changedFields');
		// But SHOULD include data columns
		expect(callArgs.data).toHaveProperty('gloss', 'water');
		expect(callArgs.data).toHaveProperty('pinyin');
	});

	it('returns 500 when submitCharEdit throws a non-redirect error', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockGetCharManualById.mockResolvedValue(makeEdit({ character: '水', status: 'approved' }));
		mockSubmitCharEdit.mockRejectedValue(new Error('DB connection lost'));

		const event = makeActionEvent(
			{ editId: 'edit-1', rollbackComment: 'Reverting bad data' },
			{ user: { id: 'reviewer-1' } }
		);
		const result = await actions!.rollback(event);

		expect(result).toMatchObject({ status: 500 });
	});
});

describe('actions.approveEdit', () => {
	it('fails 401 when no user', async () => {
		const event = makeActionEvent({ editId: 'edit-1' }, { user: null });
		const result = await actions!.approveEdit(event);

		expect(result).toMatchObject({ status: 401 });
	});

	it('fails 403 when user lacks wikiEdit permission', async () => {
		mockHasPermission.mockResolvedValue(false);
		const event = makeActionEvent({ editId: 'edit-1' }, { user: { id: 'user-1' } });
		const result = await actions!.approveEdit(event);

		expect(result).toMatchObject({ status: 403 });
		expect(mockHasPermission).toHaveBeenCalledWith('user-1', 'wikiEdit');
	});

	it('fails 400 when missing editId', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent({}, { user: { id: 'user-1' } });
		const result = await actions!.approveEdit(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('returns approved: true on success', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockApproveCharEdit.mockResolvedValue(true);

		const event = makeActionEvent({ editId: 'edit-1' }, { user: { id: 'user-1' } });
		const result = await actions!.approveEdit(event);

		expect(result).toEqual({ approved: true });
		expect(mockApproveCharEdit).toHaveBeenCalledWith('edit-1', 'user-1');
	});

	it('fails 404 when edit not found or already reviewed', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockApproveCharEdit.mockResolvedValue(false);

		const event = makeActionEvent({ editId: 'nonexistent' }, { user: { id: 'user-1' } });
		const result = await actions!.approveEdit(event);

		expect(result).toMatchObject({ status: 404 });
	});
});

describe('actions.rejectEdit', () => {
	it('fails 401 when no user', async () => {
		const event = makeActionEvent({ editId: 'edit-1', rejectComment: 'Bad edit' }, { user: null });
		const result = await actions!.rejectEdit(event);

		expect(result).toMatchObject({ status: 401 });
	});

	it('fails 403 when user lacks wikiEdit permission', async () => {
		mockHasPermission.mockResolvedValue(false);
		const event = makeActionEvent(
			{ editId: 'edit-1', rejectComment: 'Bad edit' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.rejectEdit(event);

		expect(result).toMatchObject({ status: 403 });
		expect(mockHasPermission).toHaveBeenCalledWith('user-1', 'wikiEdit');
	});

	it('fails 400 when missing editId', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent({ rejectComment: 'Bad edit' }, { user: { id: 'user-1' } });
		const result = await actions!.rejectEdit(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when missing rejectComment', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent({ editId: 'edit-1' }, { user: { id: 'user-1' } });
		const result = await actions!.rejectEdit(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when rejectComment is whitespace only', async () => {
		mockHasPermission.mockResolvedValue(true);
		const event = makeActionEvent(
			{ editId: 'edit-1', rejectComment: '   ' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.rejectEdit(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('returns rejected: true on success', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockRejectCharEdit.mockResolvedValue(true);

		const event = makeActionEvent(
			{ editId: 'edit-1', rejectComment: 'Incorrect data' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.rejectEdit(event);

		expect(result).toEqual({ rejected: true });
		expect(mockRejectCharEdit).toHaveBeenCalledWith('edit-1', 'user-1', 'Incorrect data');
	});

	it('fails 404 when edit not found or already reviewed', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockRejectCharEdit.mockResolvedValue(false);

		const event = makeActionEvent(
			{ editId: 'nonexistent', rejectComment: 'Bad data' },
			{ user: { id: 'user-1' } }
		);
		const result = await actions!.rejectEdit(event);

		expect(result).toMatchObject({ status: 404 });
	});
});

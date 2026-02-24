import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockSubmitCharEdit = vi.fn();
const mockGetPendingEdits = vi.fn();
const mockApproveCharEdit = vi.fn();
const mockRejectCharEdit = vi.fn();
const mockHasPermission = vi.fn();
const mockResolveUserNames = vi.fn();

vi.mock('$lib/server/services/char-edit', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/services/char-edit')>();
	return {
		CharEditError: actual.CharEditError,
		submitCharEdit: (...args: unknown[]) => mockSubmitCharEdit(...args),
		getPendingEdits: (...args: unknown[]) => mockGetPendingEdits(...args),
		approveCharEdit: (...args: unknown[]) => mockApproveCharEdit(...args),
		rejectCharEdit: (...args: unknown[]) => mockRejectCharEdit(...args)
	};
});

vi.mock('$lib/server/services/permissions', () => ({
	hasPermission: (...args: unknown[]) => mockHasPermission(...args)
}));

vi.mock('$lib/server/services/user', () => ({
	resolveUserNames: (...args: unknown[]) => mockResolveUserNames(...args)
}));

const { load, actions } = await import('./+page.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

// ── Helpers ────────────────────────────────────────────────────

function makePendingEdit(overrides: Record<string, unknown> = {}) {
	return {
		id: 'edit-1',
		character: '水',
		status: 'pending',
		editComment: 'Updated gloss',
		reviewComment: null,
		editedBy: 'user-1',
		reviewedBy: null,
		createdAt: new Date('2025-01-15T10:00:00Z'),
		reviewedAt: null,
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
		...overrides
	};
}

function makeLoadEvent(character: string, canReview = false) {
	return {
		params: { character },
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
	} as unknown as Parameters<NonNullable<typeof actions>['submitEdit']>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetPendingEdits.mockResolvedValue([]);
	mockResolveUserNames.mockResolvedValue(new Map());
	mockHasPermission.mockResolvedValue(false);
});

// ── load ───────────────────────────────────────────────────────

describe('load', () => {
	it('returns pending edits with resolved names', async () => {
		const edit = makePendingEdit();
		mockGetPendingEdits.mockResolvedValue([edit]);
		mockResolveUserNames.mockResolvedValue(new Map([['user-1', 'Alice']]));

		const event = makeLoadEvent('水');
		const result = await loadResult(event);

		expect(result.pendingEdits).toHaveLength(1);
		expect(result.pendingEdits[0]).toMatchObject({
			id: 'edit-1',
			editComment: 'Updated gloss',
			editorName: 'Alice',
			createdAt: '2025-01-15T10:00:00.000Z',
			changedFields: ['gloss']
		});
		expect(mockGetPendingEdits).toHaveBeenCalledWith('水');
	});

	it('labels anonymous editors as "Anonymous"', async () => {
		const edit = makePendingEdit({ editedBy: null });
		mockGetPendingEdits.mockResolvedValue([edit]);
		mockResolveUserNames.mockResolvedValue(new Map());

		const event = makeLoadEvent('水');
		const result = await loadResult(event);

		expect(result.pendingEdits[0].editorName).toBe('Anonymous');
	});

	it('labels unknown user IDs as "Unknown"', async () => {
		const edit = makePendingEdit({ editedBy: 'deleted-user' });
		mockGetPendingEdits.mockResolvedValue([edit]);
		mockResolveUserNames.mockResolvedValue(new Map());

		const event = makeLoadEvent('水');
		const result = await loadResult(event);

		expect(result.pendingEdits[0].editorName).toBe('Unknown');
	});

	it('passes canReview from parent', async () => {
		const event = makeLoadEvent('水', true);
		const result = await loadResult(event);

		expect(result.canReview).toBe(true);
	});

	it('passes canReview=false from parent', async () => {
		const event = makeLoadEvent('水', false);
		const result = await loadResult(event);

		expect(result.canReview).toBe(false);
	});

	it('collects both editedBy and reviewedBy user IDs for resolution', async () => {
		const edits = [
			makePendingEdit({ id: 'e1', editedBy: 'u1', reviewedBy: 'u2' }),
			makePendingEdit({ id: 'e2', editedBy: 'u3', reviewedBy: null })
		];
		mockGetPendingEdits.mockResolvedValue(edits);
		mockResolveUserNames.mockResolvedValue(new Map());

		const event = makeLoadEvent('水');
		await load(event);

		// Should include u1, u3 from editedBy and u2 from reviewedBy (null filtered out)
		expect(mockResolveUserNames).toHaveBeenCalledWith(['u1', 'u3', 'u2']);
	});

	it('returns empty pendingEdits when none exist', async () => {
		mockGetPendingEdits.mockResolvedValue([]);

		const event = makeLoadEvent('火');
		const result = await loadResult(event);

		expect(result.pendingEdits).toEqual([]);
		expect(mockGetPendingEdits).toHaveBeenCalledWith('火');
	});
});

// ── actions.submitEdit ─────────────────────────────────────────

describe('actions.submitEdit', () => {
	it('fails 400 when no edit comment', async () => {
		const event = makeActionEvent(
			{ gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);
		const result = await actions!.submitEdit(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when edit comment is whitespace only', async () => {
		const event = makeActionEvent(
			{ editComment: '   ', gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);
		const result = await actions!.submitEdit(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('fails 400 when no user and no anonymous session', async () => {
		const event = makeActionEvent(
			{ editComment: 'Fix gloss', gloss: 'water' },
			{ user: null, anonymousSessionId: undefined }
		);
		const result = await actions!.submitEdit(event);

		expect(result).toMatchObject({ status: 400 });
	});

	it('calls hasPermission for autoApprove when user is present', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'approved' });

		const event = makeActionEvent(
			{ editComment: 'Fix gloss', gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		expect(mockHasPermission).toHaveBeenCalledWith('user-1', 'wikiEdit');
		expect(mockSubmitCharEdit).toHaveBeenCalledWith(expect.objectContaining({ autoApprove: true }));
	});

	it('sets autoApprove false when user lacks permission', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{ editComment: 'Fix gloss', gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		expect(mockSubmitCharEdit).toHaveBeenCalledWith(
			expect.objectContaining({ autoApprove: false })
		);
	});

	it('sets autoApprove false for anonymous users (no userId)', async () => {
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{ editComment: 'Fix gloss', gloss: 'water' },
			{ user: null, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		expect(mockHasPermission).not.toHaveBeenCalled();
		expect(mockSubmitCharEdit).toHaveBeenCalledWith(
			expect.objectContaining({ autoApprove: false })
		);
	});

	it('parses form fields correctly (gloss, hint, pinyin as JSON, etc.)', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{
				editComment: 'Full edit',
				gloss: 'water',
				hint: 'liquid',
				originalMeaning: 'flowing water',
				isVerified: 'on',
				pinyin: '["shuǐ"]',
				simplifiedVariants: '["水"]',
				traditionalVariants: '["水"]',
				components: '[{"char":"丶","type":"semantic"}]',
				strokeCountSimp: '4',
				strokeCountTrad: '5',
				strokeDataSimp: '{"strokes":["M..."]}',
				strokeDataTrad: '{"strokes":["M..."]}',
				fragmentsSimp: '[["M..."]]',
				fragmentsTrad: '[["M..."]]',
				historicalPronunciations: '{"mc":"syijX"}',
				customSources: '["Source A|https://example.com"]'
			},
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		expect(callArgs.character).toBe('水');
		expect(callArgs.editComment).toBe('Full edit');
		expect(callArgs.editedBy).toEqual({ userId: 'user-1', anonymousSessionId: 'anon-1' });
		expect(callArgs.data).toMatchObject({
			gloss: 'water',
			hint: 'liquid',
			originalMeaning: 'flowing water',
			isVerified: true,
			pinyin: ['shuǐ'],
			simplifiedVariants: ['水'],
			traditionalVariants: ['水'],
			components: [{ char: '丶', type: 'semantic' }],
			strokeCountSimp: 4,
			strokeCountTrad: 5,
			strokeDataSimp: { strokes: ['M...'] },
			strokeDataTrad: { strokes: ['M...'] },
			fragmentsSimp: [['M...']],
			fragmentsTrad: [['M...']],
			historicalPronunciations: { mc: 'syijX' },
			customSources: ['Source A|https://example.com']
		});
	});

	it('sets isVerified false when checkbox is absent', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{ editComment: 'Fix gloss', gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		expect(callArgs.data.isVerified).toBe(false);
	});

	it('sets missing string fields to null', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{ editComment: 'Minimal edit' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		expect(callArgs.data.gloss).toBeNull();
		expect(callArgs.data.hint).toBeNull();
		expect(callArgs.data.originalMeaning).toBeNull();
		expect(callArgs.data.pinyin).toBeNull();
		expect(callArgs.data.strokeCountSimp).toBeNull();
		expect(callArgs.data.strokeCountTrad).toBeNull();
		expect(callArgs.data.customSources).toBeNull();
	});

	it('sanitizes customSources: strips javascript: URLs', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{
				editComment: 'Add sources',
				customSources: JSON.stringify([
					'Safe Source|https://example.com',
					'XSS attempt|javascript:alert(1)',
					'Plain text source'
				])
			},
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		expect(callArgs.data.customSources).toEqual([
			'Safe Source|https://example.com',
			'Plain text source'
		]);
	});

	it('sanitizes customSources: strips data: URLs', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{
				editComment: 'Add sources',
				customSources: JSON.stringify(['Data URL|data:text/html,<h1>hi</h1>'])
			},
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		// All entries are unsafe, so customSources becomes null
		expect(callArgs.data.customSources).toBeNull();
	});

	it('sanitizes customSources: strips protocol-relative URLs', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{
				editComment: 'Add sources',
				customSources: JSON.stringify(['Proto-relative|//evil.com/path'])
			},
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		expect(callArgs.data.customSources).toBeNull();
	});

	it('allows safe relative URLs in customSources', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{
				editComment: 'Add sources',
				customSources: JSON.stringify(['Internal|/wiki/水'])
			},
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		expect(callArgs.data.customSources).toEqual(['Internal|/wiki/水']);
	});

	it('redirects on success with edit status', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{ editComment: 'Fix gloss', gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({
			status: 303,
			location: `/wiki/${encodeURIComponent('水')}?edited=pending`
		});
	});

	it('redirects with approved status when auto-approved', async () => {
		mockHasPermission.mockResolvedValue(true);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'approved' });

		const event = makeActionEvent(
			{ editComment: 'Fix gloss', gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({
			status: 303,
			location: `/wiki/${encodeURIComponent('水')}?edited=approved`
		});
	});

	it('returns fail(500) when submitCharEdit throws an Error', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockRejectedValue(new Error('DB connection lost'));

		const event = makeActionEvent(
			{ editComment: 'Fix gloss', gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		const result = await actions!.submitEdit(event);
		expect(result).toMatchObject({ status: 500 });
	});

	it('returns fail(500) with generic message when submitCharEdit throws a non-Error', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockRejectedValue('string error');

		const event = makeActionEvent(
			{ editComment: 'Fix gloss', gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		const result = await actions!.submitEdit(event);
		expect(result).toMatchObject({ status: 500 });
	});

	it('handles safeJsonParse for malformed JSON gracefully', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{
				editComment: 'Test parse',
				pinyin: 'not-valid-json',
				components: '{broken'
			},
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		expect(callArgs.data.pinyin).toBeNull();
		expect(callArgs.data.components).toBeNull();
	});

	it('handles safeJsonParse for "null" and "undefined" strings', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{
				editComment: 'Test parse',
				pinyin: 'null',
				components: 'undefined'
			},
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		const callArgs = mockSubmitCharEdit.mock.calls[0][0];
		expect(callArgs.data.pinyin).toBeNull();
		expect(callArgs.data.components).toBeNull();
	});
});

// ── actions.approveEdit ────────────────────────────────────────

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

// ── actions.rejectEdit ─────────────────────────────────────────

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

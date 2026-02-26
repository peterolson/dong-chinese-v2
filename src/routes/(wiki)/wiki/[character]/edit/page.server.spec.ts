import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockSubmitCharEdit = vi.fn();
const mockGetUserPendingEdit = vi.fn();
const mockUpdateCharEdit = vi.fn();
const mockHasPermission = vi.fn();

vi.mock('$lib/server/services/char-edit', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/services/char-edit')>();
	return {
		CharEditError: actual.CharEditError,
		submitCharEdit: (...args: unknown[]) => mockSubmitCharEdit(...args),
		getUserPendingEdit: (...args: unknown[]) => mockGetUserPendingEdit(...args),
		updateCharEdit: (...args: unknown[]) => mockUpdateCharEdit(...args)
	};
});

vi.mock('$lib/server/services/permissions', () => ({
	hasPermission: (...args: unknown[]) => mockHasPermission(...args)
}));

const { actions } = await import('./+page.server');

// ── Helpers ────────────────────────────────────────────────────

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
	mockHasPermission.mockResolvedValue(false);
	mockGetUserPendingEdit.mockResolvedValue(null);
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

// ── actions.submitEdit — update in-place ────────────────────────

describe('actions.submitEdit — update in-place', () => {
	it('calls updateCharEdit when user has existing pending edit', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockGetUserPendingEdit.mockResolvedValue({ id: 'existing-edit' });
		mockUpdateCharEdit.mockResolvedValue({ id: 'existing-edit', status: 'pending' });

		const event = makeActionEvent(
			{ editComment: 'Updated edit', gloss: 'new value' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({
			status: 303,
			location: `/wiki/${encodeURIComponent('水')}?edited=pending`
		});

		expect(mockUpdateCharEdit).toHaveBeenCalledWith(
			expect.objectContaining({
				editId: 'existing-edit',
				character: '水',
				editComment: 'Updated edit'
			})
		);
		expect(mockSubmitCharEdit).not.toHaveBeenCalled();
	});

	it('falls back to submitCharEdit when updateCharEdit returns null (race condition)', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockGetUserPendingEdit.mockResolvedValue({ id: 'existing-edit' });
		mockUpdateCharEdit.mockResolvedValue(null); // edit was approved in between
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{ editComment: 'Updated edit', gloss: 'new value' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		expect(mockUpdateCharEdit).toHaveBeenCalled();
		expect(mockSubmitCharEdit).toHaveBeenCalled();
	});

	it('creates new edit when no existing pending edit', async () => {
		mockHasPermission.mockResolvedValue(false);
		mockGetUserPendingEdit.mockResolvedValue(null);
		mockSubmitCharEdit.mockResolvedValue({ id: 'new-edit', status: 'pending' });

		const event = makeActionEvent(
			{ editComment: 'New edit', gloss: 'water' },
			{ user: { id: 'user-1' }, anonymousSessionId: 'anon-1' }
		);

		await expect(actions!.submitEdit(event)).rejects.toMatchObject({ status: 303 });

		expect(mockUpdateCharEdit).not.toHaveBeenCalled();
		expect(mockSubmitCharEdit).toHaveBeenCalled();
	});
});

import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetCharacterData = vi.fn();
const mockGetComponentUses = vi.fn();
const mockGetDeletedComponentGlyphs = vi.fn();
const mockCountPendingEdits = vi.fn();
const mockGetUserPendingEdit = vi.fn();

vi.mock('$lib/server/services/dictionary', () => ({
	getCharacterData: (...args: unknown[]) => mockGetCharacterData(...args),
	getComponentUses: (...args: unknown[]) => mockGetComponentUses(...args),
	getDeletedComponentGlyphs: (...args: unknown[]) => mockGetDeletedComponentGlyphs(...args)
}));

vi.mock('$lib/server/services/char-edit', () => ({
	countPendingEdits: (...args: unknown[]) => mockCountPendingEdits(...args),
	getUserPendingEdit: (...args: unknown[]) => mockGetUserPendingEdit(...args)
}));

vi.mock('$lib/data/editable-fields', () => ({
	EDITABLE_FIELDS: ['gloss', 'hint', 'isVerified', 'pinyin']
}));

const { load } = await import('./+layout.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(character: string, canReview = false, userId?: string, anonId?: string) {
	return {
		params: { character },
		parent: () => Promise.resolve({ canReview }),
		locals: {
			user: userId ? { id: userId } : null,
			anonymousSessionId: anonId ?? null
		}
	} as unknown as Parameters<typeof load>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCharacterData.mockResolvedValue(null);
	mockGetComponentUses.mockResolvedValue([]);
	mockGetDeletedComponentGlyphs.mockResolvedValue(null);
	mockCountPendingEdits.mockResolvedValue(0);
	mockGetUserPendingEdit.mockResolvedValue(null);
});

describe('load', () => {
	it('throws 404 for multi-character strings', async () => {
		const event = makeEvent('水火');
		await expect(load(event)).rejects.toMatchObject({ status: 404 });
	});

	it('throws 404 when character is not found in dictionary', async () => {
		mockGetCharacterData.mockResolvedValue(null);
		const event = makeEvent('龘');
		await expect(load(event)).rejects.toMatchObject({ status: 404 });
	});

	it('returns character data and pending count on success', async () => {
		const charData = { character: '水', gloss: 'water', pinyin: ['shuǐ'] };
		const componentUses = [
			{ type: 'meaning', characters: [{ character: '泉', isVerified: true }], verifiedCount: 1 }
		];
		mockGetCharacterData.mockResolvedValue(charData);
		mockGetComponentUses.mockResolvedValue(componentUses);
		mockCountPendingEdits.mockResolvedValue(3);

		const event = makeEvent('水', true);
		const result = await loadResult(event);

		expect(result.character).toEqual(charData);
		expect(result.componentUses).toEqual(componentUses);
		expect(result.pendingCount).toBe(3);
	});

	it('passes the single character to getCharacterData and getComponentUses', async () => {
		const charData = { character: '火', gloss: 'fire', pinyin: ['huǒ'] };
		mockGetCharacterData.mockResolvedValue(charData);
		mockCountPendingEdits.mockResolvedValue(1);

		const event = makeEvent('火', true);
		await loadResult(event);

		expect(mockGetCharacterData).toHaveBeenCalledWith('火');
		expect(mockGetComponentUses).toHaveBeenCalledWith('火');
	});

	it('counts all pending edits for reviewers', async () => {
		const charData = { character: '水', gloss: 'water', pinyin: ['shuǐ'] };
		mockGetCharacterData.mockResolvedValue(charData);
		mockCountPendingEdits.mockResolvedValue(5);

		const event = makeEvent('水', true, 'reviewer-1');
		await loadResult(event);

		// First call should be unscoped (no editedBy)
		expect(mockCountPendingEdits).toHaveBeenCalledWith('水');
	});

	it('scopes pending count by user for non-reviewers', async () => {
		const charData = { character: '水', gloss: 'water', pinyin: ['shuǐ'] };
		mockGetCharacterData.mockResolvedValue(charData);
		mockCountPendingEdits.mockResolvedValue(1);

		const event = makeEvent('水', false, 'user-1');
		await loadResult(event);

		expect(mockCountPendingEdits).toHaveBeenCalledWith('水', {
			userId: 'user-1',
			anonymousSessionId: null
		});
	});

	it('loads user pending edit', async () => {
		const charData = { character: '水', gloss: 'water', pinyin: ['shuǐ'] };
		mockGetCharacterData.mockResolvedValue(charData);
		const pendingEdit = {
			id: 'edit-1',
			editComment: 'updated',
			changedFields: ['gloss'],
			gloss: 'liquid',
			hint: null,
			isVerified: false,
			pinyin: null
		};
		mockGetUserPendingEdit.mockResolvedValue(pendingEdit);

		const event = makeEvent('水', false, undefined, 'anon-1');
		const result = await loadResult(event);

		expect(result.userPendingEdit).not.toBeNull();
		expect(result.userPendingEdit!.id).toBe('edit-1');
		expect(result.userPendingEdit!.gloss).toBe('liquid');
	});

	it('returns deletedComponentGlyphs from dictionary service', async () => {
		const charData = { character: '开', gloss: 'to open', pinyin: ['kāi'] };
		const glyphs = {
			0: {
				character: '開',
				strokes: ['M 1 2', 'M 3 4'],
				highlightedStrokeIndices: [0, 1]
			}
		};
		mockGetCharacterData.mockResolvedValue(charData);
		mockGetDeletedComponentGlyphs.mockResolvedValue(glyphs);

		const event = makeEvent('开', true);
		const result = await loadResult(event);

		expect(mockGetDeletedComponentGlyphs).toHaveBeenCalledWith(charData);
		expect(result.deletedComponentGlyphs).toEqual(glyphs);
	});

	it('returns null deletedComponentGlyphs when none exist', async () => {
		const charData = { character: '水', gloss: 'water', pinyin: ['shuǐ'] };
		mockGetCharacterData.mockResolvedValue(charData);
		mockGetDeletedComponentGlyphs.mockResolvedValue(null);

		const event = makeEvent('水', true);
		const result = await loadResult(event);

		expect(result.deletedComponentGlyphs).toBeNull();
	});

	it('returns null userPendingEdit when none exists', async () => {
		const charData = { character: '水', gloss: 'water', pinyin: ['shuǐ'] };
		mockGetCharacterData.mockResolvedValue(charData);

		const event = makeEvent('水', false, undefined, 'anon-1');
		const result = await loadResult(event);

		expect(result.userPendingEdit).toBeNull();
	});
});

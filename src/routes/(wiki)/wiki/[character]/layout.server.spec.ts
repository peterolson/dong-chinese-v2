import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetCharacterData = vi.fn();
const mockCountPendingEdits = vi.fn();
const mockGetUserPendingEdit = vi.fn();

vi.mock('$lib/server/services/dictionary', () => ({
	getCharacterData: (...args: unknown[]) => mockGetCharacterData(...args)
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
		mockGetCharacterData.mockResolvedValue(charData);
		mockCountPendingEdits.mockResolvedValue(3);

		const event = makeEvent('水', true);
		const result = await loadResult(event);

		expect(result.character).toEqual(charData);
		expect(result.pendingCount).toBe(3);
	});

	it('passes the single character to getCharacterData', async () => {
		const charData = { character: '火', gloss: 'fire', pinyin: ['huǒ'] };
		mockGetCharacterData.mockResolvedValue(charData);
		mockCountPendingEdits.mockResolvedValue(1);

		const event = makeEvent('火', true);
		await loadResult(event);

		expect(mockGetCharacterData).toHaveBeenCalledWith('火');
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

	it('returns null userPendingEdit when none exists', async () => {
		const charData = { character: '水', gloss: 'water', pinyin: ['shuǐ'] };
		mockGetCharacterData.mockResolvedValue(charData);

		const event = makeEvent('水', false, undefined, 'anon-1');
		const result = await loadResult(event);

		expect(result.userPendingEdit).toBeNull();
	});
});

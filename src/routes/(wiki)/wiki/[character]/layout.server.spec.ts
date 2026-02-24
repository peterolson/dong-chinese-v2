import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetCharacterData = vi.fn();
const mockCountPendingEdits = vi.fn();

vi.mock('$lib/server/services/dictionary', () => ({
	getCharacterData: (...args: unknown[]) => mockGetCharacterData(...args)
}));

vi.mock('$lib/server/services/char-edit', () => ({
	countPendingEdits: (...args: unknown[]) => mockCountPendingEdits(...args)
}));

const { load } = await import('./+layout.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(character: string) {
	return { params: { character } } as unknown as Parameters<typeof load>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCharacterData.mockResolvedValue(null);
	mockCountPendingEdits.mockResolvedValue(0);
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

		const event = makeEvent('水');
		const result = await loadResult(event);

		expect(result.character).toEqual(charData);
		expect(result.pendingCount).toBe(3);
	});

	it('passes the single character to both getCharacterData and countPendingEdits', async () => {
		const charData = { character: '火', gloss: 'fire', pinyin: ['huǒ'] };
		mockGetCharacterData.mockResolvedValue(charData);
		mockCountPendingEdits.mockResolvedValue(1);

		const event = makeEvent('火');
		await loadResult(event);

		expect(mockGetCharacterData).toHaveBeenCalledWith('火');
		expect(mockCountPendingEdits).toHaveBeenCalledWith('火');
	});
});

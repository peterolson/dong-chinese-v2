import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetCharacterList = vi.fn();

vi.mock('$lib/server/services/dictionary', () => ({
	getCharacterList: (...args: unknown[]) => mockGetCharacterList(...args),
	LIST_TYPES: {
		'subtlex-rank': { label: 'Movie Frequency', orderBy: 'subtlex_rank ASC NULLS LAST' },
		'jun-da-rank': { label: 'Book Frequency', orderBy: 'jun_da_rank ASC NULLS LAST' }
	}
}));

const { load } = await import('./+page.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(params: { list_type: string; offset: string; limit: string }) {
	return { params } as unknown as Parameters<typeof load>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetCharacterList.mockResolvedValue({ items: [], total: 0 });
});

describe('load', () => {
	it('throws 404 for unknown list type', async () => {
		await expect(
			load(makeEvent({ list_type: 'nonexistent', offset: '0', limit: '50' }))
		).rejects.toMatchObject({ status: 404 });
	});

	it('throws 400 for negative offset', async () => {
		await expect(
			load(makeEvent({ list_type: 'subtlex-rank', offset: '-1', limit: '50' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for NaN offset', async () => {
		await expect(
			load(makeEvent({ list_type: 'subtlex-rank', offset: 'abc', limit: '50' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for limit 0', async () => {
		await expect(
			load(makeEvent({ list_type: 'subtlex-rank', offset: '0', limit: '0' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for limit > 500', async () => {
		await expect(
			load(makeEvent({ list_type: 'subtlex-rank', offset: '0', limit: '501' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for NaN limit', async () => {
		await expect(
			load(makeEvent({ list_type: 'subtlex-rank', offset: '0', limit: 'xyz' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('returns items with metadata for valid params', async () => {
		const fakeItems = [{ character: '\u6C34', pinyin: 'shu\u01D0', gloss: 'water' }];
		mockGetCharacterList.mockResolvedValue({ items: fakeItems, total: 100 });

		const result = await loadResult(
			makeEvent({ list_type: 'subtlex-rank', offset: '10', limit: '50' })
		);

		expect(mockGetCharacterList).toHaveBeenCalledWith('subtlex-rank', 10, 50);
		expect(result).toEqual({
			listType: 'subtlex-rank',
			listLabel: 'Movie Frequency',
			items: fakeItems,
			total: 100,
			offset: 10,
			limit: 50
		});
	});

	it('accepts offset of 0', async () => {
		mockGetCharacterList.mockResolvedValue({ items: [], total: 0 });

		const result = await loadResult(
			makeEvent({ list_type: 'jun-da-rank', offset: '0', limit: '100' })
		);

		expect(result.offset).toBe(0);
		expect(result.listType).toBe('jun-da-rank');
		expect(result.listLabel).toBe('Book Frequency');
	});
});

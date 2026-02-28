import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetCharacterList = vi.fn();

const LIST_TYPES = {
	'movie-contexts': { label: '% of Movies', navLabel: '% Movies', description: 'desc' },
	'movie-count': { label: 'Movie Frequency', navLabel: 'Movie Freq.', description: 'desc' },
	'book-count': { label: 'Book Frequency', navLabel: 'Book Freq.', description: 'desc' },
	hsk: { label: 'HSK 2.0', navLabel: 'HSK 2.0', description: 'desc' },
	'hsk-3': { label: 'HSK 3.0', navLabel: 'HSK 3.0', description: 'desc' },
	'dong-chinese': { label: '懂中文 Order', navLabel: '懂中文', description: 'desc' },
	components: { label: 'Most Common Components', navLabel: 'Components', description: 'desc' }
};

const LIST_NAV_ITEMS = [
	...Object.entries(LIST_TYPES).map(([slug, { navLabel }]) => ({
		slug,
		navLabel,
		href: (limit: number) => `/wiki/lists/${slug}/0/${limit}`
	})),
	{
		slug: 'component-types',
		navLabel: 'Component Types',
		href: () => '/wiki/lists/component-types'
	}
];

vi.mock('$lib/server/services/dictionary', () => ({
	getCharacterList: (...args: unknown[]) => mockGetCharacterList(...args),
	LIST_TYPES,
	LIST_NAV_ITEMS
}));

const { load } = await import('./+page.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(
	params: { list_type: string; offset: string; limit: string },
	searchParams?: Record<string, string>
) {
	const url = new URL(
		`http://localhost/wiki/lists/${params.list_type}/${params.offset}/${params.limit}`
	);
	if (searchParams) {
		for (const [k, v] of Object.entries(searchParams)) {
			url.searchParams.set(k, v);
		}
	}
	return { params, url } as unknown as Parameters<typeof load>[0];
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
			load(makeEvent({ list_type: 'movie-count', offset: '-1', limit: '50' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for NaN offset', async () => {
		await expect(
			load(makeEvent({ list_type: 'movie-count', offset: 'abc', limit: '50' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for limit 0', async () => {
		await expect(
			load(makeEvent({ list_type: 'movie-count', offset: '0', limit: '0' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for limit > 500', async () => {
		await expect(
			load(makeEvent({ list_type: 'movie-count', offset: '0', limit: '501' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('throws 400 for NaN limit', async () => {
		await expect(
			load(makeEvent({ list_type: 'movie-count', offset: '0', limit: 'xyz' }))
		).rejects.toMatchObject({ status: 400 });
	});

	it('returns items with metadata for valid params', async () => {
		const fakeItems = [{ character: '\u6C34', pinyin: 'shu\u01D0', gloss: 'water' }];
		mockGetCharacterList.mockResolvedValue({ items: fakeItems, total: 100 });

		const result = await loadResult(
			makeEvent({ list_type: 'movie-count', offset: '10', limit: '50' })
		);

		expect(mockGetCharacterList).toHaveBeenCalledWith('movie-count', 10, 50);
		expect(result).toMatchObject({
			listType: 'movie-count',
			listLabel: 'Movie Frequency',
			items: fakeItems,
			total: 100,
			offset: 10,
			limit: 50
		});
		expect(result.allLists).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					slug: 'movie-count',
					navLabel: 'Movie Freq.',
					href: '/wiki/lists/movie-count/0/50'
				})
			])
		);
	});

	it('accepts offset of 0', async () => {
		mockGetCharacterList.mockResolvedValue({ items: [], total: 0 });

		const result = await loadResult(
			makeEvent({ list_type: 'book-count', offset: '0', limit: '100' })
		);

		expect(result.offset).toBe(0);
		expect(result.listType).toBe('book-count');
		expect(result.listLabel).toBe('Book Frequency');
	});

	it('returns allLists with all list types including component-types', async () => {
		const result = await loadResult(makeEvent({ list_type: 'hsk', offset: '0', limit: '100' }));

		expect(result.allLists).toHaveLength(8);
		expect(result.allLists.map((l: { slug: string }) => l.slug)).toEqual([
			'movie-contexts',
			'movie-count',
			'book-count',
			'hsk',
			'hsk-3',
			'dong-chinese',
			'components',
			'component-types'
		]);
	});

	it('redirects when ?page param is present', async () => {
		await expect(
			load(makeEvent({ list_type: 'movie-count', offset: '0', limit: '100' }, { page: '3' }))
		).rejects.toMatchObject({ status: 302, location: '/wiki/lists/movie-count/200/100' });
	});

	it('ignores invalid ?page param', async () => {
		const result = await loadResult(
			makeEvent({ list_type: 'movie-count', offset: '0', limit: '50' }, { page: 'abc' })
		);
		expect(result.offset).toBe(0);
	});
});

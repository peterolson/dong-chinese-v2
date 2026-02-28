import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetComponentTypeCombinations = vi.fn();

const LIST_NAV_ITEMS = [
	{
		slug: 'movie-contexts',
		navLabel: '% Movies',
		href: (limit: number) => `/wiki/lists/movie-contexts/0/${limit}`
	},
	{
		slug: 'movie-count',
		navLabel: 'Movie Freq.',
		href: (limit: number) => `/wiki/lists/movie-count/0/${limit}`
	},
	{
		slug: 'book-count',
		navLabel: 'Book Freq.',
		href: (limit: number) => `/wiki/lists/book-count/0/${limit}`
	},
	{ slug: 'hsk', navLabel: 'HSK 2.0', href: (limit: number) => `/wiki/lists/hsk/0/${limit}` },
	{ slug: 'hsk-3', navLabel: 'HSK 3.0', href: (limit: number) => `/wiki/lists/hsk-3/0/${limit}` },
	{
		slug: 'dong-chinese',
		navLabel: '懂中文',
		href: (limit: number) => `/wiki/lists/dong-chinese/0/${limit}`
	},
	{
		slug: 'components',
		navLabel: 'Components',
		href: (limit: number) => `/wiki/lists/components/0/${limit}`
	},
	{
		slug: 'component-types',
		navLabel: 'Component Types',
		href: () => '/wiki/lists/component-types'
	}
];

vi.mock('$lib/server/services/dictionary', () => ({
	getComponentTypeCombinations: (...args: unknown[]) => mockGetComponentTypeCombinations(...args),
	LIST_NAV_ITEMS
}));

const { load } = await import('./+page.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockGetComponentTypeCombinations.mockResolvedValue({
		combinations: [
			{
				key: 'meaning,sound',
				label: [
					{ count: 1, types: ['meaning'] },
					{ count: 1, types: ['sound'] }
				],
				characters: ['好', '妈']
			},
			{ key: 'iconic', label: [{ count: 1, types: ['iconic'] }], characters: ['山'] }
		],
		totalCharacters: 3
	});
});

describe('load', () => {
	it('returns combinations and totalCharacters', async () => {
		const result = await loadResult({} as Parameters<typeof load>[0]);

		expect(mockGetComponentTypeCombinations).toHaveBeenCalledOnce();
		expect(result.combinations).toHaveLength(2);
		expect(result.totalCharacters).toBe(3);
	});

	it('returns currentSlug as component-types', async () => {
		const result = await loadResult({} as Parameters<typeof load>[0]);

		expect(result.currentSlug).toBe('component-types');
	});

	it('returns allLists with all 8 list types', async () => {
		const result = await loadResult({} as Parameters<typeof load>[0]);

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

	it('builds hrefs with limit 100 for paginated lists', async () => {
		const result = await loadResult({} as Parameters<typeof load>[0]);

		const movieContexts = result.allLists.find(
			(l: { slug: string }) => l.slug === 'movie-contexts'
		);
		expect(movieContexts?.href).toBe('/wiki/lists/movie-contexts/0/100');
	});

	it('builds href without limit for component-types', async () => {
		const result = await loadResult({} as Parameters<typeof load>[0]);

		const componentTypes = result.allLists.find(
			(l: { slug: string }) => l.slug === 'component-types'
		);
		expect(componentTypes?.href).toBe('/wiki/lists/component-types');
	});
});

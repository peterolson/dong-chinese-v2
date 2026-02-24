import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockSearchCharacters = vi.fn();

vi.mock('$lib/server/services/dictionary', () => ({
	searchCharacters: (...args: unknown[]) => mockSearchCharacters(...args)
}));

const { load } = await import('./+page.server');

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(searchParams: Record<string, string> = {}) {
	const url = new URL('http://localhost:5173/wiki/search');
	for (const [k, v] of Object.entries(searchParams)) {
		url.searchParams.set(k, v);
	}
	return { url } as Parameters<typeof load>[0];
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockSearchCharacters.mockResolvedValue([]);
});

describe('load', () => {
	it('returns empty results when no query', async () => {
		const result = await load(makeEvent());

		expect(result).toEqual({ q: '', results: [] });
		expect(mockSearchCharacters).not.toHaveBeenCalled();
	});

	it('returns empty results for whitespace query', async () => {
		const result = await load(makeEvent({ q: '   ' }));

		expect(result).toEqual({ q: '', results: [] });
		expect(mockSearchCharacters).not.toHaveBeenCalled();
	});

	it('passes trimmed query to searchCharacters', async () => {
		mockSearchCharacters.mockResolvedValue([]);
		await load(makeEvent({ q: '  water  ' }));

		expect(mockSearchCharacters).toHaveBeenCalledWith('water', 100);
	});

	it('returns results from searchCharacters', async () => {
		const fakeResults = [
			{ character: '\u6C34', pinyin: 'shu\u01D0', gloss: 'water' },
			{ character: '\u6CB3', pinyin: 'h\u00E9', gloss: 'river' }
		];
		mockSearchCharacters.mockResolvedValue(fakeResults);

		const result = await load(makeEvent({ q: 'water' }));

		expect(result).toEqual({ q: 'water', results: fakeResults });
	});
});

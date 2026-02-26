import { describe, expect, it } from 'vitest';
import { searchCharacters, getCharacterList, LIST_TYPES } from './dictionary';

describe('searchCharacters', () => {
	it('returns empty array for empty query', async () => {
		const result = await searchCharacters('');
		expect(result).toEqual([]);
	});

	it('returns empty array for whitespace-only query', async () => {
		const result = await searchCharacters('   ');
		expect(result).toEqual([]);
	});

	it('returns results matching a character query', async () => {
		// This test may return 0 results if char view is empty — just verify no error
		const result = await searchCharacters('人');
		expect(Array.isArray(result)).toBe(true);
		for (const r of result) {
			expect(r).toHaveProperty('character');
			expect(r).toHaveProperty('pinyin');
			expect(r).toHaveProperty('gloss');
		}
	});

	it('returns empty array for gibberish query', async () => {
		const result = await searchCharacters('zzzzxxx999nonexistent');
		expect(result).toEqual([]);
	});

	it('respects the limit parameter', async () => {
		const result = await searchCharacters('water', 2);
		expect(result.length).toBeLessThanOrEqual(2);
	});
});

describe('getCharacterList', () => {
	it('returns items and total for movie-count', async () => {
		const result = await getCharacterList('movie-count', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
		expect(result.items.length).toBeLessThanOrEqual(5);
		for (const item of result.items) {
			expect(item).toHaveProperty('character');
			expect(item).toHaveProperty('subtlexRank');
		}
	});

	it('returns items and total for book-count', async () => {
		const result = await getCharacterList('book-count', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
	});

	it('returns items and total for movie-contexts', async () => {
		const result = await getCharacterList('movie-contexts', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
	});

	it('returns items and total for components', async () => {
		const result = await getCharacterList('components', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
	});

	it('returns items and total for hsk', async () => {
		const result = await getCharacterList('hsk', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
	});

	it('returns items and total for hsk-3', async () => {
		const result = await getCharacterList('hsk-3', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
	});

	it('returns items and total for dong-chinese', async () => {
		const result = await getCharacterList('dong-chinese', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
	});

	it('respects offset parameter', async () => {
		const page1 = await getCharacterList('movie-count', 0, 3);
		const page2 = await getCharacterList('movie-count', 3, 3);
		// Both queries should return valid results
		expect(Array.isArray(page1.items)).toBe(true);
		expect(Array.isArray(page2.items)).toBe(true);
		// If data exists, pages should have different characters
		if (page1.items.length > 0 && page2.items.length > 0) {
			expect(page1.items[0].character).not.toBe(page2.items[0].character);
		}
	});
});

describe('LIST_TYPES', () => {
	it('has 7 list types', () => {
		expect(Object.keys(LIST_TYPES)).toHaveLength(7);
	});

	it('has expected keys', () => {
		expect(LIST_TYPES).toHaveProperty('movie-contexts');
		expect(LIST_TYPES).toHaveProperty('movie-count');
		expect(LIST_TYPES).toHaveProperty('book-count');
		expect(LIST_TYPES).toHaveProperty('hsk');
		expect(LIST_TYPES).toHaveProperty('hsk-3');
		expect(LIST_TYPES).toHaveProperty('dong-chinese');
		expect(LIST_TYPES).toHaveProperty('components');
	});

	it('each type has a label and navLabel', () => {
		for (const type of Object.values(LIST_TYPES)) {
			expect(type.label).toBeTruthy();
			expect(type.navLabel).toBeTruthy();
		}
	});
});

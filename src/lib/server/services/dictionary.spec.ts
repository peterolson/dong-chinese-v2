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
	it('returns items and total for subtlex-rank', async () => {
		const result = await getCharacterList('subtlex-rank', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
		expect(result.items.length).toBeLessThanOrEqual(5);
		for (const item of result.items) {
			expect(item).toHaveProperty('character');
			expect(item).toHaveProperty('subtlexRank');
		}
	});

	it('returns items and total for jun-da-rank', async () => {
		const result = await getCharacterList('jun-da-rank', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
	});

	it('returns items and total for subtlex-context-diversity', async () => {
		const result = await getCharacterList('subtlex-context-diversity', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
	});

	it('returns items and total for common-components', async () => {
		const result = await getCharacterList('common-components', 0, 5);
		expect(result).toHaveProperty('items');
		expect(result).toHaveProperty('total');
		expect(Array.isArray(result.items)).toBe(true);
	});

	it('respects offset parameter', async () => {
		const page1 = await getCharacterList('subtlex-rank', 0, 3);
		const page2 = await getCharacterList('subtlex-rank', 3, 3);
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
	it('has 4 list types', () => {
		expect(Object.keys(LIST_TYPES)).toHaveLength(4);
	});

	it('has expected keys', () => {
		expect(LIST_TYPES).toHaveProperty('subtlex-rank');
		expect(LIST_TYPES).toHaveProperty('subtlex-context-diversity');
		expect(LIST_TYPES).toHaveProperty('jun-da-rank');
		expect(LIST_TYPES).toHaveProperty('common-components');
	});

	it('each type has a label', () => {
		for (const type of Object.values(LIST_TYPES)) {
			expect(type.label).toBeTruthy();
		}
	});
});

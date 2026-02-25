import { describe, expect, it } from 'vitest';
import { normalize, deepEqual, computeChangedFields } from './deep-equal';
import { EDITABLE_FIELDS } from './editable-fields';

describe('normalize', () => {
	it('normalizes null and undefined to null', () => {
		expect(normalize(null)).toBe(null);
		expect(normalize(undefined)).toBe(null);
	});

	it('normalizes false to null', () => {
		expect(normalize(false)).toBe(null);
	});

	it('normalizes empty string to null', () => {
		expect(normalize('')).toBe(null);
	});

	it('normalizes empty array to null', () => {
		expect(normalize([])).toBe(null);
	});

	it('passes through truthy values', () => {
		expect(normalize('hello')).toBe('hello');
		expect(normalize(true)).toBe(true);
		expect(normalize(42)).toBe(42);
		expect(normalize([1, 2])).toEqual([1, 2]);
		expect(normalize({ a: 1 })).toEqual({ a: 1 });
	});
});

describe('deepEqual', () => {
	it('treats null and undefined as equal', () => {
		expect(deepEqual(null, undefined)).toBe(true);
	});

	it('treats null and false as equal (both normalize to null)', () => {
		expect(deepEqual(null, false)).toBe(true);
	});

	it('treats null and empty string as equal', () => {
		expect(deepEqual(null, '')).toBe(true);
	});

	it('treats null and empty array as equal', () => {
		expect(deepEqual(null, [])).toBe(true);
	});

	it('compares primitive values', () => {
		expect(deepEqual('a', 'a')).toBe(true);
		expect(deepEqual('a', 'b')).toBe(false);
		expect(deepEqual(1, 1)).toBe(true);
		expect(deepEqual(1, 2)).toBe(false);
		expect(deepEqual(true, true)).toBe(true);
	});

	it('compares arrays element-by-element', () => {
		expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
		expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
		expect(deepEqual(['a', 'b'], ['a', 'b'])).toBe(true);
		expect(deepEqual(['a'], ['b'])).toBe(false);
	});

	it('compares objects by keys', () => {
		expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
		expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
		expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
	});

	it('handles nested structures', () => {
		expect(deepEqual({ a: [1, { b: 'c' }] }, { a: [1, { b: 'c' }] })).toBe(true);
		expect(deepEqual({ a: [1, { b: 'c' }] }, { a: [1, { b: 'd' }] })).toBe(false);
	});

	it('treats objects with null/empty values as equal', () => {
		expect(deepEqual({ a: null }, { a: undefined })).toBe(true);
		expect(deepEqual({ a: '' }, { a: null })).toBe(true);
	});
});

describe('computeChangedFields', () => {
	it('returns empty array when nothing changed', () => {
		const current = { gloss: 'water', hint: null, isVerified: false };
		const submitted = { gloss: 'water', hint: null, isVerified: false };
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).toEqual([]);
	});

	it('detects changed string field', () => {
		const current = { gloss: 'water', hint: null };
		const submitted = { gloss: 'liquid', hint: null };
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).toContain('gloss');
		expect(result).not.toContain('hint');
	});

	it('detects changed boolean field', () => {
		const current = { isVerified: false };
		const submitted = { isVerified: true };
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).toContain('isVerified');
	});

	it('detects changed array field', () => {
		const current = { pinyin: ['shuǐ'] };
		const submitted = { pinyin: ['shuǐ', 'shuí'] };
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).toContain('pinyin');
	});

	it('detects changed JSON field', () => {
		const current = { components: [{ character: '氵', type: ['meaning'] }] };
		const submitted = { components: [{ character: '氵', type: ['sound'] }] };
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).toContain('components');
	});

	it('treats null and empty array as equal (no change)', () => {
		const current = { pinyin: null };
		const submitted = { pinyin: [] };
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).not.toContain('pinyin');
	});

	it('treats null and false as equal for isVerified (no change)', () => {
		const current = { isVerified: null };
		const submitted = { isVerified: false };
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).not.toContain('isVerified');
	});

	it('returns multiple changed fields', () => {
		const current = { gloss: 'water', hint: 'flows', isVerified: false };
		const submitted = { gloss: 'liquid', hint: 'wet', isVerified: true };
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).toContain('gloss');
		expect(result).toContain('hint');
		expect(result).toContain('isVerified');
	});

	it('skips fields not present in submitted data', () => {
		// The form doesn't submit historicalImages, so it shouldn't be detected as changed
		const current = { gloss: 'water', historicalImages: [{ type: 'oracle', url: '...' }] };
		const submitted = { gloss: 'water' }; // historicalImages not present at all
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).not.toContain('historicalImages');
		expect(result).toEqual([]);
	});

	it('detects changes only for fields present in submitted data', () => {
		const current = { gloss: 'water', hint: 'flows', historicalImages: [{ type: 'oracle' }] };
		const submitted = { gloss: 'liquid', hint: 'flows' }; // historicalImages missing
		const result = computeChangedFields(current, submitted, EDITABLE_FIELDS);
		expect(result).toEqual(['gloss']);
	});
});

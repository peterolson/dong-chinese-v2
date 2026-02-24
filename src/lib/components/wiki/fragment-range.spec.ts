import { describe, expect, it } from 'vitest';
import { formatFragmentRange, parseFragmentRange } from './fragment-range';

describe('formatFragmentRange', () => {
	it('returns empty string for empty array', () => {
		expect(formatFragmentRange([])).toBe('');
	});

	it('returns empty string for null/undefined', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(formatFragmentRange(null as any)).toBe('');
	});

	it('formats a single index (0-indexed → 1-indexed)', () => {
		expect(formatFragmentRange([0])).toBe('1');
		expect(formatFragmentRange([4])).toBe('5');
	});

	it('formats consecutive indices as a range', () => {
		expect(formatFragmentRange([0, 1, 2])).toBe('1-3');
	});

	it('formats non-consecutive indices as comma-separated', () => {
		expect(formatFragmentRange([0, 3, 5])).toBe('1,4,6');
	});

	it('formats mixed consecutive and non-consecutive', () => {
		expect(formatFragmentRange([0, 1, 2, 5])).toBe('1-3,6');
	});

	it('deduplicates indices', () => {
		expect(formatFragmentRange([0, 0, 1, 1, 2])).toBe('1-3');
	});

	it('sorts unordered input', () => {
		expect(formatFragmentRange([5, 0, 2, 1])).toBe('1-3,6');
	});

	it('handles multiple separate ranges', () => {
		expect(formatFragmentRange([0, 1, 3, 4, 6])).toBe('1-2,4-5,7');
	});
});

describe('parseFragmentRange', () => {
	it('returns empty array for empty string', () => {
		expect(parseFragmentRange('', 10)).toEqual([]);
	});

	it('returns empty array for whitespace-only', () => {
		expect(parseFragmentRange('   ', 10)).toEqual([]);
	});

	it('parses single number (1-indexed → 0-indexed)', () => {
		expect(parseFragmentRange('3', 10)).toEqual([2]);
	});

	it('parses closed range', () => {
		expect(parseFragmentRange('1-3', 10)).toEqual([0, 1, 2]);
	});

	it('parses open-ended range', () => {
		expect(parseFragmentRange('8-', 10)).toEqual([7, 8, 9]);
	});

	it('parses mixed tokens', () => {
		expect(parseFragmentRange('1-3,6', 10)).toEqual([0, 1, 2, 5]);
	});

	it('parses complex mixed tokens', () => {
		expect(parseFragmentRange('1,3-5,8-', 10)).toEqual([0, 2, 3, 4, 7, 8, 9]);
	});

	it('clamps to strokeCount', () => {
		expect(parseFragmentRange('8-15', 10)).toEqual([7, 8, 9]);
	});

	it('clamps to minimum of 1', () => {
		expect(parseFragmentRange('0', 10)).toEqual([]);
	});

	it('ignores NaN tokens', () => {
		expect(parseFragmentRange('abc,2', 10)).toEqual([1]);
	});

	it('ignores out-of-range numbers', () => {
		expect(parseFragmentRange('11', 10)).toEqual([]);
	});

	it('handles reversed range bounds', () => {
		expect(parseFragmentRange('5-3', 10)).toEqual([2, 3, 4]);
	});

	it('deduplicates overlapping ranges', () => {
		expect(parseFragmentRange('1-3,2-4', 10)).toEqual([0, 1, 2, 3]);
	});

	it('handles whitespace in tokens', () => {
		expect(parseFragmentRange(' 1 - 3 , 6 ', 10)).toEqual([0, 1, 2, 5]);
	});
});

describe('round-trip', () => {
	it('format → parse → format produces the same result', () => {
		const indices = [0, 1, 2, 5, 7, 8];
		const formatted = formatFragmentRange(indices);
		const parsed = parseFragmentRange(formatted, 10);
		expect(formatFragmentRange(parsed)).toBe(formatted);
	});

	it('parse → format → parse produces the same result', () => {
		const range = '1-3,6,8-10';
		const parsed = parseFragmentRange(range, 10);
		const formatted = formatFragmentRange(parsed);
		expect(parseFragmentRange(formatted, 10)).toEqual(parsed);
	});
});

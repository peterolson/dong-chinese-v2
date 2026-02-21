import { describe, expect, it } from 'vitest';

/**
 * Test the ordinal suffix logic used by CharacterFrequency.
 * The function is internal to the component, so we re-implement the logic here
 * to verify edge cases (11th, 12th, 13th, 21st, 22nd, 23rd, 111th, etc.)
 */
function ordinal(n: number): string {
	const mod100 = n % 100;
	if (mod100 >= 11 && mod100 <= 13) return 'th';
	switch (n % 10) {
		case 1:
			return 'st';
		case 2:
			return 'nd';
		case 3:
			return 'rd';
		default:
			return 'th';
	}
}

function formatPerMillion(n: number | null): string {
	if (n == null) return '—';
	if (n >= 100) return n.toFixed(1);
	if (n >= 10) return n.toFixed(1);
	if (n >= 1) return n.toFixed(2);
	return n.toFixed(3);
}

describe('ordinal', () => {
	it('returns st for 1, 21, 31', () => {
		expect(ordinal(1)).toBe('st');
		expect(ordinal(21)).toBe('st');
		expect(ordinal(31)).toBe('st');
		expect(ordinal(101)).toBe('st');
	});

	it('returns nd for 2, 22, 32', () => {
		expect(ordinal(2)).toBe('nd');
		expect(ordinal(22)).toBe('nd');
		expect(ordinal(32)).toBe('nd');
		expect(ordinal(102)).toBe('nd');
	});

	it('returns rd for 3, 23, 33', () => {
		expect(ordinal(3)).toBe('rd');
		expect(ordinal(23)).toBe('rd');
		expect(ordinal(33)).toBe('rd');
		expect(ordinal(103)).toBe('rd');
	});

	it('returns th for 11, 12, 13 (special cases)', () => {
		expect(ordinal(11)).toBe('th');
		expect(ordinal(12)).toBe('th');
		expect(ordinal(13)).toBe('th');
	});

	it('returns th for 111, 112, 113', () => {
		expect(ordinal(111)).toBe('th');
		expect(ordinal(112)).toBe('th');
		expect(ordinal(113)).toBe('th');
	});

	it('returns th for 0, 4-10', () => {
		expect(ordinal(0)).toBe('th');
		expect(ordinal(4)).toBe('th');
		expect(ordinal(5)).toBe('th');
		expect(ordinal(10)).toBe('th');
	});
});

describe('formatPerMillion', () => {
	it('returns — for null', () => {
		expect(formatPerMillion(null)).toBe('—');
	});

	it('formats >= 100 with 1 decimal', () => {
		expect(formatPerMillion(839.68)).toBe('839.7');
		expect(formatPerMillion(15830.93)).toBe('15830.9');
		expect(formatPerMillion(100)).toBe('100.0');
	});

	it('formats 10-99 with 1 decimal', () => {
		expect(formatPerMillion(10)).toBe('10.0');
		expect(formatPerMillion(50.5)).toBe('50.5');
		expect(formatPerMillion(99.99)).toBe('100.0');
	});

	it('formats 1-9 with 2 decimals', () => {
		expect(formatPerMillion(1)).toBe('1.00');
		expect(formatPerMillion(5.123)).toBe('5.12');
		expect(formatPerMillion(9.999)).toBe('10.00');
	});

	it('formats < 1 with 3 decimals', () => {
		expect(formatPerMillion(0.523)).toBe('0.523');
		expect(formatPerMillion(0.087)).toBe('0.087');
		expect(formatPerMillion(0.001)).toBe('0.001');
	});
});

import { describe, expect, it } from 'vitest';
import {
	getComponentColor,
	getAdjustedComponentColor,
	getComponentTitle,
	componentTitles
} from './component-colors';

describe('getComponentColor', () => {
	it('returns the correct CSS variable for known types', () => {
		expect(getComponentColor('meaning')).toBe('var(--comp-meaning)');
		expect(getComponentColor('sound')).toBe('var(--comp-sound)');
		expect(getComponentColor('iconic')).toBe('var(--comp-iconic)');
		expect(getComponentColor('simplified')).toBe('var(--comp-simplified)');
		expect(getComponentColor('unknown')).toBe('var(--comp-unknown)');
		expect(getComponentColor('remnant')).toBe('var(--comp-remnant)');
		expect(getComponentColor('distinguishing')).toBe('var(--comp-distinguishing)');
		expect(getComponentColor('deleted')).toBe('var(--comp-deleted)');
	});

	it('returns unknown color for undefined type', () => {
		expect(getComponentColor(undefined)).toBe('var(--comp-unknown)');
	});

	it('returns unknown color for unrecognized type', () => {
		expect(getComponentColor('nonexistent')).toBe('var(--comp-unknown)');
	});
});

describe('getAdjustedComponentColor', () => {
	it('returns base color when sameTypeIndex is 0', () => {
		expect(getAdjustedComponentColor('meaning', 0)).toBe('var(--comp-meaning)');
	});

	it('returns base color for deleted type regardless of index', () => {
		expect(getAdjustedComponentColor('deleted', 0)).toBe('var(--comp-deleted)');
		expect(getAdjustedComponentColor('deleted', 3)).toBe('var(--comp-deleted)');
	});

	it('returns OKLCH adjustment for index > 0', () => {
		const result = getAdjustedComponentColor('meaning', 1);
		expect(result).toContain('oklch(');
		expect(result).toContain('var(--comp-meaning)');
		expect(result).toContain('calc(l - 0.05)');
		expect(result).toContain('calc(h + 6)');
	});

	it('increases offset proportionally', () => {
		const result2 = getAdjustedComponentColor('sound', 2);
		expect(result2).toContain('calc(l - 0.1)');
		expect(result2).toContain('calc(h + 12)');

		const result3 = getAdjustedComponentColor('sound', 3);
		expect(result3).toContain('calc(l - 0.15');
		expect(result3).toContain('calc(h + 18)');
	});

	it('handles undefined type as unknown with offset', () => {
		const result = getAdjustedComponentColor(undefined, 1);
		expect(result).toContain('var(--comp-unknown)');
		expect(result).toContain('oklch(');
	});
});

describe('getComponentTitle', () => {
	it('returns human-readable title for known types', () => {
		expect(getComponentTitle('meaning')).toBe('Meaning');
		expect(getComponentTitle('sound')).toBe('Sound');
		expect(getComponentTitle('iconic')).toBe('Iconic');
		expect(getComponentTitle('unknown')).toBe('Unknown');
		expect(getComponentTitle('simplified')).toBe('Simplified');
		expect(getComponentTitle('deleted')).toBe('Deleted');
		expect(getComponentTitle('remnant')).toBe('Remnant');
		expect(getComponentTitle('distinguishing')).toBe('Distinguishing');
	});

	it('returns the raw type string for unrecognized types', () => {
		expect(getComponentTitle('other')).toBe('other');
		expect(getComponentTitle('custom')).toBe('custom');
	});
});

describe('componentTitles', () => {
	it('has all 8 component types', () => {
		expect(Object.keys(componentTitles)).toHaveLength(8);
	});
});

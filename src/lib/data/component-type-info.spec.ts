import { describe, expect, it } from 'vitest';
import { colorNames, typeInfo, exampleChars, validTypes } from './component-type-info';

describe('colorNames', () => {
	it('maps all 8 component types to color names', () => {
		expect(Object.keys(colorNames)).toHaveLength(8);
		expect(colorNames.meaning).toBe('red');
		expect(colorNames.sound).toBe('blue');
		expect(colorNames.iconic).toBe('green');
		expect(colorNames.simplified).toBe('teal');
		expect(colorNames.unknown).toBe('gray');
		expect(colorNames.remnant).toBe('orange');
		expect(colorNames.distinguishing).toBe('purple');
		expect(colorNames.deleted).toBe('light gray');
	});
});

describe('typeInfo', () => {
	it('has entries for all 8 types', () => {
		const types = [
			'meaning',
			'sound',
			'iconic',
			'unknown',
			'simplified',
			'deleted',
			'remnant',
			'distinguishing'
		];
		for (const t of types) {
			expect(typeInfo[t], `typeInfo should have "${t}"`).toBeDefined();
		}
	});

	it('each entry has required fields', () => {
		for (const [key, info] of Object.entries(typeInfo)) {
			expect(info.leftHead, `${key} leftHead`).toBeTruthy();
			expect(info.rightHead, `${key} rightHead`).toBeTruthy();
			expect(typeof info.leftMono, `${key} leftMono`).toBe('boolean');
			expect(typeof info.rightMono, `${key} rightMono`).toBe('boolean');
			expect(typeof info.leftSpeak, `${key} leftSpeak`).toBe('boolean');
			expect(typeof info.rightSpeak, `${key} rightSpeak`).toBe('boolean');
			expect(Array.isArray(info.pairs), `${key} pairs`).toBe(true);
		}
	});

	it('pairs have valid structure', () => {
		for (const [key, info] of Object.entries(typeInfo)) {
			for (const pair of info.pairs) {
				expect(pair.l.length, `${key} pair l`).toBeGreaterThanOrEqual(1);
				expect(pair.r.length, `${key} pair r`).toBeGreaterThanOrEqual(1);
				expect(pair.lp, `${key} pair lp`).toBeTruthy();
				expect(pair.rp, `${key} pair rp`).toBeTruthy();
				expect(pair.lg, `${key} pair lg`).toBeTruthy();
				expect(pair.rg, `${key} pair rg`).toBeTruthy();
			}
		}
	});

	it('unknown type has no pairs', () => {
		expect(typeInfo.unknown.pairs).toHaveLength(0);
	});
});

describe('exampleChars', () => {
	it('has all 8 types', () => {
		expect(Object.keys(exampleChars)).toHaveLength(8);
	});

	it('each type has at least one example character', () => {
		for (const [key, chars] of Object.entries(exampleChars)) {
			expect(chars.length, `${key} should have example chars`).toBeGreaterThan(0);
		}
	});
});

describe('validTypes', () => {
	it('is a Set of all 8 types', () => {
		expect(validTypes.size).toBe(8);
		expect(validTypes.has('meaning')).toBe(true);
		expect(validTypes.has('sound')).toBe(true);
		expect(validTypes.has('iconic')).toBe(true);
		expect(validTypes.has('unknown')).toBe(true);
		expect(validTypes.has('simplified')).toBe(true);
		expect(validTypes.has('deleted')).toBe(true);
		expect(validTypes.has('remnant')).toBe(true);
		expect(validTypes.has('distinguishing')).toBe(true);
	});

	it('does not contain invalid types', () => {
		expect(validTypes.has('nonexistent')).toBe(false);
	});

	it('matches the keys of exampleChars', () => {
		expect(validTypes).toEqual(new Set(Object.keys(exampleChars)));
	});
});

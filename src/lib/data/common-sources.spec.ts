import { describe, expect, it } from 'vitest';
import { commonSources } from './common-sources';

describe('commonSources', () => {
	it('has 6 entries', () => {
		expect(commonSources).toHaveLength(6);
	});

	it('every entry has a non-empty name', () => {
		for (const source of commonSources) {
			expect(source.name).toBeTruthy();
			expect(typeof source.name).toBe('string');
		}
	});

	it('every entry has urlTemplate as string or null', () => {
		for (const source of commonSources) {
			expect(source.urlTemplate === null || typeof source.urlTemplate === 'string').toBe(true);
		}
	});

	it('URL sources have {char} placeholder', () => {
		const urlSources = commonSources.filter((s) => s.urlTemplate !== null);
		expect(urlSources.length).toBeGreaterThan(0);
		for (const source of urlSources) {
			expect(source.urlTemplate).toContain('{char}');
		}
	});

	it('book sources have null urlTemplate', () => {
		const bookSources = commonSources.filter((s) => s.urlTemplate === null);
		expect(bookSources.length).toBeGreaterThan(0);
	});

	it('URL template substitution works', () => {
		const ziTools = commonSources.find((s) => s.name === 'zi.tools');
		expect(ziTools).toBeDefined();
		const url = ziTools!.urlTemplate!.replace('{char}', '人');
		expect(url).toBe('https://zi.tools/zi/人');
	});
});

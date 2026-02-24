import { describe, expect, it } from 'vitest';
import { convertPinyin, formatPinyinList } from './index';

describe('convertPinyin', () => {
	it('returns pinyin unchanged for "pinyin" script', () => {
		expect(convertPinyin('nǐ', 'pinyin')).toBe('nǐ');
	});

	it('converts to zhuyin', () => {
		expect(convertPinyin('mā', 'zhuyin')).toBe('ㄇㄚ');
	});

	it('converts to wade-giles', () => {
		const result = convertPinyin('mā', 'wadegiles');
		expect(result).toContain('m');
		expect(result).toContain('a');
	});

	it('converts to gwoyeu', () => {
		const result = convertPinyin('mā', 'gwoyeu');
		expect(result).toBe('ma');
	});

	it('converts to cyrillic', () => {
		const result = convertPinyin('mā', 'cyrillic');
		expect(result).toContain('м');
	});
});

describe('formatPinyinList', () => {
	it('returns empty string for null', () => {
		expect(formatPinyinList(null, 'pinyin')).toBe('');
	});

	it('returns empty string for undefined', () => {
		expect(formatPinyinList(undefined, 'pinyin')).toBe('');
	});

	it('returns empty string for empty array', () => {
		expect(formatPinyinList([], 'pinyin')).toBe('');
	});

	it('joins pinyin readings with commas for pinyin script', () => {
		expect(formatPinyinList(['nǐ', 'hǎo'], 'pinyin')).toBe('nǐ, hǎo');
	});

	it('converts and joins for non-pinyin script', () => {
		const result = formatPinyinList(['mā', 'mà'], 'zhuyin');
		expect(result).toContain('ㄇㄚ');
	});

	it('defaults to pinyin when script is null', () => {
		expect(formatPinyinList(['nǐ'], null)).toBe('nǐ');
	});

	it('defaults to pinyin when script is undefined', () => {
		expect(formatPinyinList(['nǐ'], undefined)).toBe('nǐ');
	});

	it('handles single reading', () => {
		expect(formatPinyinList(['hǎo'], 'pinyin')).toBe('hǎo');
	});
});

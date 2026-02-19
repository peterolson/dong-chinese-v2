import { describe, expect, it } from 'vitest';
import { convertToneToNumber, isTonedPinyin } from './pinyin';

describe('isTonedPinyin', () => {
	it('returns true for toned syllables', () => {
		expect(isTonedPinyin('nǐ')).toBe(true);
		expect(isTonedPinyin('mā')).toBe(true);
		expect(isTonedPinyin('lǜ')).toBe(true);
		expect(isTonedPinyin('hǎo')).toBe(true);
	});

	it('returns false for untoned syllables', () => {
		expect(isTonedPinyin('ma')).toBe(false);
		expect(isTonedPinyin('ni')).toBe(false);
	});

	it('returns false for numbered pinyin', () => {
		expect(isTonedPinyin('ni3')).toBe(false);
	});

	it('returns false for Chinese characters', () => {
		expect(isTonedPinyin('你')).toBe(false);
	});

	it('returns false for empty string', () => {
		expect(isTonedPinyin('')).toBe(false);
	});

	it('returns false for multi-word strings', () => {
		expect(isTonedPinyin('nǐ hǎo')).toBe(false);
	});
});

describe('convertToneToNumber', () => {
	it('converts tone 1', () => {
		expect(convertToneToNumber('mā')).toBe('ma1');
	});

	it('converts tone 2', () => {
		expect(convertToneToNumber('má')).toBe('ma2');
	});

	it('converts tone 3', () => {
		expect(convertToneToNumber('nǐ')).toBe('ni3');
	});

	it('converts tone 4', () => {
		expect(convertToneToNumber('mà')).toBe('ma4');
	});

	it('assigns neutral tone (5) for unmarked syllables', () => {
		expect(convertToneToNumber('ma')).toBe('ma5');
	});

	it('replaces ü with v', () => {
		expect(convertToneToNumber('lǜ')).toBe('lv4');
		expect(convertToneToNumber('nǚ')).toBe('nv3');
	});

	it('replaces ü with v for ü vowel variants', () => {
		expect(convertToneToNumber('lǖ')).toBe('lv1');
		expect(convertToneToNumber('lǘ')).toBe('lv2');
		expect(convertToneToNumber('lǚ')).toBe('lv3');
		expect(convertToneToNumber('lǜ')).toBe('lv4');
	});

	it('passes through already-numbered pinyin', () => {
		expect(convertToneToNumber('ni3')).toBe('ni3');
		expect(convertToneToNumber('ma1')).toBe('ma1');
		expect(convertToneToNumber('ma5')).toBe('ma5');
	});

	it('replaces ü with v in numbered pinyin passthrough', () => {
		expect(convertToneToNumber('lü4')).toBe('lv4');
	});

	it('handles multi-character syllables', () => {
		expect(convertToneToNumber('zhuāng')).toBe('zhuang1');
		expect(convertToneToNumber('shuǎng')).toBe('shuang3');
		expect(convertToneToNumber('chuáng')).toBe('chuang2');
	});

	it('handles all vowel tones', () => {
		expect(convertToneToNumber('ā')).toBe('a1');
		expect(convertToneToNumber('é')).toBe('e2');
		expect(convertToneToNumber('ǐ')).toBe('i3');
		expect(convertToneToNumber('ò')).toBe('o4');
		expect(convertToneToNumber('ū')).toBe('u1');
	});

	it('trims whitespace', () => {
		expect(convertToneToNumber(' nǐ ')).toBe('ni3');
	});

	it('lowercases input', () => {
		expect(convertToneToNumber('NǏ')).toBe('ni3');
	});
});

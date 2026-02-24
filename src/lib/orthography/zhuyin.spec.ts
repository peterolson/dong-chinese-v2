import { describe, expect, it } from 'vitest';
import { pinyinToZhuyin } from './zhuyin';

describe('pinyinToZhuyin', () => {
	it('returns empty string for empty input', () => {
		expect(pinyinToZhuyin('')).toBe('');
	});

	it('converts first tone (no tone symbol for tone 1)', () => {
		expect(pinyinToZhuyin('mā')).toBe('ㄇㄚ');
	});

	it('converts second tone', () => {
		expect(pinyinToZhuyin('má')).toBe('ㄇㄚˊ');
	});

	it('converts third tone', () => {
		expect(pinyinToZhuyin('mǎ')).toBe('ㄇㄚˇ');
	});

	it('converts fourth tone', () => {
		expect(pinyinToZhuyin('mà')).toBe('ㄇㄚˋ');
	});

	it('converts neutral tone (light dot)', () => {
		expect(pinyinToZhuyin('ma')).toBe('ㄇㄚ˙');
	});

	it('converts initial+final syllables', () => {
		expect(pinyinToZhuyin('hǎo')).toBe('ㄏㄠˇ');
		expect(pinyinToZhuyin('zhōng')).toBe('ㄓㄨㄥ');
	});

	it('converts individual syllables', () => {
		expect(pinyinToZhuyin('yī')).toBe('ㄧ');
		expect(pinyinToZhuyin('wǔ')).toBe('ㄨˇ');
	});

	it('replaces ㄐㄨ → ㄐㄩ, ㄑㄨ → ㄑㄩ, ㄒㄨ → ㄒㄩ', () => {
		expect(pinyinToZhuyin('jǔ')).toContain('ㄐㄩ');
		expect(pinyinToZhuyin('qù')).toContain('ㄑㄩ');
		expect(pinyinToZhuyin('xū')).toContain('ㄒㄩ');
	});

	it('removes ㄧ from zhi/chi/shi/ri/zi/ci/si', () => {
		expect(pinyinToZhuyin('zhī')).toBe('ㄓ');
		expect(pinyinToZhuyin('chī')).toBe('ㄔ');
		expect(pinyinToZhuyin('shī')).toBe('ㄕ');
		expect(pinyinToZhuyin('rì')).toBe('ㄖˋ');
		expect(pinyinToZhuyin('zī')).toBe('ㄗ');
		expect(pinyinToZhuyin('cí')).toBe('ㄘˊ');
		expect(pinyinToZhuyin('sī')).toBe('ㄙ');
	});

	it('converts common words', () => {
		// nǐ hǎo — space becomes "other" token
		const result = pinyinToZhuyin('nǐ');
		expect(result).toBe('ㄋㄧˇ');
	});
});

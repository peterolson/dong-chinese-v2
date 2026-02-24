import { describe, expect, it } from 'vitest';
import { pinyinToGwoyeu } from './gwoyeu';

describe('pinyinToGwoyeu', () => {
	it('converts first tone (base form)', () => {
		expect(pinyinToGwoyeu('mā')).toBe('ma');
	});

	it('converts second tone (r-suffixed for a)', () => {
		expect(pinyinToGwoyeu('má')).toBe('mar');
	});

	it('converts third tone (doubled vowel for a)', () => {
		expect(pinyinToGwoyeu('mǎ')).toBe('maa');
	});

	it('converts fourth tone (h-suffixed for a)', () => {
		expect(pinyinToGwoyeu('mà')).toBe('mah');
	});

	it('uses prefix for neutral tone', () => {
		const result = pinyinToGwoyeu('ma');
		expect(result).toBe('\u02CCma');
	});

	it('converts zh+i, sh+i (matched as initial+final)', () => {
		// Tokenizer matches zh+i as initial+final, not individual "zhi"
		// zh→j, i tone1→[0]='i', so zhī → ji
		expect(pinyinToGwoyeu('zhī')).toBe('ji');
		// sh→sh, i tone4→[3]='ih', so shì → shih
		expect(pinyinToGwoyeu('shì')).toBe('shih');
	});

	it('converts yi-class syllables', () => {
		expect(pinyinToGwoyeu('yī')).toBe('i');
		expect(pinyinToGwoyeu('yí')).toBe('yi');
	});

	it('converts wu-class syllables', () => {
		expect(pinyinToGwoyeu('wǔ')).toBe('wuu');
	});

	it('converts initial+final combinations', () => {
		expect(pinyinToGwoyeu('nǐ')).toBe('nii');
		expect(pinyinToGwoyeu('hǎo')).toBe('hao');
	});
});

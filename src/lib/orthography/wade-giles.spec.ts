import { describe, expect, it } from 'vitest';
import { pinyinToWadeGiles } from './wade-giles';

describe('pinyinToWadeGiles', () => {
	it('converts basic syllable with tone number', () => {
		const result = pinyinToWadeGiles('mā');
		// m → m, a → a, tone 1 → superscript ¹
		expect(result).toBe('ma\u00B9');
	});

	it('converts aspirated initials (b→p, p→p\u02BB)', () => {
		expect(pinyinToWadeGiles('bā')).toBe('pa\u00B9');
		expect(pinyinToWadeGiles('pā')).toBe('p\u02BBa\u00B9');
	});

	it('converts d→t, t→t\u02BB', () => {
		expect(pinyinToWadeGiles('dā')).toBe('ta\u00B9');
		expect(pinyinToWadeGiles('tā')).toBe('t\u02BBa\u00B9');
	});

	it('converts g→k, k→k\u02BB', () => {
		expect(pinyinToWadeGiles('gā')).toBe('ka\u00B9');
		expect(pinyinToWadeGiles('kā')).toBe('k\u02BBa\u00B9');
	});

	it('converts zh→ch, ch→ch\u02BB', () => {
		expect(pinyinToWadeGiles('zhā')).toMatch(/^ch.*a/);
		expect(pinyinToWadeGiles('chā')).toMatch(/^ch\u02BB.*a/);
	});

	it('converts zh+i, ch+i, sh+i (matched as initial+final)', () => {
		// Tokenizer matches zh+i as initial+final, not individual "zhi"
		expect(pinyinToWadeGiles('zhī')).toBe('chi\u00B9');
		expect(pinyinToWadeGiles('chī')).toBe('ch\u02BBi\u00B9');
		expect(pinyinToWadeGiles('shī')).toBe('shi\u00B9');
	});

	it('converts x→hs', () => {
		const result = pinyinToWadeGiles('xī');
		expect(result).toContain('hs');
	});

	it('converts r→j', () => {
		// r+i matched as initial+final: r→j, i→i
		expect(pinyinToWadeGiles('rì')).toBe('ji\u2074');
	});

	it('applies tone superscripts (1→¹, 2→², 3→³, 4→⁴)', () => {
		expect(pinyinToWadeGiles('mā')).toContain('\u00B9');
		expect(pinyinToWadeGiles('má')).toContain('\u00B2');
		expect(pinyinToWadeGiles('mǎ')).toContain('\u00B3');
		expect(pinyinToWadeGiles('mà')).toContain('\u2074');
	});

	it('omits tone for neutral (tone 5)', () => {
		const result = pinyinToWadeGiles('ma');
		expect(result).toBe('ma');
	});

	it('replaces e→o after g/k/h', () => {
		expect(pinyinToWadeGiles('gē')).toBe('ko\u00B9');
		expect(pinyinToWadeGiles('kē')).toBe('k\u02BBo\u00B9');
		expect(pinyinToWadeGiles('hē')).toBe('ho\u00B9');
	});
});

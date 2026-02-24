import { describe, expect, it } from 'vitest';
import { tokenizePinyin } from './tokenize';

describe('tokenizePinyin', () => {
	it('returns empty array for empty string', () => {
		expect(tokenizePinyin('')).toEqual([]);
	});

	it('returns empty array for null/undefined', () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect(tokenizePinyin(null as any)).toEqual([]);
	});

	it('tokenizes a single syllable with tone mark', () => {
		const tokens = tokenizePinyin('nǐ');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].type).toBe('pinyin');
		expect(tokens[0].init).toBe('n');
		expect(tokens[0].final).toBe('i');
		expect(tokens[0].tone).toBe(3);
	});

	it('tokenizes a syllable with first tone', () => {
		const tokens = tokenizePinyin('mā');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].tone).toBe(1);
	});

	it('tokenizes a syllable with second tone', () => {
		const tokens = tokenizePinyin('má');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].tone).toBe(2);
	});

	it('tokenizes a syllable with fourth tone', () => {
		const tokens = tokenizePinyin('mà');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].tone).toBe(4);
	});

	it('defaults to tone 5 (neutral) when no tone mark', () => {
		const tokens = tokenizePinyin('ma');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].tone).toBe(5);
	});

	it('tokenizes numbered tones', () => {
		const tokens = tokenizePinyin('ma3');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].tone).toBe(3);
	});

	it('tokenizes multi-character initials (zh, ch, sh)', () => {
		const zh = tokenizePinyin('zhōng');
		expect(zh).toHaveLength(1);
		expect(zh[0].init).toBe('zh');
		expect(zh[0].final).toBe('ong');

		const ch = tokenizePinyin('chī');
		expect(ch).toHaveLength(1);
		expect(ch[0].init).toBe('ch');

		const sh = tokenizePinyin('shān');
		expect(sh).toHaveLength(1);
		expect(sh[0].init).toBe('sh');
	});

	it('tokenizes zhi/chi/shi as initial+final (zh+i)', () => {
		// The tokenizer matches initial+final before checking individuals,
		// so zhī is parsed as init=zh, final=i (not indiv=zhi)
		const zhi = tokenizePinyin('zhī');
		expect(zhi).toHaveLength(1);
		expect(zhi[0].type).toBe('pinyin');
		expect(zhi[0].init).toBe('zh');
		expect(zhi[0].final).toBe('i');
	});

	it('tokenizes standalone vowel syllables (yi, wu, yu, etc.)', () => {
		const yi = tokenizePinyin('yī');
		expect(yi).toHaveLength(1);
		expect(yi[0].type).toBe('pinyin');
		expect(yi[0].indiv).toBe('yi');

		const wu = tokenizePinyin('wǔ');
		expect(wu).toHaveLength(1);
		expect(wu[0].indiv).toBe('wu');
	});

	it('tokenizes non-pinyin characters as "other"', () => {
		const tokens = tokenizePinyin('!');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].type).toBe('other');
	});

	it('tokenizes mixed pinyin and non-pinyin', () => {
		const tokens = tokenizePinyin('nǐ hǎo');
		expect(tokens.length).toBeGreaterThanOrEqual(3); // nǐ, space, hǎo
		const pinyinTokens = tokens.filter((t) => t.type === 'pinyin');
		expect(pinyinTokens).toHaveLength(2);
	});

	it('generates zhuyin for initial+final tokens', () => {
		const tokens = tokenizePinyin('hǎo');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].zhuyin).toBe('ㄏㄠ');
	});

	it('generates zhuyin for individual tokens', () => {
		const tokens = tokenizePinyin('yī');
		expect(tokens).toHaveLength(1);
		expect(tokens[0].zhuyin).toBe('ㄧ');
	});
});

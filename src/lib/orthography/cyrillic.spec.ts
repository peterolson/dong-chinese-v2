import { describe, expect, it } from 'vitest';
import { pinyinToCyrillic } from './cyrillic';

describe('pinyinToCyrillic', () => {
	it('converts basic syllable', () => {
		const result = pinyinToCyrillic('mā');
		// m→м, a→а, first tone adds macron on а
		expect(result).toContain('м');
		expect(result).toContain('а');
	});

	it('converts initials to Cyrillic', () => {
		expect(pinyinToCyrillic('bā')).toContain('б');
		expect(pinyinToCyrillic('pā')).toContain('п');
		expect(pinyinToCyrillic('dā')).toContain('д');
		expect(pinyinToCyrillic('gā')).toContain('г');
		expect(pinyinToCyrillic('hā')).toContain('х');
	});

	it('converts zh→чж, ch→ч, sh→ш', () => {
		expect(pinyinToCyrillic('zhā')).toContain('чж');
		expect(pinyinToCyrillic('chā')).toContain('ч');
		expect(pinyinToCyrillic('shā')).toContain('ш');
	});

	it('converts individual syllables', () => {
		expect(pinyinToCyrillic('zhī')).toContain('чжи');
		expect(pinyinToCyrillic('shì')).toContain('ши');
	});

	it('adds tone diacritics for tones 1-4', () => {
		const t1 = pinyinToCyrillic('mā');
		const t2 = pinyinToCyrillic('má');
		const t3 = pinyinToCyrillic('mǎ');
		const t4 = pinyinToCyrillic('mà');
		// All should be different due to diacritics
		expect(new Set([t1, t2, t3, t4]).size).toBe(4);
	});

	it('omits diacritics for neutral tone', () => {
		const result = pinyinToCyrillic('ma');
		expect(result).toBe('ма');
	});

	it('converts finals correctly', () => {
		// ai→ай (with tone diacritic on а)
		const hai = pinyinToCyrillic('hái');
		expect(hai).toContain('х'); // h→х
		expect(hai).toContain('й'); // final contains й

		// ou→оу
		const gou = pinyinToCyrillic('gǒu');
		expect(gou).toContain('г'); // g→г

		// ian→янь
		const tian = pinyinToCyrillic('tiān');
		expect(tian).toContain('т'); // t→т
		expect(tian).toContain('нь'); // -n soft sign
	});

	it('converts w- and y- syllables', () => {
		expect(pinyinToCyrillic('wǒ')).toContain('во');
		expect(pinyinToCyrillic('yě')).toContain('е');
	});
});

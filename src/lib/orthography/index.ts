import { pinyinToZhuyin } from './zhuyin';
import { pinyinToWadeGiles } from './wade-giles';
import { pinyinToGwoyeu } from './gwoyeu';
import { pinyinToCyrillic } from './cyrillic';

export type PhoneticScript = 'pinyin' | 'zhuyin' | 'wadegiles' | 'gwoyeu' | 'cyrillic';

/** Convert a pinyin syllable (tone-marked, e.g. "nǐ") to the target phonetic script. */
export function convertPinyin(syllable: string, script: PhoneticScript): string {
	switch (script) {
		case 'pinyin':
			return syllable;
		case 'zhuyin':
			return pinyinToZhuyin(syllable);
		case 'wadegiles':
			return pinyinToWadeGiles(syllable);
		case 'gwoyeu':
			return pinyinToGwoyeu(syllable);
		case 'cyrillic':
			return pinyinToCyrillic(syllable);
	}
}

/**
 * Convert an array of pinyin readings to the target script and join them.
 * Convenience wrapper for display in components.
 */
export function formatPinyinList(
	readings: string[] | null | undefined,
	script: PhoneticScript | null | undefined
): string {
	if (!readings || readings.length === 0) return '';
	const s = script ?? 'pinyin';
	if (s === 'pinyin') return readings.join(', ');
	return readings.map((r) => convertPinyin(r, s)).join(', ');
}

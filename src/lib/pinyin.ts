const toneMap: Record<string, { base: string; tone: number }> = {
	ā: { base: 'a', tone: 1 },
	á: { base: 'a', tone: 2 },
	ǎ: { base: 'a', tone: 3 },
	à: { base: 'a', tone: 4 },
	ē: { base: 'e', tone: 1 },
	é: { base: 'e', tone: 2 },
	ě: { base: 'e', tone: 3 },
	è: { base: 'e', tone: 4 },
	ī: { base: 'i', tone: 1 },
	í: { base: 'i', tone: 2 },
	ǐ: { base: 'i', tone: 3 },
	ì: { base: 'i', tone: 4 },
	ō: { base: 'o', tone: 1 },
	ó: { base: 'o', tone: 2 },
	ǒ: { base: 'o', tone: 3 },
	ò: { base: 'o', tone: 4 },
	ū: { base: 'u', tone: 1 },
	ú: { base: 'u', tone: 2 },
	ǔ: { base: 'u', tone: 3 },
	ù: { base: 'u', tone: 4 },
	ǖ: { base: 'v', tone: 1 },
	ǘ: { base: 'v', tone: 2 },
	ǚ: { base: 'v', tone: 3 },
	ǜ: { base: 'v', tone: 4 }
};

const tonedVowels = new Set(Object.keys(toneMap));

/** Matches a single pinyin syllable with tone marks (e.g. "nǐ", "lǜ", "ā") */
const pinyinPattern = /^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/i;

/**
 * Detects whether a string is a single pinyin syllable containing a tone mark.
 */
export function isTonedPinyin(text: string): boolean {
	if (!pinyinPattern.test(text)) return false;
	for (const char of text) {
		if (tonedVowels.has(char)) return true;
	}
	return false;
}

/**
 * Convert a tone-marked pinyin string to numbered pinyin.
 * "nǐ" → "ni3", "lǜ" → "lv4", "ma" → "ma5" (neutral tone)
 * If already numbered (e.g. "ni3"), passes through unchanged.
 */
export function convertToneToNumber(pinyin: string): string {
	const input = pinyin.trim().toLowerCase();

	// Already has a tone number at the end — pass through
	if (/[1-5]$/.test(input)) return input.replace(/ü/g, 'v');

	let result = '';
	let tone = 0;

	for (const char of input) {
		const mapped = toneMap[char];
		if (mapped) {
			result += mapped.base;
			tone = mapped.tone;
		} else if (char === 'ü') {
			result += 'v';
		} else {
			result += char;
		}
	}

	// Neutral tone (no tone mark found)
	if (tone === 0) tone = 5;

	return result + tone;
}

import type { CharacterData } from '$lib/types/dictionary';

export interface SourceEntry {
	title: string;
	url: string;
}

export const sourceData: Record<string, SourceEntry> = {
	unicode: {
		title: 'Unicode',
		url: 'https://unicode.org/charts/unihan.html'
	},
	cedict: {
		title: 'CC-CEDICT',
		url: 'https://cc-cedict.org/wiki/'
	},
	animcjk: {
		title: 'AnimCJK',
		url: 'https://github.com/parsimonhi/animCJK'
	},
	makemeahanzi: {
		title: 'Make Me a Hanzi',
		url: 'https://github.com/skishore/makemeahanzi'
	},
	'baxter-sagart': {
		title: 'Baxter-Sagart',
		url: 'http://ocbaxtersagart.lsait.lsa.umich.edu/'
	},
	zhengzhang: {
		title: 'Zhengzhang Shangfang',
		url: 'https://en.wiktionary.org/wiki/Appendix:Chinese_pronunciation'
	},
	shuowen: {
		title: 'Shuowen Jiezi (說文解字)',
		url: 'https://en.wikipedia.org/wiki/Shuowen_Jiezi'
	},
	'jun-da': {
		title: 'MTSU Chinese text computing',
		url: 'https://lingua.mtsu.edu/chinese-computing/'
	},
	'subtlex-ch': {
		title: 'SUBTLEX-CH',
		url: 'https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch/overview.htm'
	},
	'academia-sinica': {
		title: 'Academia Sinica',
		url: 'https://xiaoxue.iis.sinica.edu.tw/'
	},
	allset: {
		title: 'AllSet Learning Chinese Pronunciation Wiki',
		url: 'https://resources.allsetlearning.com/chinese/pronunciation/'
	}
};

export interface SourceGroup {
	label: string;
	keys: string[];
}

/** Detect which data sources contributed to a character entry, grouped by category */
export function detectSources(
	character: CharacterData,
	{ hasCustomSources = false }: { hasCustomSources?: boolean } = {}
): SourceGroup[] {
	const groups: SourceGroup[] = [];

	// Character origin info (only shown when there are custom sources)
	if (hasCustomSources) {
		groups.push({ label: 'Character origin', keys: [] });
	}

	// Readings & variants
	const readings: string[] = [];
	if (
		character.pinyin != null ||
		character.simplifiedVariants != null ||
		character.traditionalVariants != null ||
		character.historicalPronunciations?.some((p) => p.source === 'tang')
	) {
		readings.push('unicode');
	}
	if (readings.length > 0) {
		groups.push({ label: 'Readings & variants', keys: readings });
	}

	// Stroke data
	const strokes: string[] = [];
	if (
		character.strokeDataSimp?.source === 'animcjk' ||
		character.strokeDataTrad?.source === 'animcjk'
	) {
		strokes.push('animcjk');
	}
	if (
		character.strokeDataSimp?.source === 'makemeahanzi' ||
		character.strokeDataTrad?.source === 'makemeahanzi'
	) {
		strokes.push('makemeahanzi');
	}
	if (strokes.length > 0) {
		groups.push({ label: 'Stroke data', keys: strokes });
	}

	// Historical pronunciations
	const historical: string[] = [];
	if (character.historicalPronunciations?.some((p) => p.source === 'baxter-sagart')) {
		historical.push('baxter-sagart');
	}
	if (character.historicalPronunciations?.some((p) => p.source === 'zhengzhang')) {
		historical.push('zhengzhang');
	}
	if (historical.length > 0) {
		groups.push({ label: 'Historical pronunciations', keys: historical });
	}

	// Etymology
	if (character.shuowenExplanation != null) {
		groups.push({ label: 'Etymology', keys: ['shuowen'] });
	}

	// Frequency data
	const frequency: string[] = [];
	if (character.junDaRank != null) {
		frequency.push('jun-da');
	}
	if (character.subtlexRank != null) {
		frequency.push('subtlex-ch');
	}
	if (frequency.length > 0) {
		groups.push({ label: 'Frequency data', keys: frequency });
	}

	return groups;
}

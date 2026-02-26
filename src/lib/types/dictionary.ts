/** A single component in a character's decomposition */
export interface ComponentData {
	character: string;
	type?: string[];
	hint?: string | null;
	isOldPronunciation?: boolean;
	isFromOriginalMeaning?: boolean;
	isGlyphChanged?: boolean;
	// Populated at query time from char_base
	pinyin?: string[] | null;
	gloss?: string | null;
	historicalPronunciations?: HistoricalPronunciation[] | null;
}

/** Stroke order data for one variant (simplified or traditional) */
export interface StrokeVariantData {
	strokes: string[]; // SVG path strings
	medians: number[][][]; // coordinate arrays per stroke
	source: 'animcjk' | 'makemeahanzi' | 'dong';
}

/** A historical script image (oracle, bronze, seal, clerical) */
export interface HistoricalImage {
	type: string; // e.g. "Oracle", "Bronze", "Seal", "Clerical"
	era?: string; // e.g. "Shang dynasty", "Western Zhou"
	url: string;
	source?: string;
}

/** A historical pronunciation entry from one of several sources */
export interface HistoricalPronunciation {
	pinyin?: string;
	middleChinese?: string;
	oldChinese?: string;
	gloss?: string;
	phoneticSeries?: string;
	rhymeGroup?: string;
	notes?: string;
	source: 'baxter-sagart' | 'zhengzhang' | 'tang';
}

/** Pinyin reading with frequency count from Unihan kHanyuPinlu */
export interface PinyinFrequency {
	pinyin: string;
	count: number;
}

/** A character that uses a given component */
export interface ComponentUse {
	character: string;
	isVerified: boolean;
}

/** Component uses grouped by the role the component plays */
export interface ComponentUseGroup {
	type: string;
	characters: ComponentUse[];
	verifiedCount: number;
}

/** Full character data as returned by the dictionary service */
export interface CharacterData {
	character: string;
	codepoint: string | null;

	// Dong Chinese curated
	gloss: string | null;
	hint: string | null;
	originalMeaning: string | null;
	strokeCountSimp: number | null;
	strokeCountTrad: number | null;
	isVerified: boolean | null;
	components: ComponentData[] | null;
	customSources: string[] | null;

	// Variants
	simplifiedVariants: string[] | null;
	traditionalVariants: string[] | null;

	// Jun Da frequency
	junDaRank: number | null;
	junDaFrequency: number | null;
	junDaPerMillion: number | null;

	// SUBTLEX-CH frequency
	subtlexRank: number | null;
	subtlexCount: number | null;
	subtlexPerMillion: number | null;
	subtlexContextDiversity: number | null;

	// Stroke order per variant
	strokeDataSimp: StrokeVariantData | null;
	strokeDataTrad: StrokeVariantData | null;

	// Fragment maps: how components connect to strokes
	fragmentsSimp: number[][] | null;
	fragmentsTrad: number[][] | null;

	// Historical
	historicalImages: HistoricalImage[] | null;
	historicalPronunciations: HistoricalPronunciation[] | null;

	// Shuowen
	shuowenExplanation: string | null;
	shuowenPronunciation: string | null;
	shuowenPinyin: string | null;

	// Pinyin frequencies
	pinyinFrequencies: PinyinFrequency[] | null;

	// Deduplicated pinyin readings from all sources (frequency-ordered)
	pinyin: string[] | null;
}

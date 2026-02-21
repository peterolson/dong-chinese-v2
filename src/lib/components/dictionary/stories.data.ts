import type {
	CharacterData,
	HistoricalPronunciation,
	HistoricalImage
} from '$lib/types/dictionary';

/** Realistic stroke data for 学 (simplified, 8 strokes) */
export const xueStrokesSimp: string[] = [
	'M 443 519 Q 478 527 506 534 Q 546 544 551 549 Q 558 556 554 563 Q 548 572 520 578 Q 497 582 442 562 L 401 550 Q 328 533 242 519 Q 212 514 235 500 Q 252 490 286 497 Q 343 510 396 519 L 443 519 Z',
	'M 411 404 Q 402 454 401 550 L 396 519 Q 327 463 231 406 Q 215 398 228 393 Q 237 389 251 393 Q 318 414 390 453 L 415 384 Q 421 353 413 311 Q 399 255 338 202 Q 311 177 309 170 Q 309 164 320 166 Q 347 168 398 223 Q 440 275 448 347 L 443 519 Q 441 545 442 562 L 411 404 Z',
	'M 448 347 Q 509 350 669 350 Q 691 350 696 359 Q 702 370 685 383 Q 633 422 594 414 Q 534 400 411 404 L 415 384 Q 445 356 448 347 Z',
	'M 275 274 Q 265 268 260 262 Q 252 254 264 256 Q 314 258 370 290 Q 381 297 376 306 Q 371 314 357 314 Q 343 315 275 274 Z',
	'M 629 262 Q 612 290 591 298 Q 583 302 576 296 Q 571 292 577 278 Q 600 225 582 120 Q 578 99 564 86 Q 547 71 501 80 Q 481 85 484 76 Q 487 70 504 59 Q 545 33 562 4 Q 571 -14 583 -10 Q 603 -4 618 22 Q 637 53 636 99 Q 634 172 632 248 C 631 265 631 265 629 262 Z',
	'M 632 248 Q 722 256 808 257 Q 830 258 835 267 Q 841 278 825 291 Q 773 329 748 325 Q 697 313 629 262 L 632 248 Z',
	'M 196 132 Q 188 129 190 115 Q 196 83 218 66 Q 228 56 238 64 Q 248 73 244 107 L 242 127 Q 240 141 264 154 Q 296 172 301 176 Q 308 183 302 190 Q 295 199 268 203 Q 244 206 227 197 Q 215 188 196 132 Z',
	'M 244 107 Q 250 105 261 107 Q 338 125 478 139 Q 487 140 488 148 Q 488 155 468 164 Q 441 175 378 153 Q 317 139 242 127 L 244 107 Z'
];

export const xueMedians: number[][][] = [
	[
		[236, 507],
		[271, 504],
		[458, 553],
		[521, 555],
		[548, 558]
	],
	[
		[234, 400],
		[314, 441],
		[372, 486],
		[399, 505],
		[412, 505],
		[423, 404],
		[420, 311],
		[401, 249],
		[354, 202],
		[314, 170]
	],
	[
		[419, 391],
		[449, 363],
		[520, 376],
		[590, 382],
		[646, 377],
		[688, 361]
	],
	[
		[266, 259],
		[297, 274],
		[331, 290],
		[367, 301]
	],
	[
		[581, 292],
		[604, 267],
		[615, 235],
		[620, 132],
		[613, 61],
		[595, 22],
		[570, 3],
		[531, 18],
		[502, 48],
		[489, 76]
	],
	[
		[634, 255],
		[685, 276],
		[738, 286],
		[790, 283],
		[828, 271]
	],
	[
		[197, 120],
		[224, 72],
		[236, 78],
		[241, 108],
		[244, 135],
		[261, 158],
		[277, 173],
		[298, 186]
	],
	[
		[249, 110],
		[263, 119],
		[340, 140],
		[424, 155],
		[480, 148]
	]
];

export const xueFragments: number[][] = [
	[0, 1, 2, 3],
	[4, 5],
	[6, 7]
];

/** Full character data for 学 */
export const xueCharacterData: CharacterData = {
	character: '学',
	codepoint: 'U+5B66',
	gloss: 'to study; to learn',
	hint: 'Two hands (𦥑) teaching a child (子) under a roof (宀). The sound component 爻 has evolved.',
	originalMeaning: null,
	strokeCountSimp: 8,
	strokeCountTrad: 16,
	isVerified: true,
	components: [
		{
			character: '⺍',
			type: ['iconic'],
			hint: 'Simplified form of 𦥑, depicting two hands.',
			pinyin: null,
			gloss: 'two hands'
		},
		{
			character: '冖',
			type: ['iconic'],
			hint: 'Depicts a cover or roof.',
			pinyin: null,
			gloss: 'cover'
		},
		{
			character: '子',
			type: ['iconic'],
			hint: 'Depicts a child.',
			pinyin: ['zǐ'],
			gloss: 'child'
		}
	],
	customSources: null,
	simplifiedVariants: null,
	traditionalVariants: ['學'],
	junDaRank: 125,
	junDaFrequency: 80621,
	junDaPerMillion: 839.68,
	subtlexRank: 130,
	subtlexCount: 25103,
	subtlexPerMillion: 826.59,
	subtlexContextDiversity: 5842,
	strokeDataSimp: {
		strokes: xueStrokesSimp,
		medians: xueMedians,
		source: 'animcjk'
	},
	strokeDataTrad: null,
	fragmentsSimp: xueFragments,
	fragmentsTrad: null,
	historicalImages: [
		{
			type: 'Oracle',
			era: 'Shang dynasty',
			url: 'https://xiaoxue.iis.sinica.edu.tw/images/oracle/A00001.jpg'
		},
		{
			type: 'Bronze',
			era: 'Western Zhou',
			url: 'https://xiaoxue.iis.sinica.edu.tw/images/bronze/A00001.jpg'
		},
		{
			type: 'Seal',
			era: 'Shuowen Jiezi',
			url: 'https://xiaoxue.iis.sinica.edu.tw/images/seal/A00001.jpg'
		}
	],
	historicalPronunciations: [
		{
			source: 'baxter-sagart',
			oldChinese: '*m-kˤruk',
			middleChinese: 'hæwk',
			gloss: 'study',
			phoneticSeries: undefined,
			rhymeGroup: undefined,
			notes: undefined,
			pinyin: undefined
		},
		{
			source: 'zhengzhang',
			oldChinese: '*ɡruːɡ',
			pinyin: undefined,
			middleChinese: undefined,
			gloss: undefined,
			phoneticSeries: undefined,
			rhymeGroup: undefined,
			notes: undefined
		},
		{
			source: 'tang',
			middleChinese: 'hɑk',
			pinyin: undefined,
			oldChinese: undefined,
			gloss: undefined,
			phoneticSeries: undefined,
			rhymeGroup: undefined,
			notes: undefined
		}
	],
	shuowenExplanation: '覺悟也。从教从冖。',
	shuowenPronunciation: '胡覺切',
	shuowenPinyin: 'xué',
	pinyinFrequencies: [{ pinyin: 'xué', count: 97 }],
	pinyin: ['xué']
};

/** Minimal character data with no optional fields */
export const minimalCharacterData: CharacterData = {
	character: '一',
	codepoint: 'U+4E00',
	gloss: 'one',
	hint: null,
	originalMeaning: null,
	strokeCountSimp: 1,
	strokeCountTrad: 1,
	isVerified: null,
	components: null,
	customSources: null,
	simplifiedVariants: null,
	traditionalVariants: null,
	junDaRank: 2,
	junDaFrequency: 1520000,
	junDaPerMillion: 15830.93,
	subtlexRank: 5,
	subtlexCount: 95000,
	subtlexPerMillion: 3129.29,
	subtlexContextDiversity: 6100,
	strokeDataSimp: null,
	strokeDataTrad: null,
	fragmentsSimp: null,
	fragmentsTrad: null,
	historicalImages: null,
	historicalPronunciations: null,
	shuowenExplanation: null,
	shuowenPronunciation: null,
	shuowenPinyin: null,
	pinyinFrequencies: [{ pinyin: 'yī', count: 2000 }],
	pinyin: ['yī']
};

/** Character with old pronunciation example: 妈 and 马 */
export const maCharacterData: CharacterData = {
	character: '妈',
	codepoint: 'U+5988',
	gloss: 'mother; mom',
	hint: '女 (woman) + 马 (horse) as a sound component.',
	originalMeaning: null,
	strokeCountSimp: 6,
	strokeCountTrad: 13,
	isVerified: true,
	components: [
		{
			character: '女',
			type: ['meaning'],
			hint: 'A woman.',
			pinyin: ['nǚ'],
			gloss: 'woman'
		},
		{
			character: '马',
			type: ['sound'],
			hint: null,
			pinyin: ['mǎ'],
			gloss: 'horse',
			isOldPronunciation: false,
			historicalPronunciations: [
				{ source: 'baxter-sagart', oldChinese: '*mˤraʔ', middleChinese: 'mæX', gloss: 'horse' }
			]
		}
	],
	customSources: ['Dong Chinese|https://dong-chinese.com'],
	simplifiedVariants: null,
	traditionalVariants: ['媽'],
	junDaRank: 600,
	junDaFrequency: 25000,
	junDaPerMillion: 260.28,
	subtlexRank: 150,
	subtlexCount: 20000,
	subtlexPerMillion: 659.01,
	subtlexContextDiversity: 4500,
	strokeDataSimp: null,
	strokeDataTrad: null,
	fragmentsSimp: null,
	fragmentsTrad: null,
	historicalImages: null,
	historicalPronunciations: [
		{ source: 'baxter-sagart', oldChinese: '*mˤraʔ', middleChinese: 'mæX', gloss: 'mother' }
	],
	shuowenExplanation: null,
	shuowenPronunciation: null,
	shuowenPinyin: null,
	pinyinFrequencies: [{ pinyin: 'mā', count: 55 }],
	pinyin: ['mā']
};

/** Sample historical pronunciations for testing */
export const samplePronunciations: HistoricalPronunciation[] = [
	{
		source: 'baxter-sagart',
		oldChinese: '*m-kˤruk',
		middleChinese: 'hæwk',
		gloss: 'study'
	},
	{
		source: 'baxter-sagart',
		oldChinese: '*C.qʰˤ<r>ok',
		middleChinese: 'hæwk',
		gloss: 'school'
	},
	{
		source: 'zhengzhang',
		oldChinese: '*ɡruːɡ'
	},
	{
		source: 'tang',
		middleChinese: 'hɑk'
	}
];

/** Sample historical images */
export const sampleHistoricalImages: HistoricalImage[] = [
	{
		type: 'Oracle',
		era: 'Shang dynasty',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/oracle/A00001.jpg'
	},
	{
		type: 'Bronze',
		era: 'Western Zhou',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/bronze/A00001.jpg'
	},
	{
		type: 'Seal',
		era: 'Shuowen Jiezi',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/seal/A00001.jpg'
	}
];

/** Character with all special component flags for coverage */
export const specialFlagsCharacterData: CharacterData = {
	character: '错',
	codepoint: 'U+9519',
	gloss: 'wrong; mistake',
	hint: '金 (metal) + 昔 (the past) as a sound component.',
	originalMeaning: 'to inlay with gold or silver',
	strokeCountSimp: 13,
	strokeCountTrad: 16,
	isVerified: true,
	components: [
		{
			character: '钅',
			type: ['meaning'],
			hint: 'Simplified form of 金, meaning metal.',
			pinyin: null,
			gloss: 'metal',
			isFromOriginalMeaning: true
		},
		{
			character: '昔',
			type: ['sound'],
			hint: null,
			pinyin: ['xī'],
			gloss: 'the past',
			isOldPronunciation: true,
			historicalPronunciations: [
				{ source: 'baxter-sagart', oldChinese: '*s-qAk', middleChinese: 'sjæk', gloss: 'formerly' }
			]
		},
		{
			character: '龶',
			type: ['iconic'],
			hint: null,
			pinyin: null,
			gloss: null,
			isGlyphChanged: true
		}
	],
	customSources: null,
	simplifiedVariants: null,
	traditionalVariants: ['錯'],
	junDaRank: 500,
	junDaFrequency: 30000,
	junDaPerMillion: 312.41,
	subtlexRank: 200,
	subtlexCount: 18000,
	subtlexPerMillion: 592.88,
	subtlexContextDiversity: 5000,
	strokeDataSimp: null,
	strokeDataTrad: null,
	fragmentsSimp: null,
	fragmentsTrad: null,
	historicalImages: null,
	historicalPronunciations: [
		{
			source: 'baxter-sagart',
			oldChinese: '*[ts]ʰˤAk',
			middleChinese: 'tshak',
			gloss: 'inlay'
		}
	],
	shuowenExplanation: null,
	shuowenPronunciation: null,
	shuowenPinyin: null,
	pinyinFrequencies: [{ pinyin: 'cuò', count: 80 }],
	pinyin: ['cuò']
};

/** Character with traditional stroke data and simplified variants */
export const traditionalCharacterData: CharacterData = {
	character: '學',
	codepoint: 'U+5B78',
	gloss: 'to study; to learn',
	hint: 'Two hands (𦥑) teaching a child (子) under a roof (宀).',
	originalMeaning: null,
	strokeCountSimp: 8,
	strokeCountTrad: 16,
	isVerified: true,
	components: [
		{
			character: '𦥑',
			type: ['iconic'],
			hint: 'Two hands.',
			pinyin: null,
			gloss: 'two hands'
		},
		{
			character: '冖',
			type: ['iconic'],
			hint: 'A cover or roof.',
			pinyin: null,
			gloss: 'cover'
		},
		{
			character: '子',
			type: ['iconic'],
			hint: 'A child.',
			pinyin: ['zǐ'],
			gloss: 'child'
		}
	],
	customSources: null,
	simplifiedVariants: ['学'],
	traditionalVariants: null,
	junDaRank: 125,
	junDaFrequency: 80621,
	junDaPerMillion: 839.68,
	subtlexRank: 130,
	subtlexCount: 25103,
	subtlexPerMillion: 826.59,
	subtlexContextDiversity: 5842,
	strokeDataSimp: null,
	strokeDataTrad: {
		strokes: xueStrokesSimp,
		medians: xueMedians,
		source: 'animcjk'
	},
	fragmentsSimp: null,
	fragmentsTrad: xueFragments,
	historicalImages: null,
	historicalPronunciations: null,
	shuowenExplanation: '覺悟也。从教从冖。',
	shuowenPronunciation: '胡覺切',
	shuowenPinyin: 'xué',
	pinyinFrequencies: [{ pinyin: 'xué', count: 97 }],
	pinyin: ['xué']
};

/** Many images to test the expand/collapse toggle */
export const manyHistoricalImages: HistoricalImage[] = [
	{
		type: 'Oracle',
		era: 'Shang dynasty',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/oracle/A00001.jpg'
	},
	{
		type: 'Oracle',
		era: 'Shang dynasty variant',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/oracle/A00002.jpg'
	},
	{
		type: 'Oracle',
		era: 'Late Shang',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/oracle/A00003.jpg'
	},
	{
		type: 'Bronze',
		era: 'Western Zhou',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/bronze/A00001.jpg'
	},
	{
		type: 'Bronze',
		era: 'Spring and Autumn',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/bronze/A00002.jpg'
	},
	{
		type: 'Seal',
		era: 'Shuowen Jiezi',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/seal/A00001.jpg'
	},
	{
		type: 'Clerical',
		era: 'Han dynasty',
		url: 'https://xiaoxue.iis.sinica.edu.tw/images/clerical/A00001.jpg'
	}
];

import {
	pgSchema,
	text,
	integer,
	boolean,
	timestamp,
	primaryKey,
	jsonb,
	doublePrecision
} from 'drizzle-orm/pg-core';

export const stage = pgSchema('stage');

// Unihan raw: one row per (codepoint, field, value) triple
// Mirrors the source format exactly: U+XXXX <tab> kFieldName <tab> value
export const unihanRaw = stage.table(
	'unihan_raw',
	{
		codepoint: text('codepoint').notNull(),
		field: text('field').notNull(),
		value: text('value').notNull(),
		syncVersion: integer('sync_version').notNull().default(0),
		isCurrent: boolean('is_current').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.codepoint, t.field] })]
);

// CC-CEDICT raw: one row per dictionary entry line
// Stores the 4 parsed fields + the original line for debugging/re-parsing
export const cedictRaw = stage.table(
	'cedict_raw',
	{
		traditional: text('traditional').notNull(),
		simplified: text('simplified').notNull(),
		pinyin: text('pinyin').notNull(),
		definitions: text('definitions').notNull(),
		rawLine: text('raw_line').notNull(),
		syncVersion: integer('sync_version').notNull().default(0),
		isCurrent: boolean('is_current').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.traditional, t.simplified, t.pinyin] })]
);

// 说文解字 raw: one row per character entry from shuowenjiezi/shuowen GitHub repo
// Source: https://github.com/shuowenjiezi/shuowen (Apache 2.0)
// Stores the key parsed fields + full raw JSON for re-parsing
export const shuowenRaw = stage.table('shuowen_raw', {
	sourceId: integer('source_id').primaryKey(),
	wordhead: text('wordhead').notNull(),
	explanation: text('explanation').notNull(),
	volume: text('volume').notNull(),
	radical: text('radical').notNull(),
	pronunciation: text('pronunciation').notNull(),
	pinyin: text('pinyin').notNull(),
	pinyinFull: text('pinyin_full').notNull(),
	sealCharacter: text('seal_character').notNull().default(''),
	components: jsonb('components').notNull().default([]),
	variants: jsonb('variants').notNull().default([]),
	indexes: jsonb('indexes').notNull().default([]),
	xuanNote: text('xuan_note').notNull().default(''),
	kaiNote: text('kai_note').notNull().default(''),
	duanNotes: jsonb('duan_notes').notNull().default([]),
	rawJson: text('raw_json').notNull(),
	syncVersion: integer('sync_version').notNull().default(0),
	isCurrent: boolean('is_current').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// AnimCJK raw: stroke order and dictionary data per (character, variant)
// Source: https://github.com/parsimonhi/animCJK (Arphic PL / LGPL)
// Merges graphicsZh{Hans,Hant}.txt + dictionaryZh{Hans,Hant}.txt by character
export const animcjkRaw = stage.table(
	'animcjk_raw',
	{
		character: text('character').notNull(),
		variant: text('variant').notNull(), // 'simplified' or 'traditional'
		strokes: jsonb('strokes'), // SVG path strings array (from graphics file)
		medians: jsonb('medians'), // coordinate arrays (from graphics file)
		definition: text('definition'),
		pinyin: jsonb('pinyin'),
		radical: text('radical'),
		decomposition: text('decomposition'),
		acjk: text('acjk'), // AnimCJK's own decomposition format
		characterSet: jsonb('character_set'), // e.g. ["hsk31","frequent2500"]
		syncVersion: integer('sync_version').notNull().default(0),
		isCurrent: boolean('is_current').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.character, t.variant] })]
);

// MakeMeAHanzi raw: stroke order and dictionary data per character
// Source: https://github.com/skishore/makemeahanzi (Arphic PL)
// Merges graphics.txt + dictionary.txt by character
export const makemeahanziRaw = stage.table('makemeahanzi_raw', {
	character: text('character').primaryKey(),
	strokes: jsonb('strokes'), // SVG path strings array
	medians: jsonb('medians'), // coordinate arrays
	definition: text('definition'),
	pinyin: jsonb('pinyin'),
	radical: text('radical'),
	decomposition: text('decomposition'),
	matches: jsonb('matches'), // stroke-to-component mappings
	etymology: jsonb('etymology'), // { type, hint, ... }
	syncVersion: integer('sync_version').notNull().default(0),
	isCurrent: boolean('is_current').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Baxter-Sagart Old Chinese reconstruction: one row per character-reading
// Source: Wiktionary Module:zh/data/och-pron-BS (CC BY-SA 4.0)
// Original data: Baxter & Sagart, "Old Chinese: A New Reconstruction" (2014)
export const baxterSagartRaw = stage.table(
	'baxter_sagart_raw',
	{
		character: text('character').notNull(),
		pinyin: text('pinyin').notNull(),
		middleChinese: text('middle_chinese').notNull(), // e.g. "xawX"
		oldChinese: text('old_chinese').notNull(), // e.g. "*qʰˤuʔ"
		gloss: text('gloss').notNull().default(''),
		syncVersion: integer('sync_version').notNull().default(0),
		isCurrent: boolean('is_current').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.character, t.middleChinese, t.oldChinese] })]
);

// Zhengzhang Shangfang Old Chinese reconstruction: one row per character-reading
// Source: Wiktionary Module:zh/data/och-pron-ZS (CC BY-SA 4.0)
// Original data: Zhengzhang Shangfang, "The Phonological System of Old Chinese" (2003)
export const zhengzhangRaw = stage.table(
	'zhengzhang_raw',
	{
		character: text('character').notNull(),
		sourceId: text('source_id').notNull(), // unique ID from the source data
		phoneticSeries: text('phonetic_series').notNull().default(''), // 諧聲系列
		rhymeGroup: text('rhyme_group').notNull().default(''), // 韻部
		readingNum: text('reading_num').notNull().default(''), // reading variant number
		variant: text('variant').notNull().default(''), // variant character form
		oldChinese: text('old_chinese').notNull(), // e.g. "qʰuːʔ"
		notes: text('notes').notNull().default(''),
		syncVersion: integer('sync_version').notNull().default(0),
		isCurrent: boolean('is_current').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [primaryKey({ columns: [t.character, t.sourceId] })]
);

// Jun Da character frequency: one row per character
// Source: https://lingua.mtsu.edu/chinese-computing/ (Jun Da, MTSU)
// Corpus of ~193M characters of modern Chinese text
export const junDaCharFreqRaw = stage.table('jun_da_char_freq_raw', {
	character: text('character').primaryKey(),
	rank: integer('rank').notNull(),
	rawFrequency: integer('raw_frequency').notNull(),
	cumulativePercent: text('cumulative_percent').notNull(),
	pinyin: text('pinyin').notNull().default(''),
	english: text('english').notNull().default(''),
	syncVersion: integer('sync_version').notNull().default(0),
	isCurrent: boolean('is_current').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// SUBTLEX-CH character frequency: one row per character
// Source: https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch
// Corpus: 46.8M characters from 6,243 film subtitles
export const subtlexChCharRaw = stage.table('subtlex_ch_char_raw', {
	character: text('character').primaryKey(),
	count: integer('count').notNull(),
	perMillion: doublePrecision('per_million').notNull(),
	logFreq: doublePrecision('log_freq').notNull(),
	contextDiversity: integer('context_diversity').notNull(), // CHR-CD: number of films containing this char
	contextDiversityPct: doublePrecision('context_diversity_pct').notNull(), // CHR-CD%
	logContextDiversity: doublePrecision('log_context_diversity').notNull(), // logCHR-CD
	syncVersion: integer('sync_version').notNull().default(0),
	isCurrent: boolean('is_current').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// SUBTLEX-CH word frequency: one row per word
// Source: https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch
// Corpus: 33.5M words from 6,243 film subtitles
export const subtlexChWordRaw = stage.table('subtlex_ch_word_raw', {
	word: text('word').primaryKey(),
	count: integer('count').notNull(),
	perMillion: doublePrecision('per_million').notNull(),
	logFreq: doublePrecision('log_freq').notNull(),
	contextDiversity: integer('context_diversity').notNull(), // W-CD: number of films containing this word
	contextDiversityPct: doublePrecision('context_diversity_pct').notNull(), // W-CD%
	logContextDiversity: doublePrecision('log_context_diversity').notNull(), // logW-CD
	syncVersion: integer('sync_version').notNull().default(0),
	isCurrent: boolean('is_current').notNull().default(true),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

// Sync metadata: tracks last download per source
export const syncMetadata = stage.table('sync_metadata', {
	source: text('source').primaryKey(),
	version: integer('version').notNull().default(0),
	lastDownload: timestamp('last_download', { withTimezone: true }),
	checksum: text('checksum'),
	rowCount: integer('row_count'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

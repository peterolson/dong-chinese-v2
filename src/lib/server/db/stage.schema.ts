import {
	pgSchema,
	text,
	integer,
	boolean,
	timestamp,
	primaryKey,
	jsonb
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

// Sync metadata: tracks last download per source
export const syncMetadata = stage.table('sync_metadata', {
	source: text('source').primaryKey(),
	version: integer('version').notNull().default(0),
	lastDownload: timestamp('last_download', { withTimezone: true }),
	checksum: text('checksum'),
	rowCount: integer('row_count'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

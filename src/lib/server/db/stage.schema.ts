import { pgSchema, text, integer, boolean, timestamp, primaryKey } from 'drizzle-orm/pg-core';

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

// Sync metadata: tracks last download per source
export const syncMetadata = stage.table('sync_metadata', {
	source: text('source').primaryKey(),
	version: integer('version').notNull().default(0),
	lastDownload: timestamp('last_download', { withTimezone: true }),
	checksum: text('checksum'),
	rowCount: integer('row_count'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

import {
	pgSchema,
	text,
	integer,
	boolean,
	timestamp,
	jsonb,
	doublePrecision,
	index,
	uuid,
	check
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const dictionary = pgSchema('dictionary');

// Materialized character data — combines all stage.* sources into one row per character.
// This is the "base" layer. The dictionary.char view overlays approved char_manual edits on top.
export const charBase = dictionary.table(
	'char_base',
	{
		character: text('character').primaryKey(),
		codepoint: text('codepoint'),

		// Dong Chinese curated data
		gloss: text('gloss'),
		hint: text('hint'),
		originalMeaning: text('original_meaning'),
		strokeCountSimp: integer('stroke_count_simp'),
		strokeCountTrad: integer('stroke_count_trad'),
		isVerified: boolean('is_verified'),
		components: jsonb('components'), // ComponentData[]
		customSources: jsonb('custom_sources'), // Record<string, string>

		// Variant forms
		simplifiedVariants: jsonb('simplified_variants'), // string[]
		traditionalVariants: jsonb('traditional_variants'), // string[]

		// Jun Da character frequency (modern corpus, ~193M chars)
		junDaRank: integer('jun_da_rank'),
		junDaFrequency: integer('jun_da_frequency'),
		junDaPerMillion: doublePrecision('jun_da_per_million'),

		// SUBTLEX-CH character frequency (film subtitles, ~46.8M chars)
		subtlexRank: integer('subtlex_rank'),
		subtlexCount: integer('subtlex_count'),
		subtlexPerMillion: doublePrecision('subtlex_per_million'),
		subtlexContextDiversity: integer('subtlex_context_diversity'),

		// Stroke order data per variant
		strokeDataSimp: jsonb('stroke_data_simp'), // StrokeVariantData
		strokeDataTrad: jsonb('stroke_data_trad'), // StrokeVariantData

		// Fragment maps: how components connect to strokes
		fragmentsSimp: jsonb('fragments_simp'),
		fragmentsTrad: jsonb('fragments_trad'),

		// Historical script images (oracle, bronze, seal, clerical) — excludes makemeahanzi
		historicalImages: jsonb('historical_images'),

		// Combined historical pronunciations from multiple sources
		historicalPronunciations: jsonb('historical_pronunciations'), // HistoricalPronunciation[]

		// 说文解字
		shuowenExplanation: text('shuowen_explanation'),
		shuowenPronunciation: text('shuowen_pronunciation'),
		shuowenPinyin: text('shuowen_pinyin'),

		// Pinyin frequencies from Unihan kHanyuPinlu
		pinyinFrequencies: jsonb('pinyin_frequencies'), // PinyinFrequency[]

		// Deduplicated pinyin readings from all sources
		pinyin: text('pinyin').array(),

		// Audit
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('char_base_jun_da_rank_idx').on(t.junDaRank),
		index('char_base_subtlex_rank_idx').on(t.subtlexRank),
		index('char_base_stroke_count_simp_idx').on(t.strokeCountSimp),
		index('char_base_stroke_count_trad_idx').on(t.strokeCountTrad)
	]
);

// Manual character edits — append-only revision log.
// Each row is a full snapshot of the character data at the time of the edit.
// The dictionary.char view layers the most recent approved edit on top of char_base.
export const charManual = dictionary.table(
	'char_manual',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		character: text('character').notNull(),

		// All data columns from char_base (nullable — full-row snapshot)
		codepoint: text('codepoint'),
		gloss: text('gloss'),
		hint: text('hint'),
		originalMeaning: text('original_meaning'),
		strokeCountSimp: integer('stroke_count_simp'),
		strokeCountTrad: integer('stroke_count_trad'),
		isVerified: boolean('is_verified'),
		components: jsonb('components'),
		customSources: jsonb('custom_sources'),
		simplifiedVariants: jsonb('simplified_variants'),
		traditionalVariants: jsonb('traditional_variants'),
		junDaRank: integer('jun_da_rank'),
		junDaFrequency: integer('jun_da_frequency'),
		junDaPerMillion: doublePrecision('jun_da_per_million'),
		subtlexRank: integer('subtlex_rank'),
		subtlexCount: integer('subtlex_count'),
		subtlexPerMillion: doublePrecision('subtlex_per_million'),
		subtlexContextDiversity: integer('subtlex_context_diversity'),
		strokeDataSimp: jsonb('stroke_data_simp'),
		strokeDataTrad: jsonb('stroke_data_trad'),
		fragmentsSimp: jsonb('fragments_simp'),
		fragmentsTrad: jsonb('fragments_trad'),
		historicalImages: jsonb('historical_images'),
		historicalPronunciations: jsonb('historical_pronunciations'),
		shuowenExplanation: text('shuowen_explanation'),
		shuowenPronunciation: text('shuowen_pronunciation'),
		shuowenPinyin: text('shuowen_pinyin'),
		pinyinFrequencies: jsonb('pinyin_frequencies'),
		pinyin: text('pinyin').array(),

		// Status / review
		status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
		reviewedBy: text('reviewed_by'), // user.id of reviewer; no FK so edits survive user deletion
		reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

		// Audit — no FK on editedBy so anonymous and deleted-user edits are preserved
		editedBy: text('edited_by'), // user.id when authenticated, null for anonymous
		anonymousSessionId: uuid('anonymous_session_id'), // session ID for unauthenticated users
		editComment: text('edit_comment').notNull().default(''),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('char_manual_character_status_created_idx').on(t.character, t.status, t.createdAt),
		index('char_manual_edited_by_idx').on(t.editedBy),
		index('char_manual_status_idx').on(t.status),
		check('char_manual_status_check', sql`${t.status} IN ('pending', 'approved', 'rejected')`)
	]
);

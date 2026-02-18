import {
	pgSchema,
	text,
	integer,
	boolean,
	timestamp,
	jsonb,
	doublePrecision,
	index
} from 'drizzle-orm/pg-core';

export const dictionary = pgSchema('dictionary');

// Materialized character data — combines all stage.* sources into one row per character.
// This is the "base" layer. Later, dictionary.char will overlay manual overrides on top.
export const charBase = dictionary.table(
	'char_base',
	{
		character: text('character').primaryKey(),
		codepoint: text('codepoint'),

		// Dong Chinese curated data
		gloss: text('gloss'),
		hint: text('hint'),
		originalMeaning: text('original_meaning'),
		strokeCount: integer('stroke_count'),
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

		// Stroke order data: { simplified?: { strokes, medians, source }, traditional?: { ... } }
		strokeData: jsonb('stroke_data'),

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

		// Audit
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(t) => [
		index('char_base_jun_da_rank_idx').on(t.junDaRank),
		index('char_base_subtlex_rank_idx').on(t.subtlexRank),
		index('char_base_stroke_count_idx').on(t.strokeCount)
	]
);

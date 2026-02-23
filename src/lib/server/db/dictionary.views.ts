/**
 * Drizzle view declarations for the dictionary schema.
 *
 * The char view overlays the most recent approved char_manual edit on top of char_base.
 * Defined with .as(sql`...`) so drizzle-kit manages it (CREATE OR REPLACE VIEW),
 * avoiding the issue where .existing() views get dropped during drizzle-kit push.
 */

import { sql } from 'drizzle-orm';
import { text, integer, boolean, timestamp, jsonb, doublePrecision } from 'drizzle-orm/pg-core';
import { dictionary } from './dictionary.schema';

export const charView = dictionary.view('char', {
	character: text('character').notNull(),
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
	createdAt: timestamp('created_at', { withTimezone: true }),
	updatedAt: timestamp('updated_at', { withTimezone: true })
}).as(sql`
		WITH latest_approved AS (
			SELECT DISTINCT ON (character) *
			FROM dictionary.char_manual
			WHERE status = 'approved'
			ORDER BY character, created_at DESC
		)
		SELECT
			b.character,
			COALESCE(m.codepoint, b.codepoint) AS codepoint,
			COALESCE(m.gloss, b.gloss) AS gloss,
			COALESCE(m.hint, b.hint) AS hint,
			COALESCE(m.original_meaning, b.original_meaning) AS original_meaning,
			COALESCE(m.stroke_count_simp, b.stroke_count_simp) AS stroke_count_simp,
			COALESCE(m.stroke_count_trad, b.stroke_count_trad) AS stroke_count_trad,
			COALESCE(m.is_verified, b.is_verified) AS is_verified,
			COALESCE(m.components, b.components) AS components,
			COALESCE(m.custom_sources, b.custom_sources) AS custom_sources,
			COALESCE(m.simplified_variants, b.simplified_variants) AS simplified_variants,
			COALESCE(m.traditional_variants, b.traditional_variants) AS traditional_variants,
			COALESCE(m.jun_da_rank, b.jun_da_rank) AS jun_da_rank,
			COALESCE(m.jun_da_frequency, b.jun_da_frequency) AS jun_da_frequency,
			COALESCE(m.jun_da_per_million, b.jun_da_per_million) AS jun_da_per_million,
			COALESCE(m.subtlex_rank, b.subtlex_rank) AS subtlex_rank,
			COALESCE(m.subtlex_count, b.subtlex_count) AS subtlex_count,
			COALESCE(m.subtlex_per_million, b.subtlex_per_million) AS subtlex_per_million,
			COALESCE(m.subtlex_context_diversity, b.subtlex_context_diversity) AS subtlex_context_diversity,
			COALESCE(m.stroke_data_simp, b.stroke_data_simp) AS stroke_data_simp,
			COALESCE(m.stroke_data_trad, b.stroke_data_trad) AS stroke_data_trad,
			COALESCE(m.fragments_simp, b.fragments_simp) AS fragments_simp,
			COALESCE(m.fragments_trad, b.fragments_trad) AS fragments_trad,
			COALESCE(m.historical_images, b.historical_images) AS historical_images,
			COALESCE(m.historical_pronunciations, b.historical_pronunciations) AS historical_pronunciations,
			COALESCE(m.shuowen_explanation, b.shuowen_explanation) AS shuowen_explanation,
			COALESCE(m.shuowen_pronunciation, b.shuowen_pronunciation) AS shuowen_pronunciation,
			COALESCE(m.shuowen_pinyin, b.shuowen_pinyin) AS shuowen_pinyin,
			COALESCE(m.pinyin_frequencies, b.pinyin_frequencies) AS pinyin_frequencies,
			COALESCE(m.pinyin, b.pinyin) AS pinyin,
			b.created_at,
			GREATEST(COALESCE(m.created_at, b.updated_at), b.updated_at) AS updated_at
		FROM dictionary.char_base b
		LEFT JOIN latest_approved m USING (character)
	`);

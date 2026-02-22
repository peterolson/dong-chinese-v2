/**
 * Drizzle view declarations for the dictionary schema.
 *
 * Separated from dictionary.schema.ts because drizzle-kit push does not
 * handle .existing() views in custom schemas. This file is imported by
 * application code but NOT listed in drizzle.config.ts.
 */

import { text, integer, boolean, timestamp, jsonb, doublePrecision } from 'drizzle-orm/pg-core';
import { dictionary } from './dictionary.schema';

// Combined view: char_base with the most recent approved char_manual edit layered on top.
// Created and managed by scripts/dictionary/create-char-view.ts (not by drizzle-kit).
// The .existing() declaration gives Drizzle type information without managing the view.
export const charView = dictionary
	.view('char', {
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
	})
	.existing();

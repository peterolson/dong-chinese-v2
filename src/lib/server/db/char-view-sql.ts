/**
 * Single source of truth for the dictionary.char view SQL.
 *
 * Imported by:
 *   - dictionary.views.ts — Drizzle view definition (.as())
 *   - scripts/dictionary/rebuild-dict-char.ts — atomic swap re-creates the view
 *   - scripts/dictionary/create-char-view.ts — standalone view creation
 *
 * The view layers the most recent approved char_manual edit on top of char_base.
 * It's driven by char_base — manual edits for characters not in char_base won't appear.
 */

export const CHAR_VIEW_BODY = `
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
		COALESCE(m.variant_of, b.variant_of) AS variant_of,
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
`;

/** Full CREATE OR REPLACE VIEW statement — used by scripts that need raw SQL. */
export const CHAR_VIEW_SQL = `CREATE OR REPLACE VIEW dictionary.char AS ${CHAR_VIEW_BODY}`;

/**
 * Covering index on char_manual for the latest_approved CTE in the char view.
 * Eliminates seq-scan + sort by enabling an index-only scan on approved edits.
 * INCLUDEs the columns most commonly read through the view.
 */
export const CHAR_MANUAL_COVERING_INDEX_SQL = `
	CREATE INDEX IF NOT EXISTS char_manual_approved_covering_idx
	ON dictionary.char_manual (character, created_at DESC)
	INCLUDE (components, hint, is_verified, subtlex_rank, variant_of)
	WHERE status = 'approved'
`;

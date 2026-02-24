import { db } from '$lib/server/db';
import { charView } from '$lib/server/db/dictionary.views';
import { eq, inArray, sql } from 'drizzle-orm';
import type { CharacterData, ComponentData, HistoricalPronunciation } from '$lib/types/dictionary';

/**
 * Look up a single character's data from the dictionary.char view.
 * The view layers approved manual edits (char_manual) on top of the base data (char_base).
 */
export async function getCharacterData(char: string): Promise<CharacterData | null> {
	const rows = await db.select().from(charView).where(eq(charView.character, char)).limit(1);

	if (rows.length === 0) return null;

	const row = rows[0];
	const components = row.components as ComponentData[] | null;

	// Batch-fetch pinyin, gloss, and historical pronunciations for component characters
	if (components && components.length > 0) {
		const compChars = [...new Set(components.map((c) => c.character))];
		const needsHistory = new Set(
			components.filter((c) => c.isOldPronunciation).map((c) => c.character)
		);
		const compRows = await db
			.select({
				character: charView.character,
				pinyin: charView.pinyin,
				gloss: charView.gloss,
				historicalPronunciations: charView.historicalPronunciations
			})
			.from(charView)
			.where(inArray(charView.character, compChars));

		const compMap = new Map(compRows.map((r) => [r.character, r]));
		for (const comp of components) {
			const data = compMap.get(comp.character);
			if (data) {
				comp.pinyin = data.pinyin;
				comp.gloss = data.gloss;
				if (needsHistory.has(comp.character)) {
					comp.historicalPronunciations = data.historicalPronunciations as
						| HistoricalPronunciation[]
						| null;
				}
			}
		}
	}

	return {
		character: row.character,
		codepoint: row.codepoint,
		gloss: row.gloss,
		hint: row.hint,
		originalMeaning: row.originalMeaning,
		strokeCountSimp: row.strokeCountSimp,
		strokeCountTrad: row.strokeCountTrad,
		isVerified: row.isVerified,
		components,
		customSources: row.customSources as CharacterData['customSources'],
		simplifiedVariants: row.simplifiedVariants as CharacterData['simplifiedVariants'],
		traditionalVariants: row.traditionalVariants as CharacterData['traditionalVariants'],
		junDaRank: row.junDaRank,
		junDaFrequency: row.junDaFrequency,
		junDaPerMillion: row.junDaPerMillion,
		subtlexRank: row.subtlexRank,
		subtlexCount: row.subtlexCount,
		subtlexPerMillion: row.subtlexPerMillion,
		subtlexContextDiversity: row.subtlexContextDiversity,
		strokeDataSimp: row.strokeDataSimp as CharacterData['strokeDataSimp'],
		strokeDataTrad: row.strokeDataTrad as CharacterData['strokeDataTrad'],
		fragmentsSimp: row.fragmentsSimp as CharacterData['fragmentsSimp'],
		fragmentsTrad: row.fragmentsTrad as CharacterData['fragmentsTrad'],
		historicalImages: row.historicalImages as CharacterData['historicalImages'],
		historicalPronunciations:
			row.historicalPronunciations as CharacterData['historicalPronunciations'],
		shuowenExplanation: row.shuowenExplanation,
		shuowenPronunciation: row.shuowenPronunciation,
		shuowenPinyin: row.shuowenPinyin,
		pinyinFrequencies: row.pinyinFrequencies as CharacterData['pinyinFrequencies'],
		pinyin: row.pinyin
	};
}

export interface CharacterSearchResult {
	character: string;
	pinyin: string[] | null;
	gloss: string | null;
}

/**
 * Search characters by character, pinyin, or gloss.
 * Returns exact character matches first, then pinyin matches, then gloss matches.
 */
export async function searchCharacters(
	query: string,
	limit = 50
): Promise<CharacterSearchResult[]> {
	if (!query.trim()) return [];

	const trimmed = query.trim();

	const rows = await db
		.select({
			character: charView.character,
			pinyin: charView.pinyin,
			gloss: charView.gloss
		})
		.from(charView)
		.where(
			sql`${charView.character} = ${trimmed}
				OR ${trimmed} = ANY(${charView.pinyin})
				OR ${charView.gloss} ILIKE ${'%' + trimmed + '%'}`
		)
		.orderBy(
			// Exact character match first, then pinyin match, then gloss match
			sql`CASE
				WHEN ${charView.character} = ${trimmed} THEN 0
				WHEN ${trimmed} = ANY(${charView.pinyin}) THEN 1
				ELSE 2
			END`,
			sql`${charView.subtlexRank} ASC NULLS LAST`
		)
		.limit(limit);

	return rows;
}

export const LIST_TYPES = {
	'subtlex-rank': {
		label: 'Movie Frequency',
		orderBy: 'subtlex_rank ASC NULLS LAST',
		legacyCamelCase: 'movieFrequency'
	},
	'subtlex-context-diversity': {
		label: 'Context Diversity',
		orderBy: 'subtlex_context_diversity DESC NULLS LAST',
		legacyCamelCase: 'contextDiversity'
	},
	'jun-da-rank': {
		label: 'Book Frequency',
		orderBy: 'jun_da_rank ASC NULLS LAST',
		legacyCamelCase: 'bookCount'
	},
	'common-components': {
		label: 'Most Common Components',
		orderBy: null, // custom query
		legacyCamelCase: null
	}
} as const;

export type ListType = keyof typeof LIST_TYPES;

export interface CharacterListItem {
	character: string;
	pinyin: string[] | null;
	gloss: string | null;
	subtlexRank: number | null;
	subtlexPerMillion: number | null;
	subtlexContextDiversity: number | null;
	junDaRank: number | null;
	junDaPerMillion: number | null;
	simplifiedVariants: string[] | null;
	traditionalVariants: string[] | null;
}

/**
 * Get a frequency-ordered character list with pagination.
 */
export async function getCharacterList(
	listType: ListType,
	offset: number,
	limit: number
): Promise<{ items: CharacterListItem[]; total: number }> {
	const selectCols = {
		character: charView.character,
		pinyin: charView.pinyin,
		gloss: charView.gloss,
		subtlexRank: charView.subtlexRank,
		subtlexPerMillion: charView.subtlexPerMillion,
		subtlexContextDiversity: charView.subtlexContextDiversity,
		junDaRank: charView.junDaRank,
		junDaPerMillion: charView.junDaPerMillion,
		simplifiedVariants: charView.simplifiedVariants,
		traditionalVariants: charView.traditionalVariants
	};

	let orderClause: ReturnType<typeof sql>;
	let whereClause: ReturnType<typeof sql> | undefined;

	switch (listType) {
		case 'subtlex-rank':
			orderClause = sql`${charView.subtlexRank} ASC NULLS LAST`;
			whereClause = sql`${charView.subtlexRank} IS NOT NULL`;
			break;
		case 'subtlex-context-diversity':
			orderClause = sql`${charView.subtlexContextDiversity} DESC NULLS LAST`;
			whereClause = sql`${charView.subtlexContextDiversity} IS NOT NULL`;
			break;
		case 'jun-da-rank':
			orderClause = sql`${charView.junDaRank} ASC NULLS LAST`;
			whereClause = sql`${charView.junDaRank} IS NOT NULL`;
			break;
		case 'common-components': {
			// Characters that appear most frequently as components in other characters.
			// Precompute counts in a single aggregate rather than a correlated subquery per row.
			const rows = await db.execute<Record<string, unknown>>(sql`
				WITH component_counts AS (
					SELECT comp->>'character' AS character, count(*)::int AS usage_count
					FROM ${charView} AS src, jsonb_array_elements(src.components) AS comp
					WHERE src.components IS NOT NULL
					GROUP BY comp->>'character'
				)
				SELECT
					c.character, c.pinyin, c.gloss,
					c.subtlex_rank AS "subtlexRank",
					c.subtlex_per_million AS "subtlexPerMillion",
					c.subtlex_context_diversity AS "subtlexContextDiversity",
					c.jun_da_rank AS "junDaRank",
					c.jun_da_per_million AS "junDaPerMillion",
					c.simplified_variants AS "simplifiedVariants",
					c.traditional_variants AS "traditionalVariants",
					count(*) OVER() AS total
				FROM component_counts cc
				JOIN ${charView} c ON c.character = cc.character
				ORDER BY cc.usage_count DESC
				OFFSET ${offset}
				LIMIT ${limit}
			`);
			const typed = rows as unknown as (CharacterListItem & { total: number })[];
			return {
				items: typed,
				total: typed.length > 0 ? typed[0].total : 0
			};
		}
	}

	const [items, countResult] = await Promise.all([
		db
			.select(selectCols)
			.from(charView)
			.where(whereClause)
			.orderBy(orderClause)
			.offset(offset)
			.limit(limit),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(charView)
			.where(whereClause)
			.then((rows) => rows[0])
	]);

	return {
		items: items.map((row) => ({
			...row,
			simplifiedVariants: row.simplifiedVariants as string[] | null,
			traditionalVariants: row.traditionalVariants as string[] | null
		})),
		total: countResult.count
	};
}

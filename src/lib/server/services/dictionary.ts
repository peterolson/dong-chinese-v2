import { db } from '$lib/server/db';
import { charView } from '$lib/server/db/dictionary.views';
import { dongChars, hsk2Chars, hsk3Chars } from '$lib/server/db/stage.schema';
import { eq, inArray, sql } from 'drizzle-orm';
import type {
	CharacterData,
	ComponentData,
	ComponentUse,
	ComponentUseGroup,
	DeletedComponentGlyph,
	HistoricalPronunciation,
	StrokeVariantData
} from '$lib/types/dictionary';

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
		variantOf: row.variantOf,
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

/**
 * Find all characters that contain the given character as a component,
 * grouped by the role (type) the component plays.
 * Each group is sorted by Jun Da frequency; groups are sorted by character count descending.
 */
export async function getComponentUses(component: string): Promise<ComponentUseGroup[]> {
	const rows = await db.execute<{
		character: string;
		isVerified: boolean;
		types: string[] | null;
		junDaRank: number | null;
	}>(sql`
		SELECT c.character,
			COALESCE(c.is_verified, false) AS "isVerified",
			(comp->'type')::jsonb AS types,
			c.jun_da_rank AS "junDaRank"
		FROM ${charView} c
		CROSS JOIN LATERAL jsonb_array_elements(COALESCE(c.components, '[]'::jsonb)) AS comp
		WHERE comp->>'character' = ${component}
		ORDER BY c.jun_da_rank ASC NULLS LAST
	`);

	// Group by component type. A component entry can have multiple types;
	// in that case the character appears in each group.
	const groups = new Map<string, { chars: ComponentUse[]; seen: Set<string>; verified: number }>();
	for (const row of rows as unknown as {
		character: string;
		isVerified: boolean;
		types: string[] | null;
	}[]) {
		const types = row.types && row.types.length > 0 ? row.types : ['unknown'];
		for (const type of types) {
			let group = groups.get(type);
			if (!group) {
				group = { chars: [], seen: new Set(), verified: 0 };
				groups.set(type, group);
			}
			if (!group.seen.has(row.character)) {
				group.seen.add(row.character);
				group.chars.push({ character: row.character, isVerified: row.isVerified });
				if (row.isVerified) group.verified++;
			}
		}
	}

	// Sort groups by character count descending
	return [...groups.entries()]
		.sort((a, b) => b[1].chars.length - a[1].chars.length)
		.map(([type, { chars, verified }]) => ({
			type,
			characters: chars,
			verifiedCount: verified
		}));
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

/** Total number of films in the SUBTLEX-CH corpus */
const SUBTLEX_TOTAL_FILMS = 6243;

/** Sum of subtlex_count across all characters in the char view */
const SUBTLEX_TOTAL_COUNT = 44_227_786;

/** Sum of jun_da_frequency across all characters in the char view */
const JUN_DA_TOTAL_FREQUENCY = 187_182_367;

export const LIST_TYPES = {
	'movie-contexts': {
		label: '% of Movies',
		navLabel: '% Movies',
		description:
			'Characters ranked by the percentage of films they appear in (SUBTLEX-CH corpus, 6,243 films).'
	},
	'movie-count': {
		label: 'Movie Frequency',
		navLabel: 'Movie Freq.',
		description:
			'Characters ranked by how often they appear in Chinese film subtitles (SUBTLEX-CH corpus, 6,243 films).'
	},
	'book-count': {
		label: 'Book Frequency',
		navLabel: 'Book Freq.',
		description:
			'Characters ranked by how often they appear in modern Chinese books (Jun Da corpus).'
	},
	hsk: {
		label: 'HSK 2.0',
		navLabel: 'HSK 2.0',
		description: 'Characters from the HSK 2.0 standard, organized by level (1–6).'
	},
	'hsk-3': {
		label: 'HSK 3.0',
		navLabel: 'HSK 3.0',
		description: 'Characters from the HSK 3.0 standard, organized by level (1–7+).'
	},
	'dong-chinese': {
		label: '懂中文 Order',
		navLabel: '懂中文',
		description:
			'Characters in the order taught by 懂中文 (Dong Chinese), created from a balanced mix of frequency, graded readers, and standardized tests.'
	},
	components: {
		label: 'Most Common Components',
		navLabel: 'Components',
		description: 'Characters that appear most frequently as building blocks of other characters.'
	}
} as const;

export type ListType = keyof typeof LIST_TYPES;

export interface CharacterListItem {
	character: string;
	pinyin: string[] | null;
	gloss: string | null;
	isVerified: boolean;
	subtlexRank: number | null;
	subtlexPerMillion: number | null;
	subtlexContextDiversity: number | null;
	junDaRank: number | null;
	junDaPerMillion: number | null;
	simplifiedVariants: string[] | null;
	traditionalVariants: string[] | null;
	level: number | null;
	moviePercentage: number | null;
	usageCount: number | null;
	cumulativePercent: number | null;
	variants: string[] | null;
}

/**
 * Get a frequency-ordered character list with pagination.
 */
export async function getCharacterList(
	listType: ListType,
	offset: number,
	limit: number
): Promise<{ items: CharacterListItem[]; total: number }> {
	switch (listType) {
		case 'movie-contexts': {
			const rows = await db.execute<Record<string, unknown>>(sql`
				SELECT
					c.character, c.pinyin, c.gloss,
					COALESCE(c.is_verified, false) AS "isVerified",
					c.subtlex_rank AS "subtlexRank",
					c.subtlex_per_million AS "subtlexPerMillion",
					c.subtlex_context_diversity AS "subtlexContextDiversity",
					c.jun_da_rank AS "junDaRank",
					c.jun_da_per_million AS "junDaPerMillion",
					c.simplified_variants AS "simplifiedVariants",
					c.traditional_variants AS "traditionalVariants",
					ROUND(c.subtlex_context_diversity::numeric / ${SUBTLEX_TOTAL_FILMS} * 100, 2)::float AS "moviePercentage",
					count(*) OVER()::int AS total
				FROM ${charView} c
				WHERE c.subtlex_context_diversity IS NOT NULL
				ORDER BY c.subtlex_context_diversity DESC NULLS LAST
				OFFSET ${offset}
				LIMIT ${limit}
			`);
			const typed = rows as unknown as (CharacterListItem & { total: number })[];
			return {
				items: typed.map((r) => ({
					...r,
					level: null,
					usageCount: null,
					cumulativePercent: null,
					variants: null
				})),
				total: typed.length > 0 ? typed[0].total : 0
			};
		}
		case 'movie-count': {
			const rows = await db.execute<Record<string, unknown>>(sql`
				SELECT
					c.character, c.pinyin, c.gloss,
					COALESCE(c.is_verified, false) AS "isVerified",
					c.subtlex_rank AS "subtlexRank",
					c.subtlex_per_million AS "subtlexPerMillion",
					c.subtlex_context_diversity AS "subtlexContextDiversity",
					c.jun_da_rank AS "junDaRank",
					c.jun_da_per_million AS "junDaPerMillion",
					c.simplified_variants AS "simplifiedVariants",
					c.traditional_variants AS "traditionalVariants",
					ROUND(
						(SUM(c.subtlex_count) OVER (ORDER BY c.subtlex_rank ASC)
						::numeric / ${SUBTLEX_TOTAL_COUNT} * 100), 2
					)::float AS "cumulativePercent",
					count(*) OVER()::int AS total
				FROM ${charView} c
				WHERE c.subtlex_rank IS NOT NULL
				ORDER BY c.subtlex_rank ASC NULLS LAST
				OFFSET ${offset}
				LIMIT ${limit}
			`);
			const typed = rows as unknown as (CharacterListItem & { total: number })[];
			return {
				items: typed.map((r) => ({
					...r,
					level: null,
					moviePercentage: null,
					usageCount: null,
					variants: null
				})),
				total: typed.length > 0 ? typed[0].total : 0
			};
		}
		case 'book-count': {
			const rows = await db.execute<Record<string, unknown>>(sql`
				SELECT
					c.character, c.pinyin, c.gloss,
					COALESCE(c.is_verified, false) AS "isVerified",
					c.subtlex_rank AS "subtlexRank",
					c.subtlex_per_million AS "subtlexPerMillion",
					c.subtlex_context_diversity AS "subtlexContextDiversity",
					c.jun_da_rank AS "junDaRank",
					c.jun_da_per_million AS "junDaPerMillion",
					c.simplified_variants AS "simplifiedVariants",
					c.traditional_variants AS "traditionalVariants",
					ROUND(
						(SUM(c.jun_da_frequency) OVER (ORDER BY c.jun_da_rank ASC)
						::numeric / ${JUN_DA_TOTAL_FREQUENCY} * 100), 2
					)::float AS "cumulativePercent",
					count(*) OVER()::int AS total
				FROM ${charView} c
				WHERE c.jun_da_rank IS NOT NULL
				ORDER BY c.jun_da_rank ASC NULLS LAST
				OFFSET ${offset}
				LIMIT ${limit}
			`);
			const typed = rows as unknown as (CharacterListItem & { total: number })[];
			return {
				items: typed.map((r) => ({
					...r,
					level: null,
					moviePercentage: null,
					usageCount: null,
					variants: null
				})),
				total: typed.length > 0 ? typed[0].total : 0
			};
		}
		case 'hsk': {
			const rows = await db.execute<Record<string, unknown>>(sql`
				SELECT
					c.character, c.pinyin, c.gloss,
					COALESCE(c.is_verified, false) AS "isVerified",
					c.subtlex_rank AS "subtlexRank",
					c.subtlex_per_million AS "subtlexPerMillion",
					c.subtlex_context_diversity AS "subtlexContextDiversity",
					c.jun_da_rank AS "junDaRank",
					c.jun_da_per_million AS "junDaPerMillion",
					c.simplified_variants AS "simplifiedVariants",
					c.traditional_variants AS "traditionalVariants",
					h.level,
					count(*) OVER()::int AS total
				FROM ${hsk2Chars} h
				JOIN ${charView} c ON c.character = h.char
				ORDER BY h.level ASC, h.char ASC
				OFFSET ${offset}
				LIMIT ${limit}
			`);
			const typed = rows as unknown as (CharacterListItem & { total: number })[];
			return {
				items: typed.map((r) => ({
					...r,
					moviePercentage: null,
					usageCount: null,
					cumulativePercent: null,
					variants: null
				})),
				total: typed.length > 0 ? typed[0].total : 0
			};
		}
		case 'hsk-3': {
			const rows = await db.execute<Record<string, unknown>>(sql`
				SELECT
					c.character, c.pinyin, c.gloss,
					COALESCE(c.is_verified, false) AS "isVerified",
					c.subtlex_rank AS "subtlexRank",
					c.subtlex_per_million AS "subtlexPerMillion",
					c.subtlex_context_diversity AS "subtlexContextDiversity",
					c.jun_da_rank AS "junDaRank",
					c.jun_da_per_million AS "junDaPerMillion",
					c.simplified_variants AS "simplifiedVariants",
					c.traditional_variants AS "traditionalVariants",
					h.level,
					count(*) OVER()::int AS total
				FROM ${hsk3Chars} h
				JOIN ${charView} c ON c.character = h.char
				ORDER BY h.level ASC, h.char ASC
				OFFSET ${offset}
				LIMIT ${limit}
			`);
			const typed = rows as unknown as (CharacterListItem & { total: number })[];
			return {
				items: typed.map((r) => ({
					...r,
					moviePercentage: null,
					usageCount: null,
					cumulativePercent: null,
					variants: null
				})),
				total: typed.length > 0 ? typed[0].total : 0
			};
		}
		case 'dong-chinese': {
			const rows = await db.execute<Record<string, unknown>>(sql`
				SELECT
					c.character, c.pinyin, c.gloss,
					COALESCE(c.is_verified, false) AS "isVerified",
					c.subtlex_rank AS "subtlexRank",
					c.subtlex_per_million AS "subtlexPerMillion",
					c.subtlex_context_diversity AS "subtlexContextDiversity",
					c.jun_da_rank AS "junDaRank",
					c.jun_da_per_million AS "junDaPerMillion",
					c.simplified_variants AS "simplifiedVariants",
					c.traditional_variants AS "traditionalVariants",
					count(*) OVER()::int AS total
				FROM ${dongChars} d
				JOIN ${charView} c ON c.character = d.char
				ORDER BY d."order" ASC
				OFFSET ${offset}
				LIMIT ${limit}
			`);
			const typed = rows as unknown as (CharacterListItem & { total: number })[];
			return {
				items: typed.map((r) => ({
					...r,
					level: null,
					moviePercentage: null,
					usageCount: null,
					cumulativePercent: null,
					variants: null
				})),
				total: typed.length > 0 ? typed[0].total : 0
			};
		}
		case 'components': {
			// Characters that appear most frequently as components in other characters.
			// Groups variant forms (e.g. 心/忄/⺗) under the canonical character using variant_of.
			// Pre-loads char data into a CTE to avoid querying the view multiple times.
			const rows = await db.execute<Record<string, unknown>>(sql`
				WITH chars AS (
					SELECT character, variant_of, components, pinyin, gloss,
						COALESCE(is_verified, false) AS is_verified,
						subtlex_rank, subtlex_per_million, subtlex_context_diversity,
						jun_da_rank, jun_da_per_million,
						simplified_variants, traditional_variants
					FROM ${charView}
				),
				component_counts AS (
					SELECT
						COALESCE(cv.variant_of, comp->>'character') AS canonical,
						comp->>'character' AS original,
						count(*)::int AS usage_count
					FROM chars AS src
					CROSS JOIN LATERAL jsonb_array_elements(src.components) AS comp
					LEFT JOIN chars cv ON cv.character = comp->>'character'
					WHERE src.components IS NOT NULL
					GROUP BY COALESCE(cv.variant_of, comp->>'character'), comp->>'character'
				),
				grouped AS (
					SELECT
						canonical AS character,
						sum(usage_count)::int AS usage_count,
						array_agg(DISTINCT original) FILTER (WHERE original != canonical) AS variants
					FROM component_counts
					GROUP BY canonical
				)
				SELECT
					c.character, c.pinyin, c.gloss,
					c.is_verified AS "isVerified",
					c.subtlex_rank AS "subtlexRank",
					c.subtlex_per_million AS "subtlexPerMillion",
					c.subtlex_context_diversity AS "subtlexContextDiversity",
					c.jun_da_rank AS "junDaRank",
					c.jun_da_per_million AS "junDaPerMillion",
					c.simplified_variants AS "simplifiedVariants",
					c.traditional_variants AS "traditionalVariants",
					g.usage_count AS "usageCount",
					g.variants,
					count(*) OVER()::int AS total
				FROM grouped g
				JOIN chars c ON c.character = g.character
				ORDER BY g.usage_count DESC, c.character ASC
				OFFSET ${offset}
				LIMIT ${limit}
			`);
			const typed = rows as unknown as (CharacterListItem & { total: number })[];
			return {
				items: typed.map((r) => ({
					...r,
					level: null,
					moviePercentage: null,
					cumulativePercent: null
				})),
				total: typed.length > 0 ? typed[0].total : 0
			};
		}
	}
}

/**
 * For characters with deleted components, fetch traditional variant stroke data
 * so the deleted component can be rendered within the traditional character glyph.
 *
 * Returns a map from component index → glyph override data, or null if no overrides apply.
 */
export async function getDeletedComponentGlyphs(
	character: CharacterData
): Promise<Record<number, DeletedComponentGlyph> | null> {
	const { components, traditionalVariants } = character;
	if (!components?.length || !traditionalVariants?.length) return null;

	const deletedIndices = components
		.map((c, i) => (c.type?.includes('deleted') ? i : -1))
		.filter((i) => i !== -1);
	if (deletedIndices.length === 0) return null;

	const tradChars = traditionalVariants.filter((v) => v !== character.character);
	if (tradChars.length === 0) return null;

	const tradRows = await db
		.select({
			character: charView.character,
			components: charView.components,
			strokeDataSimp: charView.strokeDataSimp,
			strokeDataTrad: charView.strokeDataTrad,
			fragmentsSimp: charView.fragmentsSimp,
			fragmentsTrad: charView.fragmentsTrad
		})
		.from(charView)
		.where(inArray(charView.character, tradChars));

	// Preserve traditionalVariants order so the first listed variant is preferred
	const tradMap = new Map(tradRows.map((r) => [r.character, r]));

	const result: Record<number, DeletedComponentGlyph> = {};

	for (const i of deletedIndices) {
		const comp = components[i];

		for (const tradChar of tradChars) {
			const tradRow = tradMap.get(tradChar);
			if (!tradRow) continue;

			const tradComponents = tradRow.components as ComponentData[] | null;
			const tradStrokeData = (tradRow.strokeDataSimp ??
				tradRow.strokeDataTrad) as StrokeVariantData | null;
			const tradFragments = (tradRow.fragmentsSimp ?? tradRow.fragmentsTrad) as number[][] | null;

			if (!tradComponents || !tradStrokeData?.strokes || !tradFragments) continue;

			// Find the Nth occurrence of this component character in the traditional variant,
			// where N = which occurrence it is in the simplified character's component list.
			const occurrenceIndex = components
				.slice(0, i)
				.filter((c) => c.character === comp.character).length;

			let tradIndex = -1;
			let seen = 0;
			for (let j = 0; j < tradComponents.length; j++) {
				if (tradComponents[j].character === comp.character) {
					if (seen === occurrenceIndex) {
						tradIndex = j;
						break;
					}
					seen++;
				}
			}

			if (tradIndex === -1 || !tradFragments[tradIndex]?.length) continue;

			result[i] = {
				character: tradRow.character,
				strokes: tradStrokeData.strokes,
				highlightedStrokeIndices: tradFragments[tradIndex]
			};
			break;
		}
	}

	return Object.keys(result).length > 0 ? result : null;
}

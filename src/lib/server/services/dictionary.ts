import { db } from '$lib/server/db';
import { charBase } from '$lib/server/db/dictionary.schema';
import { eq, inArray } from 'drizzle-orm';
import type { CharacterData, ComponentData, HistoricalPronunciation } from '$lib/types/dictionary';

/**
 * Look up a single character's data from dictionary.char_base.
 * Later this will read from dictionary.char (with manual overrides layered on top).
 */
export async function getCharacterData(char: string): Promise<CharacterData | null> {
	const rows = await db.select().from(charBase).where(eq(charBase.character, char)).limit(1);

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
				character: charBase.character,
				pinyin: charBase.pinyin,
				gloss: charBase.gloss,
				historicalPronunciations: charBase.historicalPronunciations
			})
			.from(charBase)
			.where(inArray(charBase.character, compChars));

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

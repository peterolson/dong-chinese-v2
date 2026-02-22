import { db } from '$lib/server/db';
import { charView } from '$lib/server/db/dictionary.views';
import { eq, inArray } from 'drizzle-orm';
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

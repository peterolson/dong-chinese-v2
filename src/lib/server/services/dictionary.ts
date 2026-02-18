import { db } from '$lib/server/db';
import { charBase } from '$lib/server/db/dictionary.schema';
import { eq } from 'drizzle-orm';
import type { CharacterData } from '$lib/types/dictionary';

/**
 * Look up a single character's data from dictionary.char_base.
 * Later this will read from dictionary.char (with manual overrides layered on top).
 */
export async function getCharacterData(char: string): Promise<CharacterData | null> {
	const rows = await db.select().from(charBase).where(eq(charBase.character, char)).limit(1);

	if (rows.length === 0) return null;

	const row = rows[0];
	return {
		character: row.character,
		codepoint: row.codepoint,
		gloss: row.gloss,
		hint: row.hint,
		originalMeaning: row.originalMeaning,
		strokeCount: row.strokeCount,
		isVerified: row.isVerified,
		components: row.components as CharacterData['components'],
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
		strokeData: row.strokeData as CharacterData['strokeData'],
		historicalImages: row.historicalImages as CharacterData['historicalImages'],
		historicalPronunciations:
			row.historicalPronunciations as CharacterData['historicalPronunciations'],
		shuowenExplanation: row.shuowenExplanation,
		shuowenPronunciation: row.shuowenPronunciation,
		shuowenPinyin: row.shuowenPinyin,
		pinyinFrequencies: row.pinyinFrequencies as CharacterData['pinyinFrequencies']
	};
}

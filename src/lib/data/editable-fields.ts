/**
 * Single source of truth for form-editable character fields.
 * Used by char-edit service (submit/approve), field-diff component, and route pages.
 */
export const EDITABLE_FIELDS = [
	'gloss',
	'hint',
	'originalMeaning',
	'isVerified',
	'pinyin',
	'simplifiedVariants',
	'traditionalVariants',
	'components',
	'strokeCountSimp',
	'strokeCountTrad',
	'strokeDataSimp',
	'strokeDataTrad',
	'fragmentsSimp',
	'fragmentsTrad',
	'historicalImages',
	'historicalPronunciations',
	'customSources'
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

/** Pick only the fields that edits can touch (no frequency, shuowen, etc.) */
export function pickEditableFields(row: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const field of EDITABLE_FIELDS) {
		result[field] = row[field as keyof typeof row] ?? null;
	}
	return result;
}

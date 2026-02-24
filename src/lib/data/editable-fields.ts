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

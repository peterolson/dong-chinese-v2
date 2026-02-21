/** Maps component types to CSS custom property references (defined in global.css) */
const componentColorMap: Record<string, string> = {
	meaning: 'var(--comp-meaning)',
	sound: 'var(--comp-sound)',
	iconic: 'var(--comp-iconic)',
	simplified: 'var(--comp-simplified)',
	unknown: 'var(--comp-unknown)',
	remnant: 'var(--comp-remnant)',
	distinguishing: 'var(--comp-distinguishing)',
	deleted: 'var(--comp-deleted)'
};

/** Maps component types to human-readable labels */
export const componentTitles: Record<string, string> = {
	meaning: 'Meaning',
	sound: 'Sound',
	iconic: 'Iconic',
	unknown: 'Unknown',
	simplified: 'Simplified',
	deleted: 'Deleted',
	remnant: 'Remnant',
	distinguishing: 'Distinguishing'
};

export function getComponentColor(type: string | undefined): string {
	return componentColorMap[type ?? 'unknown'] ?? componentColorMap.unknown;
}

/**
 * Returns a color adjusted for the Nth same-type component.
 * Uses CSS relative colors in OKLCH (perceptually uniform) space:
 * subtle hue rotation + slight darkening per duplicate.
 */
export function getAdjustedComponentColor(type: string | undefined, sameTypeIndex: number): string {
	const base = getComponentColor(type);
	const resolvedType = type ?? 'unknown';
	if (sameTypeIndex === 0 || resolvedType === 'deleted') return base;
	const hueShift = sameTypeIndex * 6;
	const darken = sameTypeIndex * 0.05;
	return `oklch(from ${base} calc(l - ${darken}) c calc(h + ${hueShift}))`;
}

export function getComponentTitle(type: string): string {
	return componentTitles[type] ?? type;
}

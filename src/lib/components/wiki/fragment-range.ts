/**
 * Converts a 0-indexed array of stroke indices to a human-readable 1-indexed range string.
 * e.g. [0,1,2] → "1-3", [0,2,3,5] → "1,3-4,6", [] → ""
 */
export function formatFragmentRange(indices: number[]): string {
	if (!indices || indices.length === 0) return '';

	const sorted = [...new Set(indices)].sort((a, b) => a - b);
	const ranges: string[] = [];
	let start = sorted[0];
	let end = sorted[0];

	for (let i = 1; i < sorted.length; i++) {
		if (sorted[i] === end + 1) {
			end = sorted[i];
		} else {
			ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);
			start = sorted[i];
			end = sorted[i];
		}
	}
	ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`);

	return ranges.join(',');
}

/**
 * Parses a 1-indexed range string into a sorted 0-indexed array of stroke indices.
 * Supports: single numbers ("3"), closed ranges ("2-6"), open-ended ranges ("7-").
 * e.g. "1-3,6" → [0,1,2,5], "7-" with strokeCount=10 → [6,7,8,9]
 */
export function parseFragmentRange(range: string, strokeCount: number): number[] {
	if (!range || !range.trim()) return [];

	const indices = new Set<number>();
	const tokens = range.split(',');

	for (const token of tokens) {
		const trimmed = token.trim();
		if (!trimmed) continue;

		if (trimmed.includes('-')) {
			const parts = trimmed.split('-');
			const startStr = parts[0].trim();
			const endStr = parts[1].trim();

			const start = parseInt(startStr, 10);
			if (isNaN(start)) continue;

			// Open-ended range: "7-" means from 7 to the last stroke
			const end = endStr === '' ? strokeCount : parseInt(endStr, 10);
			if (isNaN(end)) continue;

			const lo = Math.max(1, Math.min(start, end));
			const hi = Math.min(strokeCount, Math.max(start, end));
			for (let i = lo; i <= hi; i++) {
				indices.add(i - 1); // convert 1-indexed → 0-indexed
			}
		} else {
			const n = parseInt(trimmed, 10);
			if (isNaN(n)) continue;
			if (n >= 1 && n <= strokeCount) {
				indices.add(n - 1);
			}
		}
	}

	return [...indices].sort((a, b) => a - b);
}

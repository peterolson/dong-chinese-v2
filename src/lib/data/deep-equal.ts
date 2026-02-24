/**
 * Deep equality and change-detection utilities.
 * Extracted from field-diff.svelte for server-side reuse.
 */

import type { EditableField } from './editable-fields';

/** Normalize "empty-ish" values so false, null, undefined, "", and [] all compare equal */
export function normalize(val: unknown): unknown {
	if (val == null) return null;
	if (val === false) return null;
	if (val === '') return null;
	if (Array.isArray(val) && val.length === 0) return null;
	return val;
}

export function deepEqual(a: unknown, b: unknown): boolean {
	const na = normalize(a);
	const nb = normalize(b);
	if (na === nb) return true;
	if (na == null && nb == null) return true;
	if (na == null || nb == null) return false;
	if (typeof na !== typeof nb) return false;
	if (Array.isArray(na) && Array.isArray(nb)) {
		if (na.length !== nb.length) return false;
		return na.every((item, i) => deepEqual(item, nb[i]));
	}
	if (typeof na === 'object' && typeof nb === 'object') {
		const aObj = na as Record<string, unknown>;
		const bObj = nb as Record<string, unknown>;
		const keys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);
		for (const key of keys) {
			if (!deepEqual(aObj[key], bObj[key])) return false;
		}
		return true;
	}
	return false;
}

/**
 * Compare submitted data against current state and return the list of fields
 * that actually changed. Only checks the specified editable fields.
 */
export function computeChangedFields(
	current: Record<string, unknown>,
	submitted: Record<string, unknown>,
	fields: readonly EditableField[]
): EditableField[] {
	const changed: EditableField[] = [];
	for (const field of fields) {
		if (!deepEqual(current[field] ?? null, submitted[field] ?? null)) {
			changed.push(field);
		}
	}
	return changed;
}

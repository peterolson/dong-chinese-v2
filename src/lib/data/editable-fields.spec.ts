import { describe, expect, it } from 'vitest';
import { EDITABLE_FIELDS, pickEditableFields } from './editable-fields';

describe('EDITABLE_FIELDS', () => {
	it('is a non-empty readonly array of strings', () => {
		expect(EDITABLE_FIELDS.length).toBeGreaterThan(0);
		for (const field of EDITABLE_FIELDS) {
			expect(typeof field).toBe('string');
		}
	});
});

describe('pickEditableFields', () => {
	it('picks only editable fields from a row', () => {
		const row: Record<string, unknown> = {
			gloss: 'water',
			hint: 'liquid',
			junDaRank: 42,
			shuowenExplanation: 'ancient meaning'
		};

		const result = pickEditableFields(row);

		expect(result.gloss).toBe('water');
		expect(result.hint).toBe('liquid');
		expect(result).not.toHaveProperty('junDaRank');
		expect(result).not.toHaveProperty('shuowenExplanation');
	});

	it('defaults missing fields to null', () => {
		const result = pickEditableFields({});

		for (const field of EDITABLE_FIELDS) {
			expect(result[field]).toBeNull();
		}
	});

	it('preserves all editable field values', () => {
		const row: Record<string, unknown> = {};
		for (const field of EDITABLE_FIELDS) {
			row[field] = `value-${field}`;
		}

		const result = pickEditableFields(row);

		for (const field of EDITABLE_FIELDS) {
			expect(result[field]).toBe(`value-${field}`);
		}
	});

	it('returns exactly the editable fields', () => {
		const row: Record<string, unknown> = { gloss: 'test', extraField: 'ignored' };
		const result = pickEditableFields(row);

		const keys = Object.keys(result);
		expect(keys).toEqual([...EDITABLE_FIELDS]);
	});
});

import type { PageServerLoad } from './$types';
import { getRecentEdits } from '$lib/server/services/char-edit';
import { resolveUserNames } from '$lib/server/services/user';
import { db } from '$lib/server/db';
import { charBase } from '$lib/server/db/dictionary.schema';
import { inArray, sql } from 'drizzle-orm';
import { EDITABLE_FIELDS } from '$lib/data/editable-fields';

const PAGE_SIZE = 50;

function pickEditableFields(row: Record<string, unknown>) {
	const result: Record<string, unknown> = {};
	for (const field of EDITABLE_FIELDS) {
		result[field] = row[field as keyof typeof row] ?? null;
	}
	return result;
}

export const load: PageServerLoad = async ({ url }) => {
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
	const offset = (pageNum - 1) * PAGE_SIZE;

	const { edits, total } = await getRecentEdits({ limit: PAGE_SIZE, offset });

	// Resolve editor and reviewer names
	const userIds = [
		...edits.map((e) => e.editedBy).filter((id): id is string => id != null),
		...edits.map((e) => e.reviewedBy).filter((id): id is string => id != null)
	];
	const nameMap = await resolveUserNames(userIds);

	const items = edits.map((edit) => ({
		id: edit.id,
		character: edit.character,
		status: edit.status,
		editComment: edit.editComment,
		editorName: edit.editedBy ? (nameMap.get(edit.editedBy) ?? 'Unknown') : 'Anonymous',
		reviewerName: edit.reviewedBy ? (nameMap.get(edit.reviewedBy) ?? 'Unknown') : null,
		reviewComment: edit.reviewComment,
		createdAt: edit.createdAt.toISOString(),
		reviewedAt: edit.reviewedAt?.toISOString() ?? null,
		changedFields: edit.changedFields,
		...pickEditableFields(edit as unknown as Record<string, unknown>)
	}));

	// Build per-edit baselines keyed by edit ID
	const baselineMap: Record<string, Record<string, unknown>> = {};

	if (edits.length > 0) {
		// Step A: Among the displayed edits, later edits for the same character use earlier edits
		// as baselines. Group by character, sort chronologically (oldest first).
		const byChar = new Map<string, typeof edits>();
		for (const edit of edits) {
			const arr = byChar.get(edit.character) ?? [];
			arr.push(edit);
			byChar.set(edit.character, arr);
		}

		// Track which edits still need a predecessor from the DB
		const needsPredecessor: { id: string; character: string; createdAt: Date }[] = [];

		for (const [, charEdits] of byChar) {
			// Sort chronologically (oldest first) to wire up predecessors
			const sorted = [...charEdits].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
			for (let i = 0; i < sorted.length; i++) {
				if (i > 0) {
					// Use the preceding same-character edit on this page as baseline
					baselineMap[sorted[i].id] = pickEditableFields(
						sorted[i - 1] as unknown as Record<string, unknown>
					);
				} else {
					// Oldest edit for this character on this page — need DB lookup
					needsPredecessor.push({
						id: sorted[i].id,
						character: sorted[i].character,
						createdAt: sorted[i].createdAt
					});
				}
			}
		}

		// Step B: Batch-load predecessors from DB using lateral join
		if (needsPredecessor.length > 0) {
			const values = needsPredecessor
				.map(
					(e) =>
						sql`(${e.id}::uuid, ${e.character}::text, ${e.createdAt.toISOString()}::timestamptz)`
				)
				.reduce((acc, val) => sql`${acc}, ${val}`);

			const predecessorRows = await db.execute<{
				edit_id: string;
				[key: string]: unknown;
			}>(sql`
				SELECT t.edit_id, prev.*
				FROM (VALUES ${values}) AS t(edit_id, character, created_at)
				LEFT JOIN LATERAL (
					SELECT * FROM dictionary.char_manual p
					WHERE p.character = t.character
						AND p.status = 'approved'
						AND p.created_at < t.created_at
					ORDER BY p.created_at DESC LIMIT 1
				) prev ON true
			`);

			// Map predecessor rows into baselineMap
			const predecessorMap = new Map<string, Record<string, unknown>>();
			for (const row of predecessorRows) {
				if (row.edit_id && row.character != null) {
					predecessorMap.set(
						row.edit_id,
						pickEditableFields(row as unknown as Record<string, unknown>)
					);
				}
			}

			// Step C: For edits without a predecessor (first edit ever), fall back to char_base
			const needsCharBase: string[] = [];
			for (const entry of needsPredecessor) {
				if (predecessorMap.has(entry.id)) {
					baselineMap[entry.id] = predecessorMap.get(entry.id)!;
				} else {
					needsCharBase.push(entry.character);
				}
			}

			if (needsCharBase.length > 0) {
				const uniqueCharsForBase = [...new Set(needsCharBase)];
				const baseRows = await db
					.select()
					.from(charBase)
					.where(inArray(charBase.character, uniqueCharsForBase));
				const baseMap = new Map<string, Record<string, unknown>>();
				for (const row of baseRows) {
					baseMap.set(row.character, pickEditableFields(row as unknown as Record<string, unknown>));
				}
				for (const entry of needsPredecessor) {
					if (!baselineMap[entry.id] && baseMap.has(entry.character)) {
						baselineMap[entry.id] = baseMap.get(entry.character)!;
					}
				}
			}
		}
	}

	return {
		items,
		baselineMap,
		total,
		pageNum,
		pageSize: PAGE_SIZE,
		totalPages: Math.ceil(total / PAGE_SIZE)
	};
};

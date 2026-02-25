import type { PageServerLoad } from './$types';
import { getRecentEdits } from '$lib/server/services/char-edit';
import { resolveUserNames } from '$lib/server/services/user';
import { charView } from '$lib/server/db/dictionary.views';
import { db } from '$lib/server/db';
import { inArray } from 'drizzle-orm';
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

	// Batch-load current char view data for all unique characters (baseline for diffs)
	const uniqueChars = [...new Set(edits.map((e) => e.character))];
	const charViewRows =
		uniqueChars.length > 0
			? await db.select().from(charView).where(inArray(charView.character, uniqueChars))
			: [];
	const charBaseDataMap: Record<string, Record<string, unknown>> = {};
	for (const row of charViewRows) {
		charBaseDataMap[row.character] = pickEditableFields(row as unknown as Record<string, unknown>);
	}

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

	return {
		items,
		charBaseDataMap,
		total,
		pageNum,
		pageSize: PAGE_SIZE,
		totalPages: Math.ceil(total / PAGE_SIZE)
	};
};

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getCharEditHistory,
	getCharManualById,
	submitCharEdit
} from '$lib/server/services/char-edit';
import { hasPermission } from '$lib/server/services/permissions';
import { resolveUserNames } from '$lib/server/services/user';
import { db } from '$lib/server/db';
import { charBase } from '$lib/server/db/dictionary.schema';
import { charView } from '$lib/server/db/dictionary.views';
import { eq } from 'drizzle-orm';
import { EDITABLE_FIELDS } from '$lib/data/editable-fields';

const PAGE_SIZE = 50;

/** Pick only the fields that edits can touch (no frequency, shuowen, etc.) */
function pickEditableFields(row: Record<string, unknown>) {
	const result: Record<string, unknown> = {};
	for (const field of EDITABLE_FIELDS) {
		result[field] = row[field as keyof typeof row] ?? null;
	}
	return result;
}

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const char = params.character;
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
	const offset = (pageNum - 1) * PAGE_SIZE;

	const [{ edits, total }, baseRow, charViewRow] = await Promise.all([
		getCharEditHistory(char, { limit: PAGE_SIZE, offset }),
		db
			.select()
			.from(charBase)
			.where(eq(charBase.character, char))
			.then((rows) => rows[0]),
		db
			.select()
			.from(charView)
			.where(eq(charView.character, char))
			.then((rows) => rows[0])
	]);
	const { canReview } = await parent();

	// Resolve user names
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
		reviewComment: edit.reviewComment,
		editorName: edit.editedBy ? (nameMap.get(edit.editedBy) ?? 'Unknown') : 'Anonymous',
		reviewerName: edit.reviewedBy ? (nameMap.get(edit.reviewedBy) ?? 'Unknown') : null,
		createdAt: edit.createdAt.toISOString(),
		reviewedAt: edit.reviewedAt?.toISOString() ?? null,
		changedFields: edit.changedFields,
		// Include editable fields for diff display
		...pickEditableFields(edit as unknown as Record<string, unknown>)
	}));

	// Use char view as baseline for diffs (current effective state)
	const charBaseDataMap: Record<string, Record<string, unknown>> = {};
	if (charViewRow) {
		charBaseDataMap[char] = pickEditableFields(charViewRow as unknown as Record<string, unknown>);
	} else if (baseRow) {
		charBaseDataMap[char] = pickEditableFields(baseRow as unknown as Record<string, unknown>);
	}

	const totalPages = Math.ceil(total / PAGE_SIZE);

	return {
		edits: items,
		charBaseDataMap,
		canReview,
		pageNum,
		totalPages,
		total
	};
};

export const actions: Actions = {
	rollback: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Login required' });

		const canReview = await hasPermission(locals.user.id, 'wikiEdit');
		if (!canReview) return fail(403, { error: 'wikiEdit permission required' });

		const formData = await request.formData();
		const editId = formData.get('editId')?.toString();
		const comment = formData.get('rollbackComment')?.toString()?.trim();

		if (!editId) return fail(400, { error: 'Missing editId' });
		if (!comment) return fail(400, { error: 'Rollback comment is required' });

		const targetEdit = await getCharManualById(editId);
		if (!targetEdit) return fail(404, { error: 'Edit not found' });
		if (targetEdit.character !== params.character) {
			return fail(400, { error: 'Edit does not belong to this character' });
		}
		if (targetEdit.status !== 'approved') {
			return fail(400, { error: 'Can only rollback to approved edits' });
		}

		// Copy data columns from the target edit
		const {
			id: _id,
			character,
			changedFields: _changedFields,
			status: _status,
			reviewedBy: _reviewedBy,
			reviewedAt: _reviewedAt,
			reviewComment: _reviewComment,
			editedBy: _editedBy,
			anonymousSessionId: _anonymousSessionId,
			editComment: _editComment,
			createdAt: _createdAt,
			...dataColumns
		} = targetEdit;

		try {
			await submitCharEdit({
				character,
				data: dataColumns,
				editedBy: { userId: locals.user.id },
				editComment: `[Rollback] ${comment}`,
				autoApprove: true
			});
		} catch (err) {
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to rollback'
			});
		}

		redirect(303, `/wiki/${encodeURIComponent(character)}/history`);
	}
};

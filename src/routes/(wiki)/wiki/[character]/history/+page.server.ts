import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getCharEditHistory,
	getCharManualById,
	submitCharEdit,
	approveCharEdit,
	rejectCharEdit,
	CharEditError
} from '$lib/server/services/char-edit';
import { hasPermission } from '$lib/server/services/permissions';
import { resolveUserNames } from '$lib/server/services/user';
import { db } from '$lib/server/db';
import { charBase } from '$lib/server/db/dictionary.schema';
import { eq } from 'drizzle-orm';
import { pickEditableFields } from '$lib/data/editable-fields';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ params, parent, url }) => {
	const char = params.character;
	const pageNum = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
	const offset = (pageNum - 1) * PAGE_SIZE;

	// Fetch one extra edit beyond the page to use as baseline for the oldest edit
	const [{ edits: allEdits, total }, baseRow] = await Promise.all([
		getCharEditHistory(char, { limit: PAGE_SIZE + 1, offset }),
		db
			.select()
			.from(charBase)
			.where(eq(charBase.character, char))
			.then((rows) => rows[0])
	]);
	const { canReview } = await parent();

	// Separate the display edits from the extra predecessor
	const edits = allEdits.slice(0, PAGE_SIZE);
	const predecessorEdit = allEdits.length > PAGE_SIZE ? allEdits[PAGE_SIZE] : null;

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

	// Build per-edit baselines: each edit's baseline is the preceding edit (or char_base for the oldest)
	// Edits are ordered newest-first, so edit[i]'s predecessor is edit[i+1]
	const baselineMap: Record<string, Record<string, unknown>> = {};
	const baseFields = baseRow
		? pickEditableFields(baseRow as unknown as Record<string, unknown>)
		: null;
	for (let i = 0; i < edits.length; i++) {
		let prev;
		if (i < edits.length - 1) {
			prev = edits[i + 1];
		} else if (predecessorEdit) {
			// Oldest edit on this page: use the fetched predecessor from the next page
			prev = predecessorEdit;
		} else {
			prev = baseRow ?? null;
		}
		if (prev) {
			baselineMap[edits[i].id] = pickEditableFields(prev as unknown as Record<string, unknown>);
		} else if (baseFields) {
			baselineMap[edits[i].id] = baseFields;
		}
	}

	const totalPages = Math.ceil(total / PAGE_SIZE);

	return {
		edits: items,
		baselineMap,
		canReview,
		pageNum,
		totalPages,
		total
	};
};

export const actions: Actions = {
	approveEdit: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Login required' });

		const canReview = await hasPermission(locals.user.id, 'wikiEdit');
		if (!canReview) return fail(403, { error: 'wikiEdit permission required' });

		const formData = await request.formData();
		const editId = formData.get('editId')?.toString();
		if (!editId) return fail(400, { error: 'Missing editId' });

		try {
			const approved = await approveCharEdit(editId, locals.user.id);
			if (!approved) return fail(404, { error: 'Edit not found or already reviewed' });
		} catch (err) {
			if (err instanceof CharEditError && err.code === 'INVALID_VARIANT_OF') {
				return fail(400, { error: err.message });
			}
			throw err;
		}

		return { approved: true };
	},

	rejectEdit: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Login required' });

		const canReview = await hasPermission(locals.user.id, 'wikiEdit');
		if (!canReview) return fail(403, { error: 'wikiEdit permission required' });

		const formData = await request.formData();
		const editId = formData.get('editId')?.toString();
		const rejectComment = formData.get('rejectComment')?.toString()?.trim();

		if (!editId) return fail(400, { error: 'Missing editId' });
		if (!rejectComment) return fail(400, { error: 'Rejection comment is required' });

		const rejected = await rejectCharEdit(editId, locals.user.id, rejectComment);
		if (!rejected) return fail(404, { error: 'Edit not found or already reviewed' });

		return { rejected: true };
	},

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

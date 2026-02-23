import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getCharEditHistory,
	getCharManualById,
	submitCharEdit
} from '$lib/server/services/char-edit';
import { hasPermission } from '$lib/server/services/permissions';
import { resolveUserNames } from '$lib/server/services/user';

export const load: PageServerLoad = async ({ params, parent }) => {
	const char = params.character;

	const edits = await getCharEditHistory(char);
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
		// Include editable fields for diff display
		gloss: edit.gloss,
		hint: edit.hint,
		originalMeaning: edit.originalMeaning,
		isVerified: edit.isVerified,
		pinyin: edit.pinyin,
		components: edit.components,
		simplifiedVariants: edit.simplifiedVariants,
		traditionalVariants: edit.traditionalVariants
	}));

	return {
		edits: items,
		canReview
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

		// Copy data columns from the target edit
		const {
			id: _id,
			character,
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

			redirect(303, `/wiki/${character}/history`);
		} catch (err) {
			return fail(500, {
				error: err instanceof Error ? err.message : 'Failed to rollback'
			});
		}
	}
};

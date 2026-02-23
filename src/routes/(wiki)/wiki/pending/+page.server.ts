import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getPendingEdits, approveCharEdit, rejectCharEdit } from '$lib/server/services/char-edit';
import { hasPermission } from '$lib/server/services/permissions';
import { resolveUserNames } from '$lib/server/services/user';

export const load: PageServerLoad = async ({ parent }) => {
	const { canReview, user } = await parent();

	if (!canReview) {
		redirect(303, '/wiki');
	}

	const edits = await getPendingEdits();

	// Resolve editor names
	const userIds = edits.map((e) => e.editedBy).filter((id): id is string => id != null);
	const nameMap = await resolveUserNames(userIds);

	const items = edits.map((edit) => ({
		id: edit.id,
		character: edit.character,
		editComment: edit.editComment,
		editorName: edit.editedBy ? (nameMap.get(edit.editedBy) ?? 'Unknown') : 'Anonymous',
		createdAt: edit.createdAt.toISOString(),
		// Include editable fields for diff
		gloss: edit.gloss,
		hint: edit.hint,
		originalMeaning: edit.originalMeaning,
		isVerified: edit.isVerified,
		pinyin: edit.pinyin,
		components: edit.components,
		simplifiedVariants: edit.simplifiedVariants,
		traditionalVariants: edit.traditionalVariants,
		customSources: edit.customSources,
		strokeDataSimp: edit.strokeDataSimp,
		strokeDataTrad: edit.strokeDataTrad,
		strokeCountSimp: edit.strokeCountSimp,
		strokeCountTrad: edit.strokeCountTrad,
		fragmentsSimp: edit.fragmentsSimp,
		fragmentsTrad: edit.fragmentsTrad,
		historicalImages: edit.historicalImages,
		historicalPronunciations: edit.historicalPronunciations
	}));

	return { items };
};

export const actions: Actions = {
	approve: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Login required' });

		const canReview = await hasPermission(locals.user.id, 'wikiEdit');
		if (!canReview) return fail(403, { error: 'wikiEdit permission required' });

		const formData = await request.formData();
		const editId = formData.get('editId')?.toString();
		const reviewComment = formData.get('reviewComment')?.toString()?.trim() || undefined;

		if (!editId) return fail(400, { error: 'Missing editId' });

		const approved = await approveCharEdit(editId, locals.user.id, reviewComment);
		if (!approved) return fail(404, { error: 'Edit not found or already reviewed' });

		return { approved: true, editId };
	},

	reject: async ({ request, locals }) => {
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

		return { rejected: true, editId };
	}
};

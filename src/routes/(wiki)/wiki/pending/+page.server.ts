import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	getPendingEdits,
	getUserPendingEdits,
	approveCharEdit,
	rejectCharEdit
} from '$lib/server/services/char-edit';
import { hasPermission } from '$lib/server/services/permissions';
import { resolveUserNames } from '$lib/server/services/user';
import { charView } from '$lib/server/db/dictionary.views';
import { db } from '$lib/server/db';
import { inArray } from 'drizzle-orm';
import { EDITABLE_FIELDS } from '$lib/data/editable-fields';

function pickEditableFields(row: Record<string, unknown>) {
	const result: Record<string, unknown> = {};
	for (const field of EDITABLE_FIELDS) {
		result[field] = row[field as keyof typeof row] ?? null;
	}
	return result;
}

export const load: PageServerLoad = async ({ parent, locals }) => {
	const { canReview } = await parent();

	// Reviewers see all pending edits; non-reviewers see only their own
	const editedBy = {
		userId: locals.user?.id,
		anonymousSessionId: locals.anonymousSessionId
	};
	const edits = canReview ? await getPendingEdits() : await getUserPendingEdits(editedBy);

	// Resolve editor names
	const userIds = edits.map((e) => e.editedBy).filter((id): id is string => id != null);
	const nameMap = await resolveUserNames(userIds);

	// Batch-load current char view data for all unique characters
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
		status: 'pending' as const,
		editComment: edit.editComment,
		editorName: edit.editedBy ? (nameMap.get(edit.editedBy) ?? 'Unknown') : 'Anonymous',
		reviewerName: null,
		reviewComment: null,
		reviewedAt: null,
		createdAt: edit.createdAt.toISOString(),
		changedFields: edit.changedFields,
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

	return { items, charBaseDataMap, canReview };
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

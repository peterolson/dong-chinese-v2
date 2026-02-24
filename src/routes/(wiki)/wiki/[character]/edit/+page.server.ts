import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	submitCharEdit,
	getPendingEdits,
	approveCharEdit,
	rejectCharEdit,
	CharEditError
} from '$lib/server/services/char-edit';
import { hasPermission } from '$lib/server/services/permissions';
import { resolveUserNames } from '$lib/server/services/user';

export const load: PageServerLoad = async ({ params, parent }) => {
	const char = params.character;
	const { canReview } = await parent();

	// Load pending edits for this character
	const pendingEdits = await getPendingEdits(char);
	const userIds = [
		...pendingEdits.map((e) => e.editedBy).filter((id): id is string => id != null),
		...pendingEdits.map((e) => e.reviewedBy).filter((id): id is string => id != null)
	];
	const nameMap = await resolveUserNames(userIds);

	const pendingItems = pendingEdits.map((edit) => ({
		id: edit.id,
		editComment: edit.editComment,
		editorName: edit.editedBy ? (nameMap.get(edit.editedBy) ?? 'Unknown') : 'Anonymous',
		createdAt: edit.createdAt.toISOString(),
		changedFields: edit.changedFields
	}));

	return { canReview, pendingEdits: pendingItems };
};

function safeJsonParse(value: string | null): unknown {
	if (!value || value === 'null' || value === 'undefined') return null;
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

/** Only allow http(s) and safe relative URLs — blocks javascript:, data:, etc. */
function isSafeUrl(url: string): boolean {
	return /^https?:\/\//.test(url) || (url.startsWith('/') && !url.startsWith('//'));
}

/** Sanitize customSources: strip entries with unsafe URLs. */
function sanitizeCustomSources(raw: unknown): string[] | null {
	if (!Array.isArray(raw)) return null;
	const safe = raw.filter((entry): entry is string => {
		if (typeof entry !== 'string') return false;
		const pipeIdx = entry.indexOf('|');
		if (pipeIdx === -1) return true; // plain text, no URL
		const url = entry.substring(pipeIdx + 1);
		return isSafeUrl(url);
	});
	return safe.length > 0 ? safe : null;
}

export const actions: Actions = {
	submitEdit: async ({ request, params, locals }) => {
		const char = params.character;
		const formData = await request.formData();
		const editComment = formData.get('editComment')?.toString().trim() ?? '';

		if (!editComment) {
			return fail(400, { error: 'Edit comment is required' });
		}

		const userId = locals.user?.id;
		const anonymousSessionId = locals.anonymousSessionId;

		if (!userId && !anonymousSessionId) {
			return fail(400, { error: 'You must be logged in or have an anonymous session' });
		}

		const canReview = userId ? await hasPermission(userId, 'wikiEdit') : false;

		// Build the edit data from form fields
		const data = {
			gloss: formData.get('gloss')?.toString() || null,
			hint: formData.get('hint')?.toString() || null,
			originalMeaning: formData.get('originalMeaning')?.toString() || null,
			isVerified: formData.has('isVerified'),
			pinyin: safeJsonParse(formData.get('pinyin')?.toString() ?? null) as string[] | null,
			simplifiedVariants: safeJsonParse(formData.get('simplifiedVariants')?.toString() ?? null) as
				| string[]
				| null,
			traditionalVariants: safeJsonParse(
				formData.get('traditionalVariants')?.toString() ?? null
			) as string[] | null,
			components: safeJsonParse(formData.get('components')?.toString() ?? null),
			strokeCountSimp: parseInt(formData.get('strokeCountSimp')?.toString() ?? '') || null,
			strokeCountTrad: parseInt(formData.get('strokeCountTrad')?.toString() ?? '') || null,
			strokeDataSimp: safeJsonParse(formData.get('strokeDataSimp')?.toString() ?? null),
			strokeDataTrad: safeJsonParse(formData.get('strokeDataTrad')?.toString() ?? null),
			fragmentsSimp: safeJsonParse(formData.get('fragmentsSimp')?.toString() ?? null),
			fragmentsTrad: safeJsonParse(formData.get('fragmentsTrad')?.toString() ?? null),
			historicalPronunciations: safeJsonParse(
				formData.get('historicalPronunciations')?.toString() ?? null
			),
			customSources: sanitizeCustomSources(
				safeJsonParse(formData.get('customSources')?.toString() ?? null)
			)
		};

		let editResult;
		try {
			editResult = await submitCharEdit({
				character: char,
				data,
				editedBy: { userId, anonymousSessionId },
				editComment,
				autoApprove: canReview
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to submit edit';
			const status = err instanceof CharEditError && err.code === 'NO_FIELDS_CHANGED' ? 400 : 500;
			return fail(status, { error: message });
		}

		redirect(303, `/wiki/${encodeURIComponent(char)}?edited=${editResult.status}`);
	},

	approveEdit: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'Login required' });

		const canReview = await hasPermission(locals.user.id, 'wikiEdit');
		if (!canReview) return fail(403, { error: 'wikiEdit permission required' });

		const formData = await request.formData();
		const editId = formData.get('editId')?.toString();
		if (!editId) return fail(400, { error: 'Missing editId' });

		const approved = await approveCharEdit(editId, locals.user.id);
		if (!approved) return fail(404, { error: 'Edit not found or already reviewed' });

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
	}
};

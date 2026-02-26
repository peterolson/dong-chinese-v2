import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import {
	submitCharEdit,
	getUserPendingEdit,
	updateCharEdit,
	CharEditError
} from '$lib/server/services/char-edit';
import { hasPermission } from '$lib/server/services/permissions';

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

		// Build the edit data from form fields.
		const data = {
			gloss: formData.get('gloss')?.toString()?.trim() ?? null,
			hint: formData.get('hint')?.toString()?.trim() ?? null,
			originalMeaning: formData.get('originalMeaning')?.toString()?.trim() ?? null,
			variantOf: formData.get('variantOf')?.toString()?.trim() || null,
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

		const editedBy = { userId, anonymousSessionId };

		// Check for existing pending edit — update in-place if found
		const existingPending = await getUserPendingEdit(char, editedBy);

		let editResult;
		try {
			if (existingPending) {
				// Try to update the existing pending edit
				const updated = await updateCharEdit({
					editId: existingPending.id,
					character: char,
					data,
					editComment
				});
				if (updated) {
					editResult = updated;
				} else {
					// Race condition: edit was approved/rejected between load and submit
					// Fall back to creating a new edit
					editResult = await submitCharEdit({
						character: char,
						data,
						editedBy,
						editComment,
						autoApprove: canReview
					});
				}
			} else {
				editResult = await submitCharEdit({
					character: char,
					data,
					editedBy,
					editComment,
					autoApprove: canReview
				});
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to submit edit';
			const status = err instanceof CharEditError && err.code === 'NO_FIELDS_CHANGED' ? 400 : 500;
			return fail(status, { error: message });
		}

		redirect(303, `/wiki/${encodeURIComponent(char)}?edited=${editResult.status}`);
	}
};

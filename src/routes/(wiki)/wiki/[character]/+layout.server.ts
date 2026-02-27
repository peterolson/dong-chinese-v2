import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import {
	getCharacterData,
	getComponentUses,
	getDeletedComponentGlyphs
} from '$lib/server/services/dictionary';
import { countPendingEdits, getUserPendingEdit } from '$lib/server/services/char-edit';
import { EDITABLE_FIELDS } from '$lib/data/editable-fields';

export const load: LayoutServerLoad = async ({ params, parent, locals }) => {
	const char = params.character;
	const chars = [...char];

	if (chars.length !== 1) {
		error(404, { message: 'Wiki entries are for single characters only' });
	}

	const [data, componentUses] = await Promise.all([
		getCharacterData(chars[0]),
		getComponentUses(chars[0])
	]);

	if (!data) {
		error(404, { message: `Character "${char}" not found in dictionary` });
	}

	const { canReview } = await parent();

	const hasIdentity = Boolean(locals.user?.id || locals.anonymousSessionId);
	const editedBy = hasIdentity
		? { userId: locals.user?.id, anonymousSessionId: locals.anonymousSessionId }
		: undefined;

	// Run pending-edit queries and deleted-component lookup in parallel
	const [pendingCount, pendingEdit, deletedComponentGlyphs] = await Promise.all([
		canReview
			? countPendingEdits(chars[0])
			: hasIdentity
				? countPendingEdits(chars[0], editedBy)
				: Promise.resolve(0),
		hasIdentity ? getUserPendingEdit(chars[0], editedBy!) : Promise.resolve(null),
		getDeletedComponentGlyphs(data)
	]);

	// Serialize only editable fields + metadata for the pending edit
	const userPendingEdit = pendingEdit
		? {
				id: pendingEdit.id,
				editComment: pendingEdit.editComment,
				changedFields: pendingEdit.changedFields,
				...(Object.fromEntries(
					EDITABLE_FIELDS.map((f) => [
						f,
						(pendingEdit as unknown as Record<string, unknown>)[f] ?? null
					])
				) as Record<string, unknown>)
			}
		: null;

	return { character: data, componentUses, deletedComponentGlyphs, pendingCount, userPendingEdit };
};

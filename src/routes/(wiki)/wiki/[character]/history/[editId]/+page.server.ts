import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCharManualById } from '$lib/server/services/char-edit';
import { getCharacterData } from '$lib/server/services/dictionary';
import { resolveUserNames } from '$lib/server/services/user';
import { EDITABLE_FIELDS } from '$lib/data/editable-fields';
import type { CharacterData } from '$lib/types/dictionary';

export const load: PageServerLoad = async ({ params }) => {
	const { character: charParam, editId } = params;
	const char = [...charParam][0];

	const edit = await getCharManualById(editId);
	if (!edit || edit.character !== char) {
		error(404, { message: 'Edit not found' });
	}

	// Load current base data
	const baseData = await getCharacterData(char);
	if (!baseData) {
		error(404, { message: `Character "${char}" not found in dictionary` });
	}

	// Build snapshot: overlay edit's changed fields onto current base
	const snapshot = { ...baseData } as CharacterData;
	const changedSet = new Set(edit.changedFields ?? EDITABLE_FIELDS);
	const editRecord = edit as unknown as Record<string, unknown>;
	for (const field of EDITABLE_FIELDS) {
		if (changedSet.has(field)) {
			(snapshot as unknown as Record<string, unknown>)[field] = editRecord[field];
		}
	}

	// Resolve editor/reviewer names
	const userIds = [edit.editedBy, edit.reviewedBy].filter((id): id is string => id != null);
	const nameMap = await resolveUserNames(userIds);

	const editMeta = {
		id: edit.id,
		status: edit.status,
		editComment: edit.editComment,
		reviewComment: edit.reviewComment,
		editorName: edit.editedBy ? (nameMap.get(edit.editedBy) ?? 'Unknown') : 'Anonymous',
		reviewerName: edit.reviewedBy ? (nameMap.get(edit.reviewedBy) ?? 'Unknown') : null,
		createdAt: edit.createdAt.toISOString(),
		reviewedAt: edit.reviewedAt?.toISOString() ?? null,
		changedFields: edit.changedFields
	};

	return { snapshot, editMeta };
};

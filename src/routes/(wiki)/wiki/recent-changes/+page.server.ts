import type { PageServerLoad } from './$types';
import { getRecentEdits } from '$lib/server/services/char-edit';
import { resolveUserNames } from '$lib/server/services/user';

const PAGE_SIZE = 50;

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

	const items = edits.map((edit) => ({
		id: edit.id,
		character: edit.character,
		status: edit.status,
		editComment: edit.editComment,
		editorName: edit.editedBy ? (nameMap.get(edit.editedBy) ?? 'Unknown') : 'Anonymous',
		reviewerName: edit.reviewedBy ? (nameMap.get(edit.reviewedBy) ?? 'Unknown') : null,
		reviewComment: edit.reviewComment,
		createdAt: edit.createdAt.toISOString(),
		reviewedAt: edit.reviewedAt?.toISOString() ?? null
	}));

	return {
		items,
		total,
		pageNum,
		pageSize: PAGE_SIZE,
		totalPages: Math.ceil(total / PAGE_SIZE)
	};
};

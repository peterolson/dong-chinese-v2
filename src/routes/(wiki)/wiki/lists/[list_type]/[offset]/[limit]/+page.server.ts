import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCharacterList, LIST_TYPES, type ListType } from '$lib/server/services/dictionary';

export const load: PageServerLoad = async ({ params }) => {
	const listType = params.list_type;

	if (!(listType in LIST_TYPES)) {
		error(404, { message: `Unknown list type: "${listType}"` });
	}

	const offset = parseInt(params.offset, 10);
	const limit = parseInt(params.limit, 10);

	if (isNaN(offset) || offset < 0) {
		error(400, { message: 'Invalid offset' });
	}
	if (isNaN(limit) || limit < 1 || limit > 500) {
		error(400, { message: 'Invalid limit (must be 1-500)' });
	}

	const validType = listType as ListType;
	const { items, total } = await getCharacterList(validType, offset, limit);

	return {
		listType: validType,
		listLabel: LIST_TYPES[validType].label,
		items,
		total,
		offset,
		limit
	};
};

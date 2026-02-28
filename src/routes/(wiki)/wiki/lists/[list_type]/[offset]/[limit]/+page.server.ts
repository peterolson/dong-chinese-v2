import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	getCharacterList,
	LIST_NAV_ITEMS,
	LIST_TYPES,
	type ListType
} from '$lib/server/services/dictionary';

export const load: PageServerLoad = async ({ params, url }) => {
	const listType = params.list_type;

	if (!(listType in LIST_TYPES)) {
		error(404, { message: `Unknown list type: "${listType}"` });
	}

	const limit = parseInt(params.limit, 10);

	if (isNaN(limit) || limit < 1 || limit > 500) {
		error(400, { message: 'Invalid limit (must be 1-500)' });
	}

	const pageParam = url.searchParams.get('page');
	if (pageParam) {
		const page = parseInt(pageParam, 10);
		if (!isNaN(page) && page >= 1) {
			const pageOffset = (page - 1) * limit;
			redirect(302, `/wiki/lists/${listType}/${pageOffset}/${limit}`);
		}
	}

	const offset = parseInt(params.offset, 10);

	if (isNaN(offset) || offset < 0) {
		error(400, { message: 'Invalid offset' });
	}

	const validType = listType as ListType;
	const { items, total } = await getCharacterList(validType, offset, limit);

	return {
		listType: validType,
		listLabel: LIST_TYPES[validType].label,
		listDescription: LIST_TYPES[validType].description,
		allLists: LIST_NAV_ITEMS.map((item) => ({
			slug: item.slug,
			navLabel: item.navLabel,
			href: item.href(limit)
		})),
		items,
		total,
		offset,
		limit
	};
};

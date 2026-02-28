import type { PageServerLoad } from './$types';
import { getComponentTypeCombinations, LIST_NAV_ITEMS } from '$lib/server/services/dictionary';

export const load: PageServerLoad = async () => {
	const { combinations, totalCharacters } = await getComponentTypeCombinations();

	return {
		combinations,
		totalCharacters,
		allLists: LIST_NAV_ITEMS.map((item) => ({
			slug: item.slug,
			navLabel: item.navLabel,
			href: item.href(100)
		})),
		currentSlug: 'component-types'
	};
};

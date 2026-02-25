import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const viewParam = url.searchParams.get('view');
	const showDraft = viewParam === 'draft';

	return { showDraft };
};

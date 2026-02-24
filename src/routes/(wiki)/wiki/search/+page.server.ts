import type { PageServerLoad } from './$types';
import { searchCharacters } from '$lib/server/services/dictionary';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';

	if (!q) {
		return { q, results: [] };
	}

	const results = await searchCharacters(q, 100);

	return { q, results };
};

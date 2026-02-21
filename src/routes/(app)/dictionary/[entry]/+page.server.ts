import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCharacterData } from '$lib/server/services/dictionary';

export const load: PageServerLoad = async ({ params }) => {
	const entry = params.entry;
	const chars = [...entry];

	// Single character → character view
	if (chars.length === 1) {
		const data = await getCharacterData(chars[0]);
		if (!data) {
			error(404, { message: `Character "${entry}" not found in dictionary` });
		}
		return { type: 'character' as const, character: data };
	}

	// Multi-character → future word view (not yet implemented)
	error(404, { message: `Word lookup not yet implemented for "${entry}"` });
};

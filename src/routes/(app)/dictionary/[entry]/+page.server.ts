import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCharacterData, getComponentUses } from '$lib/server/services/dictionary';

export const load: PageServerLoad = async ({ params }) => {
	const entry = params.entry;
	const chars = [...entry];

	// Single character → character view
	if (chars.length === 1) {
		const [data, componentUses] = await Promise.all([
			getCharacterData(chars[0]),
			getComponentUses(chars[0])
		]);
		if (!data) {
			error(404, { message: `Character "${entry}" not found in dictionary` });
		}
		return { type: 'character' as const, character: data, componentUses };
	}

	// Multi-character → future word view (not yet implemented)
	error(404, { message: `Word lookup not yet implemented for "${entry}"` });
};

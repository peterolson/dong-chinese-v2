import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { getCharacterData } from '$lib/server/services/dictionary';
import { countPendingEdits } from '$lib/server/services/char-edit';

export const load: LayoutServerLoad = async ({ params }) => {
	const char = params.character;
	const chars = [...char];

	if (chars.length !== 1) {
		error(404, { message: 'Wiki entries are for single characters only' });
	}

	const data = await getCharacterData(chars[0]);
	if (!data) {
		error(404, { message: `Character "${char}" not found in dictionary` });
	}

	const pendingCount = await countPendingEdits(chars[0]);

	return { character: data, pendingCount };
};

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCharacterData } from '$lib/server/services/dictionary';
import { exampleChars, validTypes } from '$lib/data/component-type-info';
import type { CharacterData } from '$lib/types/dictionary';

export const load: PageServerLoad = async ({ params }) => {
	const { type } = params;

	if (!validTypes.has(type)) {
		error(404, { message: `Unknown component type "${type}"` });
	}

	const charList = exampleChars[type];
	const unique = [...new Set(charList)];

	const results = await Promise.all(
		unique.map(async (char) => {
			const data = await getCharacterData(char);
			return [char, data] as const;
		})
	);

	const characters: Record<string, CharacterData> = {};
	for (const [char, data] of results) {
		if (data) characters[char] = data;
	}

	return { type, characters };
};

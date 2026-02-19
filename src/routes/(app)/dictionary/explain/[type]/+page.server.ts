import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCharacterData } from '$lib/server/services/dictionary';
import type { CharacterData } from '$lib/types/dictionary';

const exampleChars: Record<string, string[]> = {
	meaning: ['妈', '媽', '女', '问', '問', '口', '想', '心', '错', '錯', '金'],
	sound: ['妈', '媽', '马', '馬', '问', '問', '门', '門', '想', '相', '他', '也'],
	iconic: ['林', '木', '旦', '日', '有', '又'],
	unknown: ['是', '止'],
	simplified: ['难', '難', '点', '點', '还', '還'],
	deleted: ['开', '開'],
	remnant: ['孝', '老'],
	distinguishing: ['王', '玉']
};

const validTypes = new Set(Object.keys(exampleChars));

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

export const initials: Record<string, string> = {
	b: 'ㄅ',
	p: 'ㄆ',
	m: 'ㄇ',
	f: 'ㄈ',
	d: 'ㄉ',
	t: 'ㄊ',
	n: 'ㄋ',
	l: 'ㄌ',
	g: 'ㄍ',
	k: 'ㄎ',
	h: 'ㄏ',
	j: 'ㄐ',
	q: 'ㄑ',
	x: 'ㄒ',
	zh: 'ㄓ',
	ch: 'ㄔ',
	sh: 'ㄕ',
	r: 'ㄖ',
	z: 'ㄗ',
	c: 'ㄘ',
	s: 'ㄙ'
};

export const finals: Record<string, string> = {
	a: 'ㄚ',
	o: 'ㄛ',
	e: 'ㄜ',
	ai: 'ㄞ',
	ei: 'ㄟ',
	ao: 'ㄠ',
	ou: 'ㄡ',
	an: 'ㄢ',
	ang: 'ㄤ',
	en: 'ㄣ',
	eng: 'ㄥ',
	er: 'ㄦ',
	u: 'ㄨ',
	ua: 'ㄨㄚ',
	uo: 'ㄨㄛ',
	uai: 'ㄨㄞ',
	ui: 'ㄨㄟ',
	uan: 'ㄨㄢ',
	uang: 'ㄨㄤ',
	un: 'ㄨㄣ',
	ueng: 'ㄨㄥ',
	ong: 'ㄨㄥ',
	i: 'ㄧ',
	ia: 'ㄧㄚ',
	ie: 'ㄧㄝ',
	iao: 'ㄧㄠ',
	iu: 'ㄧㄡ',
	ian: 'ㄧㄢ',
	iang: 'ㄧㄤ',
	in: 'ㄧㄣ',
	ing: 'ㄧㄥ',
	ü: 'ㄩ',
	üe: 'ㄩㄝ',
	ue: 'ㄩㄝ',
	üan: 'ㄩㄢ',
	ün: 'ㄩㄣ',
	iong: 'ㄩㄥ'
};

export const individuals: Record<string, string> = {
	zhi: 'ㄓ',
	chi: 'ㄔ',
	shi: 'ㄕ',
	ri: 'ㄖ',
	zi: 'ㄗ',
	ci: 'ㄘ',
	si: 'ㄙ',
	a: 'ㄚ',
	o: 'ㄛ',
	e: 'ㄜ',
	ai: 'ㄞ',
	ei: 'ㄟ',
	ao: 'ㄠ',
	ou: 'ㄡ',
	an: 'ㄢ',
	ang: 'ㄤ',
	en: 'ㄣ',
	eng: 'ㄥ',
	er: 'ㄦ',
	r: 'ㄦ',
	wu: 'ㄨ',
	wa: 'ㄨㄚ',
	wo: 'ㄨㄛ',
	wai: 'ㄨㄞ',
	wei: 'ㄨㄟ',
	wan: 'ㄨㄢ',
	wang: 'ㄨㄤ',
	wen: 'ㄨㄣ',
	weng: 'ㄨㄥ',
	yi: 'ㄧ',
	ya: 'ㄧㄚ',
	ye: 'ㄧㄝ',
	yao: 'ㄧㄠ',
	you: 'ㄧㄡ',
	yan: 'ㄧㄢ',
	yang: 'ㄧㄤ',
	yin: 'ㄧㄣ',
	ying: 'ㄧㄥ',
	yu: 'ㄩ',
	yue: 'ㄩㄝ',
	yuan: 'ㄩㄢ',
	yun: 'ㄩㄣ',
	yong: 'ㄩㄥ'
};

export const toneMap: Record<string, string> = {
	ā: 'a1',
	á: 'a2',
	ǎ: 'a3',
	à: 'a4',
	ē: 'e1',
	é: 'e2',
	ě: 'e3',
	è: 'e4',
	ī: 'i1',
	í: 'i2',
	ǐ: 'i3',
	ì: 'i4',
	ō: 'o1',
	ó: 'o2',
	ǒ: 'o3',
	ò: 'o4',
	ū: 'u1',
	ú: 'u2',
	ǔ: 'u3',
	ù: 'u4',
	ǖ: 'ü1',
	ǘ: 'ü2',
	ǚ: 'ü3',
	ǜ: 'ü4'
};

export interface Token {
	start: number;
	type?: 'pinyin' | 'other';
	init?: string;
	final?: string;
	tone?: number;
	indiv?: string;
	parse?: string[];
	zhuyin?: string;
}

const findAccentedChars = (text: string): Record<number, string> => {
	const accentsFound: Record<number, string> = {};
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		const lowerChar = char.toLowerCase();
		if (toneMap[lowerChar]) {
			accentsFound[i] = char === lowerChar ? toneMap[lowerChar] : toneMap[lowerChar].toUpperCase();
		}
	}
	return accentsFound;
};

const removeAccents = (accentedChars: Record<number, string>, text: string): string =>
	[...text].map((char, i) => (i in accentedChars ? accentedChars[i][0] : char)).join('');

const getKeys = <T extends object>(obj: T): (keyof T)[] => Object.keys(obj) as (keyof T)[];

const findBetween = (list: number[], min: number, max: number): number =>
	list.find((i) => i >= min && i <= max) ?? -1;

const toLower = (x: string | undefined): string | undefined => x?.toLowerCase();

const lenComp = (a: string, b: string): number => b.length - a.length;

const individualRexp = new RegExp(`^(${getKeys(individuals).sort(lenComp).join('|')})(\\d)?`, 'i');

const initialFinalRexp = new RegExp(
	`^(${getKeys(initials).sort(lenComp).join('|')})(${getKeys(finals).sort(lenComp).join('|')})(\\d)?`,
	'i'
);

export function tokenizePinyin(pinyinText: string): Token[] {
	if (!pinyinText) return [];

	const accentedChars = findAccentedChars(pinyinText);
	const sortedAccentedIndicies = Object.keys(accentedChars)
		.map(Number)
		.sort((a, b) => a - b);
	const text = removeAccents(accentedChars, pinyinText);

	const parseToken = (i: number): Token => {
		const token: Token = { start: i };
		let match: RegExpMatchArray | null;

		match = text.slice(i).match(initialFinalRexp);
		if (match) {
			const [, init, fin, toneDigit] = match.map(toLower);
			token.type = 'pinyin';
			token.zhuyin = initials[init!] + finals[fin!];
			token.tone = toneDigit
				? parseInt(toneDigit, 10)
				: parseInt(
						accentedChars[findBetween(sortedAccentedIndicies, i, i + match[0].length)]?.[1] ?? '5'
					);
			token.init = init;
			token.final = fin;
			token.parse = match;
			return token;
		}

		match = text.slice(i).match(individualRexp);
		if (match) {
			const [, indiv, toneDigit] = match.map(toLower);
			token.type = 'pinyin';
			token.indiv = indiv;
			token.zhuyin = individuals[indiv!];
			token.tone = toneDigit
				? parseInt(toneDigit, 10)
				: parseInt(
						accentedChars[findBetween(sortedAccentedIndicies, i, i + match[0].length)]?.[1] ?? '5'
					);
			token.parse = match;
			return token;
		}

		token.type = 'other';
		token.parse = [text[i]];
		return token;
	};

	const tokens: Token[] = [];
	for (let i = 0; i < text.length; ) {
		const token = parseToken(i);
		tokens.push(token);
		i += token.parse?.[0].length ?? 1;
	}

	return tokens;
}

import { tokenizePinyin } from './tokenize';

export const initials: Record<string, string> = {
	b: 'б',
	p: 'п',
	m: 'м',
	f: 'ф',
	d: 'д',
	t: 'т',
	n: 'н',
	l: 'л',
	g: 'г',
	k: 'к',
	h: 'х',
	j: 'цз',
	q: 'ц',
	x: 'с',
	zh: 'чж',
	ch: 'ч',
	sh: 'ш',
	r: 'ж',
	z: 'цз',
	c: 'ц',
	s: 'с'
};

export const finals: Record<string, string> = {
	a: 'а',
	o: 'о',
	e: 'э',
	ai: 'ай',
	ei: 'эй',
	ao: 'аo',
	ou: 'оу',
	an: 'ань',
	ang: 'ан',
	en: 'энь',
	eng: 'эн',
	er: 'эр',
	u: 'у',
	ua: 'уа',
	uo: 'о',
	uai: 'уай',
	ui: 'уй',
	uan: 'уань',
	uang: 'уан',
	un: 'унь',
	ueng: 'ун',
	ong: 'ун',
	i: 'и',
	ia: 'я',
	ie: 'е',
	iao: 'яо',
	iu: 'ю',
	ian: 'янь',
	iang: 'ян',
	in: 'инь',
	ing: 'ин',
	ü: 'юй',
	üe: 'юэ',
	ue: 'юэ',
	üan: 'юань',
	ün: 'юнь',
	iong: 'юн'
};

export const individuals: Record<string, string> = {
	zhi: 'чжи',
	chi: 'чи',
	shi: 'ши',
	ri: 'жи',
	zi: 'цзы',
	ci: 'цы',
	si: 'сы',
	a: 'а',
	o: 'о',
	e: 'э',
	ai: 'ай',
	ei: 'эй',
	ao: 'ао',
	ou: 'оу',
	an: 'ань',
	ang: 'ан',
	en: 'энь',
	eng: 'эн',
	er: 'эр',
	r: 'эр',
	wu: 'у',
	wa: 'ва',
	wo: 'во',
	wai: 'вай',
	wei: 'вэй',
	wan: 'вань',
	wang: 'ван',
	wen: 'вэнь',
	weng: 'вэн',
	yi: 'и',
	ya: 'я',
	ye: 'е',
	yao: 'яо',
	you: 'ю',
	yan: 'янь',
	yang: 'ян',
	yin: 'инь',
	ying: 'ин',
	yu: 'юй',
	yue: 'юэ',
	yuan: 'юань',
	yun: 'юнь',
	yong: 'юн'
};

const toneDiacritics: Record<number, string> = {
	1: '\u0304', // macron (ˉ) for first tone
	2: '\u0301', // acute accent (ˊ) for second tone
	3: '\u030C', // caron (ˇ) for third tone
	4: '\u0300' // grave accent (ˋ) for fourth tone
};

const vowelLetters = new Set('аеёиоуыэюя'.split(''));

function addTone(syllable: string, tone: number): string {
	if (tone < 1 || tone > 4) {
		return syllable;
	}
	const diacritic = toneDiacritics[tone];
	const addDiacritic = (vowel: string): string | null => {
		const index = syllable.indexOf(vowel);
		if (index < 0) return null;
		return syllable.slice(0, index) + vowel + diacritic + syllable.slice(index + 1);
	};
	let lastVowelIndex = -1;
	for (let i = syllable.length - 1; i >= 0; i--) {
		if (vowelLetters.has(syllable[i])) {
			lastVowelIndex = i;
			break;
		}
	}
	if (lastVowelIndex === -1) {
		return syllable;
	}
	return (
		addDiacritic('\u044F') ||
		addDiacritic('\u044B') ||
		addDiacritic('\u0430') ||
		addDiacritic('\u0435') ||
		addDiacritic('\u0451') ||
		addDiacritic('\u044D') ||
		addDiacritic('\u043E') ||
		addDiacritic('\u044E') ||
		syllable.slice(0, lastVowelIndex) +
		syllable[lastVowelIndex] +
		diacritic +
		syllable.slice(lastVowelIndex + 1)
	);
}

export function pinyinToCyrillic(pinyinText: string): string {
	const tokens = tokenizePinyin(pinyinText);
	return tokens
		.map((token) => {
			const { init, final: fin, tone, indiv, type, parse } = token;
			if (type === 'other') {
				return parse?.join('') ?? '';
			}
			if (init && init in initials) {
				if (fin && fin in finals) {
					return addTone(`${initials[init]}${finals[fin]}`, tone ?? 0);
				}
			}
			if (indiv && indiv in individuals) {
				return addTone(individuals[indiv], tone ?? 0);
			}
			return parse?.join('') ?? '';
		})
		.join('');
}

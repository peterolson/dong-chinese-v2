import { tokenizePinyin } from './tokenize';

const initials: Record<string, string> = {
	m: 'm',
	n: 'n',
	b: 'p',
	p: 'p\u02BB',
	d: 't',
	t: 't\u02BB',
	g: 'k',
	k: 'k\u02BB',
	z: 'ts',
	c: 'ts\u02BB',
	zh: 'ch',
	ch: 'ch\u02BB',
	j: 'ch',
	q: 'ch\u02BB',
	f: 'f',
	s: 's',
	sh: 'sh',
	x: 'hs',
	h: 'h',
	l: 'l',
	r: 'j'
};

const finals: Record<string, string> = {
	a: 'a',
	o: 'o',
	e: '\u00EA',
	ai: 'ai',
	ei: 'ei',
	ao: 'ao',
	ou: 'ou',
	an: 'an',
	ang: 'ang',
	en: '\u00EAn',
	eng: '\u00EAng',
	er: '\u00EArh',
	u: 'u',
	ua: 'ua',
	uo: 'o',
	uai: 'uai',
	ui: 'uei',
	uan: 'uan',
	uang: 'uang',
	un: 'un',
	ueng: 'u\u00EAng',
	ong: 'ung',
	i: 'i',
	ia: 'ia',
	ie: 'ieh',
	iao: 'iao',
	iu: 'iu',
	ian: 'ien',
	iang: 'iang',
	in: 'ien',
	ing: 'ing',
	'\u00FC': '\u00FC',
	'\u00FCe': '\u00FCeh',
	ue: '\u00FCeh',
	'\u00FCan': '\u00FCan',
	'\u00FCn': '\u00FCn',
	iong: 'iung'
};

const individuals: Record<string, string> = {
	zhi: 'chih',
	chi: 'ch\u02BBih',
	shi: 'shih',
	ri: 'jih',
	zi: 'tz\u016D',
	ci: 'tz\u02BB\u016D',
	si: 'ss\u016D',
	a: 'a',
	o: 'o',
	e: '\u00EA',
	ai: 'ai',
	ei: 'ei',
	ao: 'ao',
	ou: 'ou',
	an: 'an',
	ang: 'ang',
	en: '\u00EAn',
	eng: '\u00EAng',
	er: '\u00EArh',
	r: '\u00EArh',
	wu: 'wu',
	wa: 'wa',
	wo: 'wo',
	wai: 'wai',
	wei: 'wei',
	wan: 'wan',
	wang: 'wang',
	wen: 'w\u00EAn',
	weng: 'w\u00EAng',
	yi: 'yi',
	ya: 'ya',
	ye: 'yeh',
	yao: 'yao',
	you: 'yu',
	yan: 'yen',
	yang: 'yang',
	yin: 'yin',
	ying: 'ying',
	yu: 'y\u00FC',
	yue: 'y\u00FCeh',
	yuan: 'y\u00FCan',
	yun: 'y\u00FCn',
	yong: 'yung'
};

const initialReplacements: Record<string, string> = {
	z: 'tz',
	c: 'tz\u02BB',
	s: 'ss'
};

const toneNumberToSymbol: Record<number, string> = {
	0: '',
	1: '\u00B9',
	2: '\u00B2',
	3: '\u00B3',
	4: '\u2074',
	5: ''
};

export function pinyinToWadeGiles(pinyinText: string): string {
	const tokens = tokenizePinyin(pinyinText);
	return tokens
		.map((token) => {
			const { init, final: fin, tone, indiv, type, parse } = token;
			if (type === 'other') {
				const text = parse?.join('') ?? '';
				if (text === '\u200b') return '-';
				return text;
			}
			const toneSymbol = toneNumberToSymbol[tone ?? 0];
			if (init && init in initials) {
				if (fin && fin in finals) {
					if (fin.startsWith('\u00FC') && init in initialReplacements) {
						return `${initialReplacements[init]}${fin}${toneSymbol}`;
					}
					if (fin === 'e' && ['g', 'k', 'h'].includes(init)) {
						return `${initials[init]}o${toneSymbol}`;
					}
					if (fin === 'uo' && ['g', 'k', 'h'].includes(init)) {
						return `${initials[init]}uo${toneSymbol}`;
					}
					return `${initials[init]}${finals[fin]}${toneSymbol}`;
				}
			}
			if (indiv && indiv in individuals) {
				return individuals[indiv] + toneSymbol;
			}
			return parse?.join('') ?? '';
		})
		.join('');
}

import { tokenizePinyin } from './tokenize';

const initials: Record<string, string> = {
	b: 'b',
	p: 'p',
	m: 'm',
	f: 'f',
	d: 'd',
	t: 't',
	n: 'n',
	l: 'l',
	g: 'g',
	k: 'k',
	h: 'h',
	j: 'ji',
	q: 'chi',
	x: 'shi',
	zh: 'j',
	ch: 'ch',
	sh: 'sh',
	r: 'r',
	z: 'tz',
	c: 'ts',
	s: 's'
};

const finals: Record<string, [string, string, string, string]> = {
	a: ['a', 'ar', 'aa', 'ah'],
	o: ['ou', 'our', 'oou', 'ow'],
	e: ['e', 'er', 'ee', 'eh'],
	ai: ['ai', 'air', 'ae', 'ay'],
	ei: ['ei', 'eir', 'eei', 'ey'],
	ao: ['au', 'aur', 'ao', 'aw'],
	ou: ['ou', 'our', 'oou', 'ow'],
	an: ['an', 'arn', 'aan', 'ann'],
	ang: ['ang', 'arng', 'aang', 'anq'],
	en: ['en', 'ern', 'een', 'enn'],
	eng: ['eng', 'erng', 'eeng', 'enq'],
	er: ['el', 'erl', 'eel', 'ell'],
	u: ['u', 'wu', 'uu', 'uh'],
	ua: ['ua', 'wa', 'oa', 'uah'],
	uo: ['uo', 'wo', 'uoo', 'uoh'],
	uai: ['uai', 'wai', 'oai', 'uay'],
	ui: ['uei', 'wei', 'oei', 'uey'],
	uan: ['uan', 'wan', 'oan', 'uann'],
	uang: ['uang', 'wang', 'oang', 'uanq'],
	un: ['uen', 'wen', 'oen', 'uenn'],
	ueng: ['ueng', 'weng', 'oeng', 'uenw'],
	ong: ['ong', 'orng', 'oong', 'onq'],
	i: ['i', 'yi', 'ii', 'ih'],
	ia: ['ia', 'ya', 'ea', 'iah'],
	ie: ['ie', 'ye', 'iee', 'ieh'],
	iao: ['iau', 'yau', 'eau', 'iaw'],
	iu: ['iou', 'you', 'eou', 'iow'],
	ian: ['ian', 'yan', 'ean', 'iann'],
	iang: ['iang', 'yang', 'eang', 'ianq'],
	in: ['in', 'yn', 'iin', 'inn'],
	ing: ['ing', 'yng', 'iing', 'inq'],
	'\u00FC': ['iu', 'yu', 'eu', 'iuh'],
	'\u00FCe': ['iue', 'yue', 'eue', 'iueh'],
	ue: ['iue', 'yue', 'eue', 'iueh'],
	'\u00FCan': ['iuan', 'yuan', 'euan', 'iuann'],
	'\u00FCn': ['iun', 'yun', 'eun', 'iunn'],
	iong: ['iong', 'yong', 'eong', 'ionq']
};

const individuals: Record<string, string[]> = {
	zhi: ['jy', 'jyr', 'jyy', 'jyh'],
	chi: ['chy', 'chyr', 'chyy', 'chyh'],
	shi: ['shy', 'shyr', 'shyy', 'shyh'],
	ri: ['ry', 'ryr', 'ryy', 'ryh'],
	zi: ['tzy', 'tzyr', 'tzyy', 'tzyh'],
	ci: ['tsy', 'tsyr', 'tsyy', 'tsyh'],
	si: ['sy', 'syr', 'syy', 'syh'],
	a: ['a', 'ar', 'aa', 'ah'],
	o: ['ou', 'our', 'oou', 'ow'],
	e: ['e', 'er', 'ee', 'eh'],
	ai: ['ai', 'air', 'ae', 'ay'],
	ei: ['ei', 'eir', 'eei', 'ey'],
	ao: ['au', 'aur', 'ao', 'aw'],
	ou: ['ou', 'our', 'oou', 'ow'],
	an: ['an', 'arn', 'aan', 'ann'],
	ang: ['ang', 'arng', 'aang', 'anq'],
	en: ['en', 'ern', 'een', 'enn'],
	eng: ['eng', 'erng', 'eeng', 'enq'],
	er: ['el', 'erl', 'eel', 'ell'],
	r: ['el', 'erl', 'eel', 'ell'],
	wu: ['u', 'wu', 'wuu', 'wuh'],
	wa: ['ua', 'wa', 'woa', 'wah'],
	wo: ['uo', 'wo', 'woo', 'woh'],
	wai: ['uai', 'wai', 'woai', 'way'],
	wei: ['uei', 'wei', 'woei', 'wey'],
	wan: ['uan', 'wan', 'woan', 'wann'],
	wang: ['uang', 'wang', 'woang', 'wanq'],
	wen: ['uen', 'wen', 'woen', 'wenn'],
	weng: ['ueng', 'werng', 'weeng', 'wenq'],
	yi: ['i', 'yi', 'yii', 'yih'],
	ya: ['ia', 'ya', 'yea', 'yah'],
	ye: ['ie', 'ye', 'yee', 'yeh'],
	yao: ['iau', 'yau', 'yeau', 'yaw'],
	you: ['iou', 'you', 'yeou', 'yow'],
	yan: ['ian', 'yan', 'yean', 'yann'],
	yang: ['iang', 'yang', 'yeang', 'yanq'],
	yin: ['in', 'yn', 'yiin', 'yinn'],
	ying: ['ing', 'yng', 'yiing', 'yinq'],
	yu: ['iu', 'yu', 'yeu', 'yuh'],
	yue: ['iue', 'yue', 'yeue', 'yueh'],
	yuan: ['iuan', 'yuan', 'yeuan', 'yuann'],
	yun: ['iun', 'yun', 'yeun', 'yunn'],
	yong: ['iong', 'yong', 'yeong', 'yonq']
};

export function pinyinToGwoyeu(pinyinText: string): string {
	const tokens = tokenizePinyin(pinyinText);
	return tokens
		.map((token) => {
			const { init, final: fin, tone, indiv, type, parse } = token;
			if (type === 'other') {
				return parse?.join('') ?? '';
			}
			let t = tone ?? 1;
			let prefix = '';
			if (tone === 0 || tone === 5) {
				t = 1;
				prefix = '\u02CC';
			}
			if (init && init in initials) {
				if (fin && fin in finals) {
					return `${prefix}${initials[init]}${finals[fin][t - 1]}`;
				}
			}
			if (indiv && indiv in individuals) {
				return `${prefix}${individuals[indiv][t - 1]}`;
			}
			return parse?.join('') ?? '';
		})
		.join('');
}

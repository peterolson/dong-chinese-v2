import { tokenizePinyin } from './tokenize';

const toneNumberToSymbol: Record<number, string> = {
	0: '˙',
	1: '',
	2: 'ˊ',
	3: 'ˇ',
	4: 'ˋ',
	5: '˙'
};

export function pinyinToZhuyin(pinyinText: string): string {
	const tokens = tokenizePinyin(pinyinText);
	if (tokens.length === 0) return '';
	return tokens
		.map((token) => {
			if (token.type === 'other') return token.parse?.join('') ?? '';
			return (token.zhuyin ?? '') + toneNumberToSymbol[token.tone ?? 5];
		})
		.join('')
		.replace(/ㄐㄨ/g, 'ㄐㄩ')
		.replace(/ㄑㄨ/g, 'ㄑㄩ')
		.replace(/ㄒㄨ/g, 'ㄒㄩ')
		.replace(/ㄓㄧ/g, 'ㄓ')
		.replace(/ㄔㄧ/g, 'ㄔ')
		.replace(/ㄕㄧ/g, 'ㄕ')
		.replace(/ㄖㄧ/g, 'ㄖ')
		.replace(/ㄗㄧ/g, 'ㄗ')
		.replace(/ㄘㄧ/g, 'ㄘ')
		.replace(/ㄙㄧ/g, 'ㄙ')
		.replace(/\u200B'/g, '');
}

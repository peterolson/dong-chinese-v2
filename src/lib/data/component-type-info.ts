export type Chars = [string] | [string, string];

export interface ExPair {
	l: Chars;
	lp: string;
	lg: string;
	r: Chars;
	rp: string;
	rg: string;
}

export interface TypeInfo {
	leftHead: string;
	rightHead: string;
	leftMono: boolean;
	rightMono: boolean;
	leftSpeak: boolean;
	rightSpeak: boolean;
	pairs: ExPair[];
}

export const colorNames: Record<string, string> = {
	meaning: 'red',
	sound: 'blue',
	iconic: 'green',
	simplified: 'teal',
	unknown: 'gray',
	remnant: 'orange',
	distinguishing: 'purple',
	deleted: 'light gray'
};

export const typeInfo: Record<string, TypeInfo> = {
	meaning: {
		leftHead: 'Character',
		rightHead: 'Meaning component',
		leftMono: false,
		rightMono: true,
		leftSpeak: false,
		rightSpeak: false,
		pairs: [
			{ l: ['妈', '媽'], lp: 'mā', lg: 'mother', r: ['女'], rp: 'nǚ', rg: 'woman' },
			{ l: ['问', '問'], lp: 'wèn', lg: 'to ask', r: ['口'], rp: 'kǒu', rg: 'mouth' },
			{ l: ['想'], lp: 'xiǎng', lg: 'to think', r: ['心'], rp: 'xīn', rg: 'heart' },
			{ l: ['错', '錯'], lp: 'cuò', lg: 'wrong', r: ['金'], rp: 'jīn', rg: 'metal' }
		]
	},
	sound: {
		leftHead: 'Character',
		rightHead: 'Sound component',
		leftMono: false,
		rightMono: true,
		leftSpeak: true,
		rightSpeak: true,
		pairs: [
			{
				l: ['妈', '媽'],
				lp: 'mā',
				lg: 'mother',
				r: ['马', '馬'],
				rp: 'mǎ',
				rg: 'horse'
			},
			{
				l: ['问', '問'],
				lp: 'wèn',
				lg: 'to ask',
				r: ['门', '門'],
				rp: 'mén',
				rg: 'door'
			},
			{
				l: ['想'],
				lp: 'xiǎng',
				lg: 'to think',
				r: ['相'],
				rp: 'xiāng',
				rg: 'mutual'
			},
			{ l: ['他'], lp: 'tā', lg: 'he', r: ['也'], rp: 'yě', rg: 'also' }
		]
	},
	iconic: {
		leftHead: 'Character',
		rightHead: 'Based on',
		leftMono: false,
		rightMono: true,
		leftSpeak: false,
		rightSpeak: false,
		pairs: [
			{ l: ['林'], lp: 'lín', lg: 'forest', r: ['木'], rp: 'mù', rg: 'tree (×2)' },
			{
				l: ['旦'],
				lp: 'dàn',
				lg: 'dawn',
				r: ['日'],
				rp: 'rì',
				rg: 'sun above horizon'
			},
			{
				l: ['有'],
				lp: 'yǒu',
				lg: 'to have',
				r: ['又'],
				rp: 'yòu',
				rg: 'hand + meat'
			}
		]
	},
	unknown: {
		leftHead: 'Character',
		rightHead: 'Components',
		leftMono: false,
		rightMono: true,
		leftSpeak: false,
		rightSpeak: false,
		pairs: []
	},
	simplified: {
		leftHead: 'Traditional',
		rightHead: 'Simplified',
		leftMono: false,
		rightMono: false,
		leftSpeak: false,
		rightSpeak: false,
		pairs: [
			{ l: ['難'], lp: 'nán', lg: 'difficult', r: ['难'], rp: 'nán', rg: 'difficult' },
			{ l: ['點'], lp: 'diǎn', lg: 'point', r: ['点'], rp: 'diǎn', rg: 'point' },
			{ l: ['還'], lp: 'hái', lg: 'still', r: ['还'], rp: 'hái', rg: 'still' }
		]
	},
	deleted: {
		leftHead: 'Traditional',
		rightHead: 'Simplified',
		leftMono: false,
		rightMono: false,
		leftSpeak: false,
		rightSpeak: false,
		pairs: [{ l: ['開'], lp: 'kāi', lg: 'to open', r: ['开'], rp: 'kāi', rg: 'to open' }]
	},
	remnant: {
		leftHead: 'Character',
		rightHead: 'Original form',
		leftMono: false,
		rightMono: true,
		leftSpeak: true,
		rightSpeak: true,
		pairs: [
			{
				l: ['孝'],
				lp: 'xiào',
				lg: 'filial piety',
				r: ['老'],
				rp: 'lǎo',
				rg: 'old'
			}
		]
	},
	distinguishing: {
		leftHead: 'Character',
		rightHead: 'Distinguished from',
		leftMono: false,
		rightMono: false,
		leftSpeak: true,
		rightSpeak: true,
		pairs: [{ l: ['玉'], lp: 'yù', lg: 'jade', r: ['王'], rp: 'wáng', rg: 'king' }]
	}
};

export const exampleChars: Record<string, string[]> = {
	meaning: ['妈', '媽', '女', '问', '問', '口', '想', '心', '错', '錯', '金'],
	sound: ['妈', '媽', '马', '馬', '问', '問', '门', '門', '想', '相', '他', '也'],
	iconic: ['林', '木', '旦', '日', '有', '又'],
	unknown: ['是', '止'],
	simplified: ['难', '難', '点', '點', '还', '還'],
	deleted: ['开', '開'],
	remnant: ['孝', '老'],
	distinguishing: ['王', '玉']
};

export const validTypes = new Set(Object.keys(exampleChars));

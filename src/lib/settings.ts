import type { PhoneticScript } from '$lib/orthography';

/** All user settings with their defaults. null = "use system/platform default" */
export type UserSettings = {
	theme: 'light' | 'dark' | null;
	characterSet: 'simplified' | 'traditional' | null;
	phoneticScript: PhoneticScript | null; // null = pinyin (default)
	// Future:
	// font: 'sans' | 'serif' | 'kai' | null;
	// ttsSpeed: number;
	// ttsVoice: string | null;
};

export const SETTINGS_DEFAULTS: UserSettings = {
	theme: null,
	characterSet: null,
	phoneticScript: null
};

export const PHONETIC_SCRIPT_VALUES: PhoneticScript[] = [
	'pinyin',
	'zhuyin',
	'wadegiles',
	'gwoyeu',
	'cyrillic'
];

export const SETTINGS_COOKIE = 'settings';

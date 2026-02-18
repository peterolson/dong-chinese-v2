/** All user settings with their defaults. null = "use system/platform default" */
export type UserSettings = {
	theme: 'light' | 'dark' | null;
	characterSet: 'simplified' | 'traditional' | null;
	// Future:
	// font: 'sans' | 'serif' | 'kai' | null;
	// ttsSpeed: number;
	// ttsVoice: string | null;
};

export const SETTINGS_DEFAULTS: UserSettings = {
	theme: null,
	characterSet: null
};

export const SETTINGS_COOKIE = 'settings';

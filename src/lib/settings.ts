/** All user settings with their defaults. null = "use system/platform default" */
export type UserSettings = {
	theme: 'light' | 'dark' | null;
	// Future:
	// font: 'sans' | 'serif' | 'kai' | null;
	// characterSet: 'simplified' | 'traditional' | 'both';
	// ttsSpeed: number;
	// ttsVoice: string | null;
};

export const SETTINGS_DEFAULTS: UserSettings = {
	theme: null
};

export const SETTINGS_COOKIE = 'settings';

import { SETTINGS_COOKIE, SETTINGS_DEFAULTS, type UserSettings } from './settings';

/** Parse the settings cookie from document.cookie */
export function readSettings(): Partial<UserSettings> {
	const match = document.cookie.split('; ').find((c) => c.startsWith(SETTINGS_COOKIE + '='));
	if (!match) return {};
	try {
		return JSON.parse(decodeURIComponent(match.split('=').slice(1).join('=')));
	} catch {
		return {};
	}
}

/** Write non-default settings to the cookie (or delete if all defaults) */
export function writeSettings(partial: Partial<UserSettings>): void {
	const nonDefault: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(partial)) {
		if (value !== SETTINGS_DEFAULTS[key as keyof UserSettings]) {
			nonDefault[key] = value;
		}
	}

	if (Object.keys(nonDefault).length === 0) {
		// Delete cookie
		document.cookie = `${SETTINGS_COOKIE}=; path=/; max-age=0`;
	} else {
		const encoded = encodeURIComponent(JSON.stringify(nonDefault));
		document.cookie = `${SETTINGS_COOKIE}=${encoded}; path=/; max-age=34560000; samesite=lax`;
	}
}

/** Set or remove the data-theme attribute on <html> */
export function applyThemeToDOM(theme: 'light' | 'dark' | null): void {
	if (theme === 'light' || theme === 'dark') {
		document.documentElement.setAttribute('data-theme', theme);
	} else {
		document.documentElement.removeAttribute('data-theme');
	}
}

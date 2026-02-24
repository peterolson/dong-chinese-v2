import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PHONETIC_SCRIPT_VALUES, type UserSettings } from '$lib/settings';
import { applySettings } from '$lib/server/services/settings';
import { sanitizeRedirectTo } from '$lib/server/services/sanitize-redirect';
import { db } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
	return {
		settings: event.locals.settings
	};
};

export const actions: Actions = {
	updateSettings: async (event) => {
		const formData = await event.request.formData();
		const themeRaw = formData.get('theme')?.toString() ?? '';
		const theme: UserSettings['theme'] =
			themeRaw === 'light' || themeRaw === 'dark' ? themeRaw : null;

		const charSetRaw = formData.get('characterSet')?.toString() ?? '';
		const characterSet: UserSettings['characterSet'] =
			charSetRaw === 'simplified' || charSetRaw === 'traditional' ? charSetRaw : null;

		const phoneticScriptRaw = formData.get('phoneticScript')?.toString() ?? '';
		const phoneticScript: UserSettings['phoneticScript'] =
			phoneticScriptRaw !== 'pinyin' &&
			PHONETIC_SCRIPT_VALUES.includes(phoneticScriptRaw as (typeof PHONETIC_SCRIPT_VALUES)[number])
				? (phoneticScriptRaw as UserSettings['phoneticScript'])
				: null;

		const settings: Partial<UserSettings> = {
			...event.locals.settings,
			theme,
			characterSet,
			phoneticScript
		};
		const isSecure = event.url.protocol === 'https:';
		const userId = event.locals.user?.id;

		await applySettings(event.cookies, settings, isSecure, userId, userId ? db : undefined);
		event.locals.settings = settings;

		const redirectTo = formData.get('redirectTo')?.toString();
		if (redirectTo) {
			redirect(303, sanitizeRedirectTo(redirectTo));
		}

		return { settings };
	}
};

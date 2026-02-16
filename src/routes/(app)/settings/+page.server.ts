import type { Actions, PageServerLoad } from './$types';
import type { UserSettings } from '$lib/settings';
import { applySettings } from '$lib/server/services/settings';
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

		const settings: Partial<UserSettings> = { ...event.locals.settings, theme };
		const isSecure = event.url.protocol === 'https:';
		const userId = event.locals.user?.id;

		await applySettings(event.cookies, settings, isSecure, userId, userId ? db : undefined);
		event.locals.settings = settings;

		return { settings };
	}
};

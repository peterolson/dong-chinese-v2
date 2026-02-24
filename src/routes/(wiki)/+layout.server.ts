import type { LayoutServerLoad } from './$types';
import { hasPermission } from '$lib/server/services/permissions';

export const load: LayoutServerLoad = async (event) => {
	const user = event.locals.user ?? null;
	const canReview = user ? await hasPermission(user.id, 'wikiEdit') : false;

	return {
		user,
		settings: event.locals.settings ?? {},
		canReview
	};
};

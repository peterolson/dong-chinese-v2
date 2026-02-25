import type { LayoutServerLoad } from './$types';
import { hasPermission } from '$lib/server/services/permissions';
import { countAllPendingEdits } from '$lib/server/services/char-edit';

export const load: LayoutServerLoad = async (event) => {
	const user = event.locals.user ?? null;
	const canReview = user ? await hasPermission(user.id, 'wikiEdit') : false;
	const pendingBadgeCount = canReview ? await countAllPendingEdits() : 0;

	return {
		user,
		settings: event.locals.settings ?? {},
		canReview,
		pendingBadgeCount,
		anonymousSessionId: event.locals.anonymousSessionId ?? null
	};
};

import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { inArray } from 'drizzle-orm';

/**
 * Batch-resolve user IDs to display names.
 * Returns a Map of userId → name. Missing IDs are omitted from the result.
 */
export async function resolveUserNames(userIds: string[]): Promise<Map<string, string>> {
	const unique = [...new Set(userIds.filter(Boolean))];
	if (unique.length === 0) return new Map();

	const rows = await db
		.select({ id: user.id, name: user.name })
		.from(user)
		.where(inArray(user.id, unique));

	return new Map(rows.map((r) => [r.id, r.name]));
}

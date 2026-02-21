import { db } from '$lib/server/db';
import { userPermission } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Check whether a user has a specific permission.
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
	const rows = await db
		.select({ id: userPermission.id })
		.from(userPermission)
		.where(and(eq(userPermission.userId, userId), eq(userPermission.permission, permission)))
		.limit(1);

	return rows.length > 0;
}

/**
 * Get all permissions for a user.
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
	const rows = await db
		.select({ permission: userPermission.permission })
		.from(userPermission)
		.where(eq(userPermission.userId, userId));

	return rows.map((r) => r.permission);
}

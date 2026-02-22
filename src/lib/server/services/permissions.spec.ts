import { describe, expect, it, afterEach } from 'vitest';
import { db } from '$lib/server/db';
import { userPermission } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import { hasPermission, getUserPermissions } from './permissions';

const testUserIds: string[] = [];

afterEach(async () => {
	await db.delete(userPermission);
	for (const id of testUserIds) {
		await db.delete(user).where(eq(user.id, id));
	}
	testUserIds.length = 0;
});

async function createTestUser(id: string): Promise<string> {
	await db.insert(user).values({
		id,
		name: 'Test User',
		email: `${id}@test.com`,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	testUserIds.push(id);
	return id;
}

describe('hasPermission', () => {
	it('returns false when user has no permissions', async () => {
		const id = await createTestUser('perm-none');
		expect(await hasPermission(id, 'wikiEdit')).toBe(false);
	});

	it('returns true when user has the permission', async () => {
		const id = await createTestUser('perm-has');
		await db.insert(userPermission).values({ userId: id, permission: 'wikiEdit' });
		expect(await hasPermission(id, 'wikiEdit')).toBe(true);
	});

	it('returns false for a different permission', async () => {
		const id = await createTestUser('perm-other');
		await db.insert(userPermission).values({ userId: id, permission: 'wikiEdit' });
		expect(await hasPermission(id, 'admin')).toBe(false);
	});

	it('returns false for non-existent user', async () => {
		expect(await hasPermission('nonexistent-user-id', 'wikiEdit')).toBe(false);
	});
});

describe('getUserPermissions', () => {
	it('returns empty array when user has no permissions', async () => {
		const id = await createTestUser('perm-list-none');
		expect(await getUserPermissions(id)).toEqual([]);
	});

	it('returns all permissions for a user', async () => {
		const id = await createTestUser('perm-list-multi');
		await db.insert(userPermission).values([
			{ userId: id, permission: 'wikiEdit' },
			{ userId: id, permission: 'admin' }
		]);
		const perms = await getUserPermissions(id);
		expect(perms).toHaveLength(2);
		expect(perms).toContain('wikiEdit');
		expect(perms).toContain('admin');
	});

	it('returns empty array for non-existent user', async () => {
		expect(await getUserPermissions('nonexistent-user-id')).toEqual([]);
	});
});

import { describe, expect, it, afterEach } from 'vitest';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import { resolveUserNames } from './user';

const testUserIds: string[] = [];

afterEach(async () => {
	for (const id of testUserIds) {
		await db.delete(user).where(eq(user.id, id));
	}
	testUserIds.length = 0;
});

async function createTestUser(id: string, name: string): Promise<string> {
	await db.insert(user).values({
		id,
		name,
		email: `${id}@test.com`,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	testUserIds.push(id);
	return id;
}

describe('resolveUserNames', () => {
	it('returns empty map for empty array', async () => {
		const result = await resolveUserNames([]);
		expect(result.size).toBe(0);
	});

	it('returns empty map for array of falsy values', async () => {
		const result = await resolveUserNames(['', '']);
		expect(result.size).toBe(0);
	});

	it('resolves a single user ID', async () => {
		await createTestUser('resolve-1', 'Alice');

		const result = await resolveUserNames(['resolve-1']);
		expect(result.size).toBe(1);
		expect(result.get('resolve-1')).toBe('Alice');
	});

	it('resolves multiple user IDs', async () => {
		await createTestUser('resolve-2', 'Bob');
		await createTestUser('resolve-3', 'Carol');

		const result = await resolveUserNames(['resolve-2', 'resolve-3']);
		expect(result.size).toBe(2);
		expect(result.get('resolve-2')).toBe('Bob');
		expect(result.get('resolve-3')).toBe('Carol');
	});

	it('omits missing user IDs', async () => {
		await createTestUser('resolve-4', 'Dave');

		const result = await resolveUserNames(['resolve-4', 'nonexistent-id']);
		expect(result.size).toBe(1);
		expect(result.get('resolve-4')).toBe('Dave');
		expect(result.has('nonexistent-id')).toBe(false);
	});

	it('deduplicates input IDs', async () => {
		await createTestUser('resolve-5', 'Eve');

		const result = await resolveUserNames(['resolve-5', 'resolve-5', 'resolve-5']);
		expect(result.size).toBe(1);
		expect(result.get('resolve-5')).toBe('Eve');
	});

	it('filters out falsy values mixed with valid IDs', async () => {
		await createTestUser('resolve-6', 'Frank');

		const result = await resolveUserNames(['', 'resolve-6', '']);
		expect(result.size).toBe(1);
		expect(result.get('resolve-6')).toBe('Frank');
	});
});

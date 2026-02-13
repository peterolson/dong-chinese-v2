import { describe, expect, it, afterEach } from 'vitest';
import { anonymousSession } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import {
	COOKIE_NAME,
	MAX_AGE_DAYS,
	MAX_AGE_SECONDS,
	createAnonymousSession,
	validateAnonymousSession,
	deleteAnonymousSession,
	deleteExpiredSessions
} from './anonymous-session';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

afterEach(async () => {
	await db.delete(anonymousSession);
});

describe('constants', () => {
	it('COOKIE_NAME is anonymous_session_id', () => {
		expect(COOKIE_NAME).toBe('anonymous_session_id');
	});

	it('MAX_AGE_DAYS is 30', () => {
		expect(MAX_AGE_DAYS).toBe(30);
	});

	it('MAX_AGE_SECONDS is 30 days in seconds', () => {
		expect(MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60);
	});
});

describe('createAnonymousSession', () => {
	it('creates a session and returns a valid UUID', async () => {
		const id = await createAnonymousSession(db);
		expect(id).toMatch(UUID_REGEX);
	});

	it('creates distinct sessions on multiple calls', async () => {
		const id1 = await createAnonymousSession(db);
		const id2 = await createAnonymousSession(db);
		expect(id1).not.toBe(id2);
	});
});

describe('validateAnonymousSession', () => {
	it('returns true for an existing session', async () => {
		const id = await createAnonymousSession(db);
		const valid = await validateAnonymousSession(db, id);
		expect(valid).toBe(true);
	});

	it('returns false for a non-existent UUID', async () => {
		const valid = await validateAnonymousSession(db, '00000000-0000-0000-0000-000000000000');
		expect(valid).toBe(false);
	});
});

describe('deleteAnonymousSession', () => {
	it('deletes the session so it no longer validates', async () => {
		const id = await createAnonymousSession(db);
		await deleteAnonymousSession(db, id);
		const valid = await validateAnonymousSession(db, id);
		expect(valid).toBe(false);
	});
});

describe('deleteExpiredSessions', () => {
	it('deletes only sessions older than the cutoff', async () => {
		const recentId = await createAnonymousSession(db);

		// Create an old session by backdating its created_at
		const oldId = await createAnonymousSession(db);
		await db
			.update(anonymousSession)
			.set({ createdAt: new Date('2020-01-01') })
			.where(sql`${anonymousSession.id} = ${oldId}`);

		const deletedCount = await deleteExpiredSessions(db);

		expect(deletedCount).toBe(1);

		// Recent session should still exist
		expect(await validateAnonymousSession(db, recentId)).toBe(true);
		// Old session should be gone
		expect(await validateAnonymousSession(db, oldId)).toBe(false);
	});

	it('returns 0 when no sessions are expired', async () => {
		await createAnonymousSession(db);
		const deletedCount = await deleteExpiredSessions(db);
		expect(deletedCount).toBe(0);
	});
});

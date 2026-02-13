import { eq, lt } from 'drizzle-orm';
import { anonymousSession } from '$lib/server/db/schema';
import type { db as Database } from '$lib/server/db';

type DB = typeof Database;

const COOKIE_NAME = 'anonymous_session_id';
const MAX_AGE_DAYS = 30;
const MAX_AGE_SECONDS = MAX_AGE_DAYS * 24 * 60 * 60;

export { COOKIE_NAME, MAX_AGE_DAYS, MAX_AGE_SECONDS };

export async function createAnonymousSession(db: DB): Promise<string> {
	const [row] = await db.insert(anonymousSession).values({}).returning({ id: anonymousSession.id });
	return row.id;
}

export async function validateAnonymousSession(
	db: DB,
	id: string
): Promise<boolean> {
	const [row] = await db
		.select({ id: anonymousSession.id })
		.from(anonymousSession)
		.where(eq(anonymousSession.id, id))
		.limit(1);
	return !!row;
}

export async function deleteAnonymousSession(db: DB, id: string): Promise<void> {
	await db.delete(anonymousSession).where(eq(anonymousSession.id, id));
}

export async function deleteExpiredSessions(db: DB, maxAgeDays: number = MAX_AGE_DAYS): Promise<number> {
	const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
	const deleted = await db
		.delete(anonymousSession)
		.where(lt(anonymousSession.createdAt, cutoff))
		.returning({ id: anonymousSession.id });
	return deleted.length;
}

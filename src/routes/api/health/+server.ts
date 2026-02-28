import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		await db.execute(sql`SELECT 1`);
	} catch {
		return json({ status: 'error', detail: 'database unreachable' }, { status: 503 });
	}

	return json({ status: 'ok' });
};

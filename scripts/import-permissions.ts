/**
 * Permissions Import Script
 *
 * Imports user permissions from the legacy Dong Chinese MongoDB database
 * into the new Postgres user_permission table.
 *
 * Source: MongoDB dong-chinese.permissions collection
 * Document shape: { userId: string, wikiEdit?: boolean, ... }
 *
 * Usage:
 *   MONGODB_URI=mongodb://... DATABASE_URL=postgres://... npm run import:permissions
 *
 * Idempotent: uses ON CONFLICT DO NOTHING so it can be safely re-run.
 */

import { MongoClient } from 'mongodb';
import postgres from 'postgres';

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_URL = process.env.DATABASE_URL;
const MONGO_DB_NAME = 'dong-chinese';

if (!MONGODB_URI) {
	console.error('Error: MONGODB_URI environment variable is required');
	process.exit(1);
}
if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

interface PermissionDoc {
	_id: unknown;
	user: string;
	wikiEdit?: boolean;
	[key: string]: unknown;
}

async function main() {
	console.log('=== Permissions Import ===\n');

	const mongo = new MongoClient(MONGODB_URI!);
	const sql = postgres(DATABASE_URL!);

	try {
		await mongo.connect();
		const col = mongo.db(MONGO_DB_NAME).collection<PermissionDoc>('permissions');

		const docs = await col.find({ wikiEdit: true }).toArray();
		console.log(`Found ${docs.length} users with wikiEdit permission`);

		if (docs.length === 0) {
			console.log('Nothing to import.');
			return;
		}

		// Verify which users exist in Postgres (Meteor user IDs are preserved as user.id)
		const userIds = docs.map((d) => d.user);
		const existingUsers = await sql`
			SELECT id FROM "user" WHERE id = ANY(${userIds})
		`;
		const existingSet = new Set(existingUsers.map((r) => r.id as string));

		const missing = userIds.filter((id) => !existingSet.has(id));
		if (missing.length > 0) {
			console.log(`  Warning: ${missing.length} user(s) not found in Postgres, skipping them`);
		}

		// Insert permissions
		let inserted = 0;
		let skipped = 0;

		for (const doc of docs) {
			if (!existingSet.has(doc.user)) {
				skipped++;
				continue;
			}

			const result = await sql`
				INSERT INTO user_permission (user_id, permission)
				VALUES (${doc.user}, 'wikiEdit')
				ON CONFLICT (user_id, permission) DO NOTHING
			`;
			if (result.count > 0) {
				inserted++;
			} else {
				skipped++;
			}
		}

		console.log(`\nResults:`);
		console.log(`  Inserted: ${inserted}`);
		console.log(`  Skipped:  ${skipped} (already exists or user not found)`);

		// Summary
		const total =
			await sql`SELECT COUNT(*) AS total FROM user_permission WHERE permission = 'wikiEdit'`;
		console.log(`  Total wikiEdit permissions: ${Number(total[0].total)}`);
	} finally {
		await mongo.close().catch(() => {});
		await sql.end();
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

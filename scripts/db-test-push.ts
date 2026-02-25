/**
 * Initialize the test database (port 5435) for vitest integration tests.
 *
 * 1. Creates the `stage` and `dictionary` schemas
 * 2. Runs `drizzle-kit push --force` to create all tables
 * 3. Creates the dictionary.char view
 *
 * Usage: npm run db:test:push
 */

import { execSync } from 'node:child_process';
import postgres from 'postgres';
import { CHAR_VIEW_SQL } from '../src/lib/server/db/char-view-sql.js';

const TEST_DATABASE_URL =
	process.env.TEST_DATABASE_URL || 'postgres://root:mysecretpassword@localhost:5435/test';

async function main() {
	// Step 1: Create schemas
	console.log('Creating stage and dictionary schemas...');
	const sql = postgres(TEST_DATABASE_URL);
	await sql`CREATE SCHEMA IF NOT EXISTS stage`;
	await sql`CREATE SCHEMA IF NOT EXISTS dictionary`;
	await sql.end();
	console.log('Schemas created.');

	// Step 2: drizzle-kit push
	console.log('Running drizzle-kit push --force...');
	execSync('drizzle-kit push --force', {
		stdio: 'inherit',
		env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
	});
	console.log('Schema pushed.');

	// Step 3: Create char view
	console.log('Creating dictionary.char view...');
	const sql2 = postgres(TEST_DATABASE_URL);
	await sql2.unsafe(CHAR_VIEW_SQL);
	const result = await sql2`SELECT COUNT(*) AS total FROM dictionary.char`;
	console.log(`View created (${Number(result[0].total).toLocaleString()} rows).`);
	await sql2.end();

	console.log('Test database ready.');
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

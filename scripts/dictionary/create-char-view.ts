/**
 * Create the dictionary.char view
 *
 * This view layers the most recent approved manual edit (from char_manual)
 * on top of the materialized base data (from char_base).
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:create-char-view
 *
 * Idempotent: uses CREATE OR REPLACE VIEW.
 */

import postgres from 'postgres';
import { CHAR_VIEW_SQL } from './char-view-sql.js';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

async function main() {
	const sql = postgres(DATABASE_URL!);

	try {
		console.log('Creating dictionary.char view...');
		await sql.unsafe(CHAR_VIEW_SQL);
		console.log('View created successfully.');

		// Verify
		const result = await sql`
			SELECT COUNT(*) AS total FROM dictionary.char
		`;
		console.log(`View returns ${Number(result[0].total).toLocaleString()} rows.`);
	} finally {
		await sql.end();
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

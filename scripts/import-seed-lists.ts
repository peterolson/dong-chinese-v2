/**
 * Seed List Import Script
 *
 * Reads all CSV files from scripts/seed/ and uploads them to their
 * corresponding tables in the stage schema.
 *
 * Each CSV filename maps to a stage table (e.g., dong_chars.csv → stage.dong_chars).
 * Tables are truncated and re-populated on each run.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run import:seed-lists
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
const SEED_DIR = join(fileURLToPath(import.meta.url), '..', 'seed');
const BATCH_SIZE = 500;

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

/** Known seed tables and their column definitions (order matters for INSERT) */
const TABLE_SCHEMAS: Record<string, { table: string; columns: string[] }> = {
	dong_chars: { table: 'stage.dong_chars', columns: ['char', 'order'] },
	hsk_2_chars: { table: 'stage.hsk_2_chars', columns: ['char', 'level'] },
	hsk_3_chars: { table: 'stage.hsk_3_chars', columns: ['char', 'level'] },
	hsk_2_words: { table: 'stage.hsk_2_words', columns: ['word', 'level'] },
	hsk_3_words: { table: 'stage.hsk_3_words', columns: ['word', 'level'] }
};

function parseCsv(content: string): { headers: string[]; rows: string[][] } {
	// Strip BOM if present
	const clean = content.replace(/^\uFEFF/, '');
	const lines = clean.split(/\r?\n/).filter((l) => l.trim());
	if (lines.length === 0) return { headers: [], rows: [] };

	const headers = lines[0].split(',').map((h) => h.trim());
	const rows = lines.slice(1).map((line) => line.split(',').map((v) => v.trim()));
	return { headers, rows };
}

async function importFile(
	sql: ReturnType<typeof postgres>,
	filePath: string,
	name: string
): Promise<number> {
	const schema = TABLE_SCHEMAS[name];
	if (!schema) {
		console.warn(`  Skipping ${name}.csv — no matching table schema defined`);
		return 0;
	}

	const content = await readFile(filePath, 'utf-8');
	const { headers, rows } = parseCsv(content);

	if (rows.length === 0) {
		console.warn(`  Skipping ${name}.csv — no data rows`);
		return 0;
	}

	// Validate headers match expected columns
	const expected = schema.columns;
	if (headers.length !== expected.length || !headers.every((h, i) => h === expected[i])) {
		throw new Error(
			`Header mismatch in ${name}.csv: expected [${expected.join(',')}], got [${headers.join(',')}]`
		);
	}

	const colList = schema.columns.map((c) => `"${c}"`).join(', ');

	await sql.begin(async (tx) => {
		await tx.unsafe(`TRUNCATE ${schema.table}`);

		for (let i = 0; i < rows.length; i += BATCH_SIZE) {
			const batch = rows.slice(i, i + BATCH_SIZE);
			const numCols = schema.columns.length;

			const values = batch
				.map((_, j) => {
					const placeholders = schema.columns.map((_, c) => `$${j * numCols + c + 1}`);
					return `(${placeholders.join(', ')})`;
				})
				.join(', ');

			const params = batch.flatMap((row) =>
				row.map((val, c) => {
					// Integer columns (all columns except the first are integers in our seed tables)
					if (c > 0) return parseInt(val, 10);
					return val;
				})
			);

			await tx.unsafe(`INSERT INTO ${schema.table} (${colList}) VALUES ${values}`, params);
		}
	});

	return rows.length;
}

async function main() {
	console.log('=== Seed List Import ===\n');

	const sql = postgres(DATABASE_URL!);

	try {
		const files = (await readdir(SEED_DIR)).filter((f) => f.endsWith('.csv')).sort();

		if (files.length === 0) {
			console.log('No CSV files found in scripts/seed/');
			return;
		}

		console.log(`Found ${files.length} CSV files:\n`);

		let totalRows = 0;

		for (const file of files) {
			const name = basename(file, '.csv');
			const filePath = join(SEED_DIR, file);
			console.log(`Importing ${file}...`);

			const count = await importFile(sql, filePath, name);
			if (count > 0) {
				console.log(`  → ${count.toLocaleString()} rows\n`);
				totalRows += count;
			}
		}

		console.log(
			`\nDone. Imported ${totalRows.toLocaleString()} total rows across ${files.length} files.`
		);
	} finally {
		await sql.end();
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

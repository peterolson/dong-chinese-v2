/**
 * CC-CEDICT Import Script
 *
 * Downloads the CC-CEDICT Chinese-English dictionary and loads all entries
 * into `stage.cedict_raw`.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:import-cedict
 *
 * Idempotent: uses checksum comparison to skip redundant downloads,
 * and ON CONFLICT DO UPDATE to upsert rows.
 *
 * Audit columns: same as import-unihan.ts — see that file for query patterns.
 */

import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import postgres, { type Row, type PendingQuery } from 'postgres';

type Tx = postgres.TransactionSql & {
	<T extends readonly (object | undefined)[] = Row[]>(
		template: TemplateStringsArray,
		...parameters: readonly postgres.ParameterOrFragment<never>[]
	): PendingQuery<T>;
};

const DATABASE_URL = process.env.DATABASE_URL;
const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
const BATCH_SIZE = 1000;

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

interface CedictRow {
	traditional: string;
	simplified: string;
	pinyin: string;
	definitions: string;
	rawLine: string;
}

// CC-CEDICT line format: Traditional Simplified [pin1 yin1] /def1/def2/
const CEDICT_LINE_RE = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/;

async function downloadCedict(): Promise<Buffer> {
	console.log(`Downloading ${CEDICT_URL}...`);
	const response = await fetch(CEDICT_URL);
	if (!response.ok) {
		throw new Error(`Failed to download CC-CEDICT: ${response.status} ${response.statusText}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	const gzBuffer = Buffer.from(arrayBuffer);
	console.log(`Downloaded ${(gzBuffer.byteLength / 1024 / 1024).toFixed(1)} MB (gzipped)`);

	console.log('Decompressing...');
	const decompressed = gunzipSync(gzBuffer);
	console.log(`Decompressed to ${(decompressed.byteLength / 1024 / 1024).toFixed(1)} MB`);
	return decompressed;
}

function computeChecksum(data: Buffer): string {
	return createHash('sha256').update(data).digest('hex');
}

async function getStoredMeta(
	sql: ReturnType<typeof postgres>
): Promise<{ checksum: string | null; version: number }> {
	const rows = await sql`
		SELECT checksum, version FROM stage.sync_metadata WHERE source = 'cedict'
	`;
	if (rows.length === 0) return { checksum: null, version: 0 };
	return {
		checksum: rows[0].checksum as string | null,
		version: rows[0].version as number
	};
}

function parseCedict(content: string): { rows: CedictRow[]; skipped: number } {
	const rows: CedictRow[] = [];
	let skipped = 0;

	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const match = trimmed.match(CEDICT_LINE_RE);
		if (!match) {
			skipped++;
			if (skipped <= 5) {
				console.warn(`  Skipping unparseable line: ${trimmed.slice(0, 80)}...`);
			}
			continue;
		}

		rows.push({
			traditional: match[1],
			simplified: match[2],
			pinyin: match[3],
			definitions: match[4],
			rawLine: trimmed
		});
	}

	return { rows, skipped };
}

async function upsertBatch(tx: Tx, batch: CedictRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 6; // traditional, simplified, pinyin, definitions, raw_line, sync_version
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, $${i * cols + 5}, $${i * cols + 6})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.traditional,
		r.simplified,
		r.pinyin,
		r.definitions,
		r.rawLine,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.cedict_raw (traditional, simplified, pinyin, definitions, raw_line, sync_version)
		VALUES ${values}
		ON CONFLICT (traditional, simplified, pinyin) DO UPDATE SET
			definitions = EXCLUDED.definitions,
			raw_line = EXCLUDED.raw_line,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.cedict_raw.definitions != EXCLUDED.definitions
					OR stage.cedict_raw.is_current = false
				THEN NOW()
				ELSE stage.cedict_raw.updated_at
			END`,
		params
	);
}

async function main() {
	console.log('=== CC-CEDICT Import ===\n');

	const sql = postgres(DATABASE_URL!);

	try {
		// Download
		const rawBuffer = await downloadCedict();
		const checksum = computeChecksum(rawBuffer);
		console.log(`Checksum: ${checksum}`);

		// Check if we already have this version
		const stored = await getStoredMeta(sql);
		if (stored.checksum === checksum) {
			console.log('Checksum matches stored version — skipping import.');
			await sql.end();
			return;
		}

		const nextVersion = stored.version + 1;
		console.log(`Import version: ${nextVersion} (previous: ${stored.version})`);

		// Parse
		const content = rawBuffer.toString('utf8');
		console.log('\nParsing entries...');
		const { rows, skipped } = parseCedict(content);
		console.log(`Parsed ${rows.length.toLocaleString()} entries (${skipped} skipped)`);

		if (rows.length === 0) {
			throw new Error('No rows parsed from CC-CEDICT — something is wrong');
		}

		// Upsert in batches
		console.log(`\nUpserting ${rows.length.toLocaleString()} rows...`);
		let processed = 0;

		await sql.begin(async (_tx) => {
			const tx = _tx as Tx;

			for (let i = 0; i < rows.length; i += BATCH_SIZE) {
				const batch = rows.slice(i, i + BATCH_SIZE);
				await upsertBatch(tx, batch, nextVersion);
				processed += batch.length;

				if (processed % 10000 === 0 || processed === rows.length) {
					console.log(`  Progress: ${processed.toLocaleString()}/${rows.length.toLocaleString()}`);
				}
			}

			// Mark rows not in this load as removed
			console.log('\nMarking removed rows...');
			const removed = await tx.unsafe(
				`UPDATE stage.cedict_raw
				SET is_current = false, sync_version = $1, updated_at = NOW()
				WHERE sync_version < $1 AND is_current = true`,
				[nextVersion]
			);
			console.log(`  Marked ${removed.count} rows as removed`);

			// Update sync metadata
			await tx.unsafe(
				`INSERT INTO stage.sync_metadata (source, version, last_download, checksum, row_count, updated_at)
				VALUES ($1, $2, NOW(), $3, $4, NOW())
				ON CONFLICT (source) DO UPDATE SET
					version = EXCLUDED.version,
					last_download = NOW(),
					checksum = EXCLUDED.checksum,
					row_count = EXCLUDED.row_count,
					updated_at = NOW()`,
				['cedict', nextVersion, checksum, rows.length]
			);
		});

		// Summary
		const meta = await sql`SELECT * FROM stage.sync_metadata WHERE source = 'cedict'`;
		const importTime = meta[0]?.last_download;

		const changeSummary = await sql`
			SELECT
				COUNT(*) FILTER (WHERE is_current = true AND created_at >= ${importTime}) AS new_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at >= ${importTime} AND created_at < ${importTime}) AS changed_rows,
				COUNT(*) FILTER (WHERE is_current = false AND updated_at >= ${importTime}) AS removed_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at < ${importTime}) AS unchanged_rows,
				COUNT(*) FILTER (WHERE is_current = true) AS total_current,
				COUNT(*) FILTER (WHERE is_current = false) AS total_removed
			FROM stage.cedict_raw
			WHERE sync_version = ${nextVersion}
		`;
		const s = changeSummary[0];

		console.log('\n--- Import Summary ---');
		console.log(`Sync version:  ${nextVersion}`);
		console.log(`Checksum:      ${checksum.slice(0, 16)}...`);
		console.log(`Skipped lines: ${skipped}`);
		console.log('');
		console.log(`New rows:      ${Number(s.new_rows).toLocaleString()}`);
		console.log(`Changed:       ${Number(s.changed_rows).toLocaleString()}`);
		console.log(`Removed:       ${Number(s.removed_rows).toLocaleString()}`);
		console.log(`Unchanged:     ${Number(s.unchanged_rows).toLocaleString()}`);
		console.log('');
		console.log(`Total current: ${Number(s.total_current).toLocaleString()}`);
		console.log(`Total removed: ${Number(s.total_removed).toLocaleString()}`);
	} finally {
		await sql.end();
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

/**
 * Jun Da Character Frequency Import Script
 *
 * Downloads the Modern Chinese character frequency list from Jun Da's
 * Chinese Text Computing site and loads it into `stage.jun_da_char_freq_raw`.
 *
 * Source: https://lingua.mtsu.edu/chinese-computing/statistics/char/list.php?Which=MO
 * Corpus: ~193M characters of modern Chinese text (last updated 2004-03-30)
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:import-jun-da-char-freq
 *
 * Idempotent: uses checksum comparison to skip redundant downloads,
 * and ON CONFLICT DO UPDATE to upsert rows.
 *
 * Audit columns: same as import-cedict.ts — see that file for query patterns.
 */

import { createHash } from 'node:crypto';
import postgres, { type Row, type PendingQuery } from 'postgres';

type Tx = postgres.TransactionSql & {
	<T extends readonly (object | undefined)[] = Row[]>(
		template: TemplateStringsArray,
		...parameters: readonly postgres.ParameterOrFragment<never>[]
	): PendingQuery<T>;
};

const DATABASE_URL = process.env.DATABASE_URL;
const SOURCE_URL = 'https://lingua.mtsu.edu/chinese-computing/statistics/char/list.php?Which=MO';
const BATCH_SIZE = 500;
const SOURCE_NAME = 'jun_da_char_freq';

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

interface CharFreqRow {
	rank: number;
	character: string;
	rawFrequency: number;
	cumulativePercent: string;
	pinyin: string;
	english: string;
}

async function downloadPage(): Promise<string> {
	console.log(`Downloading ${SOURCE_URL}...`);
	const response = await fetch(SOURCE_URL);
	if (!response.ok) {
		throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
	}
	// Page is GB2312 encoded
	const buffer = await response.arrayBuffer();
	const decoder = new TextDecoder('gb2312');
	const text = decoder.decode(buffer);
	console.log(`Downloaded ${(buffer.byteLength / 1024).toFixed(1)} KB`);
	return text;
}

function computeChecksum(data: string): string {
	return createHash('sha256').update(data, 'utf8').digest('hex');
}

async function getStoredMeta(
	sql: ReturnType<typeof postgres>
): Promise<{ checksum: string | null; version: number }> {
	const rows = await sql`
		SELECT checksum, version FROM stage.sync_metadata WHERE source = ${SOURCE_NAME}
	`;
	if (rows.length === 0) return { checksum: null, version: 0 };
	return {
		checksum: rows[0].checksum as string | null,
		version: rows[0].version as number
	};
}

function parseFrequencyList(html: string): { rows: CharFreqRow[]; skipped: number } {
	const rows: CharFreqRow[] = [];
	let skipped = 0;

	// Extract content between <pre> and </pre>
	const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/);
	if (!preMatch) {
		throw new Error('Could not find <pre> block in HTML');
	}

	// Split by <br> tags — each is a data row
	const lines = preMatch[1].split(/<br\s*\/?>/);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		// Format: rank \t character \t rawFrequency \t cumulativePercent \t pinyin \t english
		const parts = trimmed.split('\t');
		if (parts.length < 4) {
			skipped++;
			if (skipped <= 5) {
				console.warn(`  Skipping unparseable line: ${trimmed.slice(0, 80)}`);
			}
			continue;
		}

		const rank = parseInt(parts[0], 10);
		const character = parts[1];
		const rawFrequency = parseInt(parts[2], 10);
		const cumulativePercent = parts[3];
		const pinyin = parts[4] ?? '';
		const english = parts[5] ?? '';

		if (isNaN(rank) || isNaN(rawFrequency) || !character) {
			skipped++;
			if (skipped <= 5) {
				console.warn(`  Skipping bad data: ${trimmed.slice(0, 80)}`);
			}
			continue;
		}

		rows.push({ rank, character, rawFrequency, cumulativePercent, pinyin, english });
	}

	return { rows, skipped };
}

async function upsertBatch(tx: Tx, batch: CharFreqRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 7; // character, rank, raw_frequency, cumulative_percent, pinyin, english, sync_version
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, $${i * cols + 5}, $${i * cols + 6}, $${i * cols + 7})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.character,
		r.rank,
		r.rawFrequency,
		r.cumulativePercent,
		r.pinyin,
		r.english,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.jun_da_char_freq_raw
			(character, rank, raw_frequency, cumulative_percent, pinyin, english, sync_version)
		VALUES ${values}
		ON CONFLICT (character) DO UPDATE SET
			rank = EXCLUDED.rank,
			raw_frequency = EXCLUDED.raw_frequency,
			cumulative_percent = EXCLUDED.cumulative_percent,
			pinyin = EXCLUDED.pinyin,
			english = EXCLUDED.english,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.jun_da_char_freq_raw.rank != EXCLUDED.rank
					OR stage.jun_da_char_freq_raw.raw_frequency != EXCLUDED.raw_frequency
					OR stage.jun_da_char_freq_raw.is_current = false
				THEN NOW()
				ELSE stage.jun_da_char_freq_raw.updated_at
			END`,
		params
	);
}

async function main() {
	console.log('=== Jun Da Character Frequency Import ===\n');

	const sql = postgres(DATABASE_URL!);

	try {
		// Download
		const html = await downloadPage();
		const checksum = computeChecksum(html);
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
		console.log('\nParsing entries...');
		const { rows, skipped } = parseFrequencyList(html);
		console.log(`Parsed ${rows.length.toLocaleString()} entries (${skipped} skipped)`);

		if (rows.length === 0) {
			throw new Error('No rows parsed — something is wrong');
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

				if (processed % 5000 === 0 || processed === rows.length) {
					console.log(`  Progress: ${processed.toLocaleString()}/${rows.length.toLocaleString()}`);
				}
			}

			// Mark rows not in this load as removed
			console.log('\nMarking removed rows...');
			const removed = await tx.unsafe(
				`UPDATE stage.jun_da_char_freq_raw
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
				[SOURCE_NAME, nextVersion, checksum, rows.length]
			);
		});

		// Summary
		const meta = await sql`SELECT * FROM stage.sync_metadata WHERE source = ${SOURCE_NAME}`;
		const importTime = meta[0]?.last_download;

		const changeSummary = await sql`
			SELECT
				COUNT(*) FILTER (WHERE is_current = true AND created_at >= ${importTime}) AS new_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at >= ${importTime} AND created_at < ${importTime}) AS changed_rows,
				COUNT(*) FILTER (WHERE is_current = false AND updated_at >= ${importTime}) AS removed_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at < ${importTime}) AS unchanged_rows,
				COUNT(*) FILTER (WHERE is_current = true) AS total_current,
				COUNT(*) FILTER (WHERE is_current = false) AS total_removed
			FROM stage.jun_da_char_freq_raw
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

/**
 * MakeMeAHanzi Import Script
 *
 * Downloads stroke order (graphics) and dictionary data from the
 * MakeMeAHanzi GitHub repo and loads them into `stage.makemeahanzi_raw`.
 *
 * Source: https://github.com/skishore/makemeahanzi (Arphic PL)
 * Format: NDJSON — one JSON object per line per character
 *
 * Files downloaded:
 *   graphics.txt   — stroke paths + medians (~9.6k chars)
 *   dictionary.txt — definitions, pinyin, decomposition, etymology (~9.6k chars)
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:import-makemeahanzi
 *
 * Idempotent: uses checksum comparison to skip redundant downloads,
 * and ON CONFLICT DO UPDATE to upsert rows.
 *
 * Audit columns: same as import-unihan.ts — see that file for query patterns.
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
const BASE_URL = 'https://raw.githubusercontent.com/skishore/makemeahanzi/master';
const BATCH_SIZE = 200;

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

interface GraphicsEntry {
	character: string;
	strokes: string[];
	medians: number[][][];
}

interface DictionaryEntry {
	character: string;
	definition?: string;
	pinyin?: string[];
	decomposition?: string;
	radical?: string;
	matches?: (number[] | null)[];
	etymology?: { type: string; hint?: string; phonetic?: string; semantic?: string };
}

interface MmahRow {
	character: string;
	strokes: string | null;
	medians: string | null;
	definition: string | null;
	pinyin: string | null;
	radical: string | null;
	decomposition: string | null;
	matches: string | null;
	etymology: string | null;
}

async function downloadFile(fileName: string): Promise<string> {
	const url = `${BASE_URL}/${fileName}`;
	console.log(`  Downloading ${fileName}...`);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to download ${fileName}: ${response.status} ${response.statusText}`);
	}
	const text = await response.text();
	console.log(`    ${text.split('\n').filter((l) => l.trim()).length} lines`);
	return text;
}

function computeChecksum(data: string): string {
	return createHash('sha256').update(data).digest('hex');
}

async function getStoredMeta(
	sql: ReturnType<typeof postgres>
): Promise<{ checksum: string | null; version: number }> {
	const rows = await sql`
		SELECT checksum, version FROM stage.sync_metadata WHERE source = 'makemeahanzi'
	`;
	if (rows.length === 0) return { checksum: null, version: 0 };
	return {
		checksum: rows[0].checksum as string | null,
		version: rows[0].version as number
	};
}

function parseNdjson<T>(content: string): T[] {
	const entries: T[] = [];
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		entries.push(JSON.parse(trimmed) as T);
	}
	return entries;
}

function mergeEntries(
	graphicsEntries: GraphicsEntry[],
	dictionaryEntries: DictionaryEntry[]
): MmahRow[] {
	const map = new Map<string, MmahRow>();

	// Seed from graphics entries
	for (const g of graphicsEntries) {
		map.set(g.character, {
			character: g.character,
			strokes: JSON.stringify(g.strokes),
			medians: JSON.stringify(g.medians),
			definition: null,
			pinyin: null,
			radical: null,
			decomposition: null,
			matches: null,
			etymology: null
		});
	}

	// Merge dictionary entries
	for (const d of dictionaryEntries) {
		const existing = map.get(d.character);
		if (existing) {
			existing.definition = d.definition ?? null;
			existing.pinyin = d.pinyin ? JSON.stringify(d.pinyin) : null;
			existing.radical = d.radical ?? null;
			existing.decomposition = d.decomposition ?? null;
			existing.matches = d.matches ? JSON.stringify(d.matches) : null;
			existing.etymology = d.etymology ? JSON.stringify(d.etymology) : null;
		} else {
			// Character in dictionary but not in graphics
			map.set(d.character, {
				character: d.character,
				strokes: null,
				medians: null,
				definition: d.definition ?? null,
				pinyin: d.pinyin ? JSON.stringify(d.pinyin) : null,
				radical: d.radical ?? null,
				decomposition: d.decomposition ?? null,
				matches: d.matches ? JSON.stringify(d.matches) : null,
				etymology: d.etymology ? JSON.stringify(d.etymology) : null
			});
		}
	}

	return Array.from(map.values());
}

async function upsertBatch(tx: Tx, batch: MmahRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 10;
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}::jsonb, $${i * cols + 3}::jsonb, ` +
				`$${i * cols + 4}, $${i * cols + 5}::jsonb, $${i * cols + 6}, $${i * cols + 7}, ` +
				`$${i * cols + 8}::jsonb, $${i * cols + 9}::jsonb, $${i * cols + 10})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.character,
		r.strokes,
		r.medians,
		r.definition,
		r.pinyin,
		r.radical,
		r.decomposition,
		r.matches,
		r.etymology,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.makemeahanzi_raw (character, strokes, medians,
			definition, pinyin, radical, decomposition, matches, etymology, sync_version)
		VALUES ${values}
		ON CONFLICT (character) DO UPDATE SET
			strokes = EXCLUDED.strokes,
			medians = EXCLUDED.medians,
			definition = EXCLUDED.definition,
			pinyin = EXCLUDED.pinyin,
			radical = EXCLUDED.radical,
			decomposition = EXCLUDED.decomposition,
			matches = EXCLUDED.matches,
			etymology = EXCLUDED.etymology,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.makemeahanzi_raw.strokes IS DISTINCT FROM EXCLUDED.strokes
					OR stage.makemeahanzi_raw.medians IS DISTINCT FROM EXCLUDED.medians
					OR stage.makemeahanzi_raw.definition IS DISTINCT FROM EXCLUDED.definition
					OR stage.makemeahanzi_raw.is_current = false
				THEN NOW()
				ELSE stage.makemeahanzi_raw.updated_at
			END`,
		params
	);
}

async function main() {
	console.log('=== MakeMeAHanzi Import ===\n');

	const sql = postgres(DATABASE_URL!);

	try {
		// Download both source files
		console.log('Downloading source files...');
		const [graphicsText, dictionaryText] = await Promise.all([
			downloadFile('graphics.txt'),
			downloadFile('dictionary.txt')
		]);

		// Combined checksum
		const combined = graphicsText + '\n' + dictionaryText;
		const checksum = computeChecksum(combined);
		console.log(`\nCombined checksum: ${checksum}`);

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
		console.log('\nParsing...');
		const graphicsEntries = parseNdjson<GraphicsEntry>(graphicsText);
		const dictionaryEntries = parseNdjson<DictionaryEntry>(dictionaryText);
		console.log(
			`  Graphics: ${graphicsEntries.length} entries, Dictionary: ${dictionaryEntries.length} entries`
		);

		// Merge
		const rows = mergeEntries(graphicsEntries, dictionaryEntries);
		console.log(`  Merged: ${rows.length} unique characters`);

		if (rows.length === 0) {
			throw new Error('No entries parsed — something is wrong');
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

				if (processed % 2000 === 0 || processed === rows.length) {
					console.log(`  Progress: ${processed.toLocaleString()}/${rows.length.toLocaleString()}`);
				}
			}

			// Mark rows not in this load as removed
			console.log('\nMarking removed rows...');
			const removed = await tx.unsafe(
				`UPDATE stage.makemeahanzi_raw
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
				['makemeahanzi', nextVersion, checksum, rows.length]
			);
		});

		// Summary
		const meta = await sql`SELECT * FROM stage.sync_metadata WHERE source = 'makemeahanzi'`;
		const importTime = meta[0]?.last_download;

		const changeSummary = await sql`
			SELECT
				COUNT(*) FILTER (WHERE is_current = true AND created_at >= ${importTime}) AS new_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at >= ${importTime} AND created_at < ${importTime}) AS changed_rows,
				COUNT(*) FILTER (WHERE is_current = false AND updated_at >= ${importTime}) AS removed_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at < ${importTime}) AS unchanged_rows,
				COUNT(*) FILTER (WHERE is_current = true) AS total_current,
				COUNT(*) FILTER (WHERE is_current = false) AS total_removed
			FROM stage.makemeahanzi_raw
			WHERE sync_version = ${nextVersion}
		`;
		const s = changeSummary[0];

		console.log('\n--- Import Summary ---');
		console.log(`Sync version:  ${nextVersion}`);
		console.log(`Checksum:      ${checksum.slice(0, 16)}...`);
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

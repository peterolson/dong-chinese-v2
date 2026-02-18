/**
 * AnimCJK Import Script
 *
 * Downloads stroke order (graphics) and dictionary data from the AnimCJK
 * GitHub repo for both simplified and traditional Chinese characters,
 * and loads them into `stage.animcjk_raw`.
 *
 * Source: https://github.com/parsimonhi/animCJK (Arphic PL / LGPL)
 * Format: NDJSON — one JSON object per line per character
 *
 * Files downloaded:
 *   graphicsZhHans.txt  — simplified stroke paths + medians (~7.2k chars)
 *   graphicsZhHant.txt  — traditional stroke paths + medians (~1k chars)
 *   dictionaryZhHans.txt — simplified definitions, pinyin, decomposition (~7.7k chars)
 *   dictionaryZhHant.txt — traditional definitions, pinyin, decomposition (~1k chars)
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:import-animcjk
 *
 * Idempotent: uses checksum comparison to skip redundant downloads,
 * and ON CONFLICT DO UPDATE to upsert rows.
 *
 * Audit columns: same as import-unihan.ts — see that file for query patterns.
 */

import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import postgres, { type Row, type PendingQuery } from 'postgres';

type Tx = postgres.TransactionSql & {
	<T extends readonly (object | undefined)[] = Row[]>(
		template: TemplateStringsArray,
		...parameters: readonly postgres.ParameterOrFragment<never>[]
	): PendingQuery<T>;
};

const DATABASE_URL = process.env.DATABASE_URL;
const BASE_URL = 'https://raw.githubusercontent.com/parsimonhi/animCJK/master';
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
	set: string[];
	definition: string;
	pinyin: string[];
	radical: string;
	decomposition: string;
	acjk: string;
}

interface AnimcjkRow {
	character: string;
	variant: string;
	strokes: string | null;
	medians: string | null;
	definition: string | null;
	pinyin: string | null;
	radical: string | null;
	decomposition: string | null;
	acjk: string | null;
	characterSet: string | null;
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
		SELECT checksum, version FROM stage.sync_metadata WHERE source = 'animcjk'
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

function mergeVariant(
	graphicsEntries: GraphicsEntry[],
	dictionaryEntries: DictionaryEntry[],
	variant: string
): AnimcjkRow[] {
	const map = new Map<string, AnimcjkRow>();

	// Seed from graphics entries
	for (const g of graphicsEntries) {
		map.set(g.character, {
			character: g.character,
			variant,
			strokes: JSON.stringify(g.strokes),
			medians: JSON.stringify(g.medians),
			definition: null,
			pinyin: null,
			radical: null,
			decomposition: null,
			acjk: null,
			characterSet: null
		});
	}

	// Merge dictionary entries
	for (const d of dictionaryEntries) {
		const existing = map.get(d.character);
		if (existing) {
			existing.definition = d.definition ?? null;
			existing.pinyin = JSON.stringify(d.pinyin ?? []);
			existing.radical = d.radical ?? null;
			existing.decomposition = d.decomposition ?? null;
			existing.acjk = d.acjk ?? null;
			existing.characterSet = JSON.stringify(d.set ?? []);
		} else {
			// Character in dictionary but not in graphics
			map.set(d.character, {
				character: d.character,
				variant,
				strokes: null,
				medians: null,
				definition: d.definition ?? null,
				pinyin: JSON.stringify(d.pinyin ?? []),
				radical: d.radical ?? null,
				decomposition: d.decomposition ?? null,
				acjk: d.acjk ?? null,
				characterSet: JSON.stringify(d.set ?? [])
			});
		}
	}

	return Array.from(map.values());
}

async function upsertBatch(tx: Tx, batch: AnimcjkRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 11;
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}::jsonb, $${i * cols + 4}::jsonb, ` +
				`$${i * cols + 5}, $${i * cols + 6}::jsonb, $${i * cols + 7}, $${i * cols + 8}, ` +
				`$${i * cols + 9}, $${i * cols + 10}::jsonb, $${i * cols + 11})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.character,
		r.variant,
		r.strokes,
		r.medians,
		r.definition,
		r.pinyin,
		r.radical,
		r.decomposition,
		r.acjk,
		r.characterSet,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.animcjk_raw (character, variant, strokes, medians,
			definition, pinyin, radical, decomposition, acjk, character_set, sync_version)
		VALUES ${values}
		ON CONFLICT (character, variant) DO UPDATE SET
			strokes = EXCLUDED.strokes,
			medians = EXCLUDED.medians,
			definition = EXCLUDED.definition,
			pinyin = EXCLUDED.pinyin,
			radical = EXCLUDED.radical,
			decomposition = EXCLUDED.decomposition,
			acjk = EXCLUDED.acjk,
			character_set = EXCLUDED.character_set,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.animcjk_raw.strokes IS DISTINCT FROM EXCLUDED.strokes
					OR stage.animcjk_raw.medians IS DISTINCT FROM EXCLUDED.medians
					OR stage.animcjk_raw.definition IS DISTINCT FROM EXCLUDED.definition
					OR stage.animcjk_raw.is_current = false
				THEN NOW()
				ELSE stage.animcjk_raw.updated_at
			END`,
		params
	);
}

async function main() {
	console.log('=== AnimCJK Import ===\n');

	const sql = postgres(DATABASE_URL!);

	try {
		// Download all four source files
		console.log('Downloading source files...');
		const [graphicsHans, graphicsHant, dictHans, dictHant] = await Promise.all([
			downloadFile('graphicsZhHans.txt'),
			downloadFile('graphicsZhHant.txt'),
			downloadFile('dictionaryZhHans.txt'),
			downloadFile('dictionaryZhHant.txt')
		]);

		// Combined checksum of all four files
		const combined = graphicsHans + '\n' + graphicsHant + '\n' + dictHans + '\n' + dictHant;
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
		const gHans = parseNdjson<GraphicsEntry>(graphicsHans);
		const gHant = parseNdjson<GraphicsEntry>(graphicsHant);
		const dHans = parseNdjson<DictionaryEntry>(dictHans);
		const dHant = parseNdjson<DictionaryEntry>(dictHant);

		console.log(`  Graphics: ${gHans.length} simplified, ${gHant.length} traditional`);
		console.log(`  Dictionary: ${dHans.length} simplified, ${dHant.length} traditional`);

		// Merge graphics + dictionary per variant
		const simplifiedRows = mergeVariant(gHans, dHans, 'simplified');
		const traditionalRows = mergeVariant(gHant, dHant, 'traditional');
		const allRows = [...simplifiedRows, ...traditionalRows];

		console.log(
			`  Merged: ${simplifiedRows.length} simplified, ${traditionalRows.length} traditional (${allRows.length} total)`
		);

		if (allRows.length === 0) {
			throw new Error('No entries parsed — something is wrong');
		}

		// Upsert in batches
		console.log(`\nUpserting ${allRows.length.toLocaleString()} rows...`);
		let processed = 0;

		await sql.begin(async (_tx) => {
			const tx = _tx as Tx;

			for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
				const batch = allRows.slice(i, i + BATCH_SIZE);
				await upsertBatch(tx, batch, nextVersion);
				processed += batch.length;

				if (processed % 2000 === 0 || processed === allRows.length) {
					console.log(
						`  Progress: ${processed.toLocaleString()}/${allRows.length.toLocaleString()}`
					);
				}
			}

			// Mark rows not in this load as removed
			console.log('\nMarking removed rows...');
			const removed = await tx.unsafe(
				`UPDATE stage.animcjk_raw
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
				['animcjk', nextVersion, checksum, allRows.length]
			);
		});

		// Summary
		const meta = await sql`SELECT * FROM stage.sync_metadata WHERE source = 'animcjk'`;
		const importTime = meta[0]?.last_download;

		const changeSummary = await sql`
			SELECT
				COUNT(*) FILTER (WHERE is_current = true AND created_at >= ${importTime}) AS new_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at >= ${importTime} AND created_at < ${importTime}) AS changed_rows,
				COUNT(*) FILTER (WHERE is_current = false AND updated_at >= ${importTime}) AS removed_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at < ${importTime}) AS unchanged_rows,
				COUNT(*) FILTER (WHERE is_current = true) AS total_current,
				COUNT(*) FILTER (WHERE is_current = false) AS total_removed,
				COUNT(*) FILTER (WHERE is_current = true AND variant = 'simplified') AS simplified,
				COUNT(*) FILTER (WHERE is_current = true AND variant = 'traditional') AS traditional
			FROM stage.animcjk_raw
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
		console.log(`Simplified:    ${Number(s.simplified).toLocaleString()}`);
		console.log(`Traditional:   ${Number(s.traditional).toLocaleString()}`);
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

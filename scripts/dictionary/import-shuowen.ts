/**
 * 说文解字 Import Script
 *
 * Downloads the shuowenjiezi/shuowen GitHub repo (Apache 2.0) and loads
 * all 9,833 character entries into `stage.shuowen_raw`.
 *
 * Source: https://github.com/shuowenjiezi/shuowen
 * Format: One JSON file per character in data/{id}.json
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:import-shuowen
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
const REPO_ZIP_URL = 'https://github.com/shuowenjiezi/shuowen/archive/refs/heads/master.zip';
const BATCH_SIZE = 500;

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

interface ShuowenEntry {
	id: number;
	wordhead: string;
	explanation: string;
	volume: string;
	radical: string;
	pronunciation: string;
	pinyin: string;
	pinyin_full: string;
	seal_character: string;
	components: string[];
	variants: unknown[];
	indexes: string[];
	xuan_note: string;
	kai_note: string;
	duan_notes: unknown[];
}

interface ShuowenRow {
	sourceId: number;
	wordhead: string;
	explanation: string;
	volume: string;
	radical: string;
	pronunciation: string;
	pinyin: string;
	pinyinFull: string;
	sealCharacter: string;
	components: string;
	variants: string;
	indexes: string;
	xuanNote: string;
	kaiNote: string;
	duanNotes: string;
	rawJson: string;
}

async function downloadRepo(): Promise<Buffer> {
	console.log(`Downloading ${REPO_ZIP_URL}...`);
	const response = await fetch(REPO_ZIP_URL, { redirect: 'follow' });
	if (!response.ok) {
		throw new Error(`Failed to download repo zip: ${response.status} ${response.statusText}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	console.log(`Downloaded ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)} MB`);
	return Buffer.from(arrayBuffer);
}

function computeChecksum(data: Buffer): string {
	return createHash('sha256').update(data).digest('hex');
}

async function getStoredMeta(
	sql: ReturnType<typeof postgres>
): Promise<{ checksum: string | null; version: number }> {
	const rows = await sql`
		SELECT checksum, version FROM stage.sync_metadata WHERE source = 'shuowen'
	`;
	if (rows.length === 0) return { checksum: null, version: 0 };
	return {
		checksum: rows[0].checksum as string | null,
		version: rows[0].version as number
	};
}

/**
 * Extract and parse all data/*.json files from the GitHub repo zip.
 * GitHub zip structure: shuowen-master/data/1.json, shuowen-master/data/2.json, etc.
 */
async function parseRepoZip(zipBuffer: Buffer): Promise<ShuowenRow[]> {
	const rows: ShuowenRow[] = [];
	let fileCount = 0;
	let skipped = 0;

	// Find End of Central Directory record (EOCD)
	let eocdOffset = -1;
	for (let i = zipBuffer.length - 22; i >= 0; i--) {
		if (
			zipBuffer[i] === 0x50 &&
			zipBuffer[i + 1] === 0x4b &&
			zipBuffer[i + 2] === 0x05 &&
			zipBuffer[i + 3] === 0x06
		) {
			eocdOffset = i;
			break;
		}
	}
	if (eocdOffset === -1) throw new Error('Invalid zip file: EOCD not found');

	const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
	const centralDirEntries = zipBuffer.readUInt16LE(eocdOffset + 10);

	let offset = centralDirOffset;
	for (let i = 0; i < centralDirEntries; i++) {
		if (zipBuffer.readUInt32LE(offset) !== 0x02014b50) {
			throw new Error(`Invalid central directory entry at offset ${offset}`);
		}

		const compressionMethod = zipBuffer.readUInt16LE(offset + 10);
		const compressedSize = zipBuffer.readUInt32LE(offset + 20);
		const fileNameLength = zipBuffer.readUInt16LE(offset + 28);
		const extraFieldLength = zipBuffer.readUInt16LE(offset + 30);
		const commentLength = zipBuffer.readUInt16LE(offset + 32);
		const localHeaderOffset = zipBuffer.readUInt32LE(offset + 42);

		const fileName = zipBuffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);
		offset += 46 + fileNameLength + extraFieldLength + commentLength;

		// Only process data/*.json files
		if (!fileName.match(/\/data\/\d+\.json$/)) continue;

		const localSig = zipBuffer.readUInt32LE(localHeaderOffset);
		if (localSig !== 0x04034b50) {
			throw new Error(`Invalid local file header for ${fileName}`);
		}

		const localFileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
		const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
		const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;

		let content: string;
		if (compressionMethod === 0) {
			content = zipBuffer.toString('utf8', dataOffset, dataOffset + compressedSize);
		} else if (compressionMethod === 8) {
			const { inflateRawSync } = await import('node:zlib');
			const compressed = zipBuffer.subarray(dataOffset, dataOffset + compressedSize);
			const decompressed = inflateRawSync(compressed);
			content = decompressed.toString('utf8');
		} else {
			console.warn(`Skipping ${fileName}: unsupported compression method ${compressionMethod}`);
			continue;
		}

		try {
			const entry = JSON.parse(content) as ShuowenEntry;
			rows.push({
				sourceId: entry.id,
				wordhead: entry.wordhead ?? '',
				explanation: entry.explanation ?? '',
				volume: entry.volume ?? '',
				radical: entry.radical ?? '',
				pronunciation: entry.pronunciation ?? '',
				pinyin: entry.pinyin ?? '',
				pinyinFull: entry.pinyin_full ?? '',
				sealCharacter: entry.seal_character ?? '',
				components: JSON.stringify(entry.components ?? []),
				variants: JSON.stringify(entry.variants ?? []),
				indexes: JSON.stringify(entry.indexes ?? []),
				xuanNote: entry.xuan_note ?? '',
				kaiNote: entry.kai_note ?? '',
				duanNotes: JSON.stringify(entry.duan_notes ?? []),
				rawJson: content
			});
			fileCount++;
		} catch (err) {
			skipped++;
			if (skipped <= 5) {
				console.warn(`  Skipping ${fileName}: ${err instanceof Error ? err.message : err}`);
			}
		}
	}

	console.log(`Parsed ${fileCount} entries (${skipped} skipped)`);
	return rows;
}

async function upsertBatch(tx: Tx, batch: ShuowenRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 17; // source_id, wordhead, explanation, volume, radical, pronunciation,
	// pinyin, pinyin_full, seal_character, components, variants, indexes,
	// xuan_note, kai_note, duan_notes, raw_json, sync_version
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, ` +
				`$${i * cols + 5}, $${i * cols + 6}, $${i * cols + 7}, $${i * cols + 8}, ` +
				`$${i * cols + 9}, $${i * cols + 10}::jsonb, $${i * cols + 11}::jsonb, $${i * cols + 12}::jsonb, ` +
				`$${i * cols + 13}, $${i * cols + 14}, $${i * cols + 15}::jsonb, $${i * cols + 16}, $${i * cols + 17})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.sourceId,
		r.wordhead,
		r.explanation,
		r.volume,
		r.radical,
		r.pronunciation,
		r.pinyin,
		r.pinyinFull,
		r.sealCharacter,
		r.components,
		r.variants,
		r.indexes,
		r.xuanNote,
		r.kaiNote,
		r.duanNotes,
		r.rawJson,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.shuowen_raw (source_id, wordhead, explanation, volume, radical, pronunciation,
			pinyin, pinyin_full, seal_character, components, variants, indexes,
			xuan_note, kai_note, duan_notes, raw_json, sync_version)
		VALUES ${values}
		ON CONFLICT (source_id) DO UPDATE SET
			wordhead = EXCLUDED.wordhead,
			explanation = EXCLUDED.explanation,
			volume = EXCLUDED.volume,
			radical = EXCLUDED.radical,
			pronunciation = EXCLUDED.pronunciation,
			pinyin = EXCLUDED.pinyin,
			pinyin_full = EXCLUDED.pinyin_full,
			seal_character = EXCLUDED.seal_character,
			components = EXCLUDED.components,
			variants = EXCLUDED.variants,
			indexes = EXCLUDED.indexes,
			xuan_note = EXCLUDED.xuan_note,
			kai_note = EXCLUDED.kai_note,
			duan_notes = EXCLUDED.duan_notes,
			raw_json = EXCLUDED.raw_json,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.shuowen_raw.explanation != EXCLUDED.explanation
					OR stage.shuowen_raw.wordhead != EXCLUDED.wordhead
					OR stage.shuowen_raw.is_current = false
				THEN NOW()
				ELSE stage.shuowen_raw.updated_at
			END`,
		params
	);
}

async function main() {
	console.log('=== 说文解字 Import ===\n');

	const sql = postgres(DATABASE_URL!);

	try {
		// Download
		const zipBuffer = await downloadRepo();
		const checksum = computeChecksum(zipBuffer);
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
		console.log('\nParsing zip contents...');
		const rows = await parseRepoZip(zipBuffer);

		if (rows.length === 0) {
			throw new Error('No entries parsed from repo zip — something is wrong');
		}

		// Sort by source_id for consistent ordering
		rows.sort((a, b) => a.sourceId - b.sourceId);

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
				`UPDATE stage.shuowen_raw
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
				['shuowen', nextVersion, checksum, rows.length]
			);
		});

		// Summary
		const meta = await sql`SELECT * FROM stage.sync_metadata WHERE source = 'shuowen'`;
		const importTime = meta[0]?.last_download;

		const changeSummary = await sql`
			SELECT
				COUNT(*) FILTER (WHERE is_current = true AND created_at >= ${importTime}) AS new_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at >= ${importTime} AND created_at < ${importTime}) AS changed_rows,
				COUNT(*) FILTER (WHERE is_current = false AND updated_at >= ${importTime}) AS removed_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at < ${importTime}) AS unchanged_rows,
				COUNT(*) FILTER (WHERE is_current = true) AS total_current,
				COUNT(*) FILTER (WHERE is_current = false) AS total_removed
			FROM stage.shuowen_raw
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

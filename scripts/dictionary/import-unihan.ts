/**
 * Unihan Import Script
 *
 * Downloads the Unicode Unihan database (Unihan.zip) and loads all
 * codepoint/field/value triples into `stage.unihan_raw`.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:import-unihan
 *
 * Idempotent: uses checksum comparison to skip redundant downloads,
 * and ON CONFLICT DO UPDATE to upsert rows.
 *
 * Audit columns:
 *   sync_version — set to the current import version on every touched row
 *   is_current   — false for rows absent from the latest source file
 *   created_at   — first insert time, never changes
 *   updated_at   — changes only when the value changes or is_current flips
 *
 * After import at version N:
 *   New rows:      sync_version = N AND created_at >= last_download
 *   Changed rows:  sync_version = N AND is_current = true AND updated_at >= last_download AND created_at < last_download
 *   Restored rows: sync_version = N AND is_current = true AND updated_at >= last_download AND created_at < last_download
 *                  (previously is_current=false, now reappeared — shows up same as "changed")
 *   Removed rows:  sync_version = N AND is_current = false AND updated_at >= last_download
 *   Unchanged:     sync_version = N AND is_current = true AND updated_at < last_download
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
const UNIHAN_URL = 'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip';
const BATCH_SIZE = 1000;

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

interface UnihanRow {
	codepoint: string;
	field: string;
	value: string;
}

async function downloadUnihan(): Promise<Buffer> {
	console.log(`Downloading ${UNIHAN_URL}...`);
	const response = await fetch(UNIHAN_URL);
	if (!response.ok) {
		throw new Error(`Failed to download Unihan.zip: ${response.status} ${response.statusText}`);
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
		SELECT checksum, version FROM stage.sync_metadata WHERE source = 'unihan'
	`;
	if (rows.length === 0) return { checksum: null, version: 0 };
	return {
		checksum: rows[0].checksum as string | null,
		version: rows[0].version as number
	};
}

/**
 * Parse a single Unihan_*.txt file content into rows.
 * Lines are tab-delimited: U+XXXX<tab>kFieldName<tab>value
 * Comment lines start with # and are skipped.
 */
function parseUnihanFile(content: string): UnihanRow[] {
	const rows: UnihanRow[] = [];
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;

		const parts = trimmed.split('\t');
		if (parts.length < 3) continue;

		rows.push({
			codepoint: parts[0],
			field: parts[1],
			value: parts.slice(2).join('\t')
		});
	}
	return rows;
}

/**
 * Extract and parse all Unihan_*.txt files from the zip.
 */
async function parseUnihanZip(zipBuffer: Buffer): Promise<UnihanRow[]> {
	const allRows: UnihanRow[] = [];
	let fileCount = 0;

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

		if (!fileName.match(/^Unihan.*\.txt$/i)) continue;

		const localSig = zipBuffer.readUInt32LE(localHeaderOffset);
		if (localSig !== 0x04034b50) {
			throw new Error(`Invalid local file header for ${fileName}`);
		}

		const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
		const localFileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
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

		const rows = parseUnihanFile(content);
		for (const row of rows) allRows.push(row);
		fileCount++;
		console.log(`  Parsed ${fileName}: ${rows.length.toLocaleString()} rows`);
	}

	console.log(`Parsed ${fileCount} files, ${allRows.length.toLocaleString()} total rows`);
	return allRows;
}

async function upsertBatch(tx: Tx, batch: UnihanRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 4; // codepoint, field, value, sync_version
	const values = batch
		.map((_, i) => `($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4})`)
		.join(', ');

	const params = batch.flatMap((r) => [r.codepoint, r.field, r.value, syncVersion]);

	await tx.unsafe(
		`INSERT INTO stage.unihan_raw (codepoint, field, value, sync_version)
		VALUES ${values}
		ON CONFLICT (codepoint, field) DO UPDATE SET
			value = EXCLUDED.value,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.unihan_raw.value != EXCLUDED.value
					OR stage.unihan_raw.is_current = false
				THEN NOW()
				ELSE stage.unihan_raw.updated_at
			END`,
		params
	);
}

async function main() {
	console.log('=== Unihan Import ===\n');

	const sql = postgres(DATABASE_URL!);

	try {
		// Download
		const zipBuffer = await downloadUnihan();
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
		const rows = await parseUnihanZip(zipBuffer);

		if (rows.length === 0) {
			throw new Error('No rows parsed from Unihan.zip — something is wrong');
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

				if (processed % 50000 === 0 || processed === rows.length) {
					console.log(`  Progress: ${processed.toLocaleString()}/${rows.length.toLocaleString()}`);
				}
			}

			// Mark rows not in this load as removed
			console.log('\nMarking removed rows...');
			const removed = await tx.unsafe(
				`UPDATE stage.unihan_raw
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
				['unihan', nextVersion, checksum, rows.length]
			);
		});

		// Summary
		const meta = await sql`SELECT * FROM stage.sync_metadata WHERE source = 'unihan'`;
		const importTime = meta[0]?.last_download;

		const changeSummary = await sql`
			SELECT
				COUNT(*) FILTER (WHERE is_current = true AND created_at >= ${importTime}) AS new_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at >= ${importTime} AND created_at < ${importTime}) AS changed_rows,
				COUNT(*) FILTER (WHERE is_current = false AND updated_at >= ${importTime}) AS removed_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at < ${importTime}) AS unchanged_rows,
				COUNT(*) FILTER (WHERE is_current = true) AS total_current,
				COUNT(*) FILTER (WHERE is_current = false) AS total_removed
			FROM stage.unihan_raw
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

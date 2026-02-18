/**
 * SUBTLEX-CH Import Script
 *
 * Downloads the SUBTLEX-CH character frequency (CHR) and word frequency (WF)
 * lists and loads them into `stage.subtlex_ch_char_raw` and `stage.subtlex_ch_word_raw`.
 *
 * Source: https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch
 * Paper: Cai & Brysbaert (2010), PLOS ONE
 * Corpus: 33.5M words / 46.8M characters from 6,243 film subtitles
 *
 * Files are GBK-encoded, tab-separated, inside zip archives.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:import-subtlex-ch
 *
 * Idempotent: uses checksum comparison to skip redundant downloads,
 * and ON CONFLICT DO UPDATE to upsert rows.
 */

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import postgres, { type Row, type PendingQuery } from 'postgres';

type Tx = postgres.TransactionSql & {
	<T extends readonly (object | undefined)[] = Row[]>(
		template: TemplateStringsArray,
		...parameters: readonly postgres.ParameterOrFragment<never>[]
	): PendingQuery<T>;
};

const DATABASE_URL = process.env.DATABASE_URL;
const CHR_URL =
	'https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch/subtlexchchr.zip';
const WF_URL =
	'https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexch/subtlexchwf.zip';
const BATCH_SIZE = 500;
const SOURCE_NAME = 'subtlex_ch';

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

interface CharRow {
	character: string;
	count: number;
	perMillion: number;
	logFreq: number;
	contextDiversity: number;
	contextDiversityPct: number;
	logContextDiversity: number;
}

interface WordRow {
	word: string;
	count: number;
	perMillion: number;
	logFreq: number;
	contextDiversity: number;
	contextDiversityPct: number;
	logContextDiversity: number;
}

async function downloadAndExtract(url: string, label: string): Promise<Buffer> {
	console.log(`Downloading ${label}...`);
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to download ${label}: ${response.status} ${response.statusText}`);
	}
	const arrayBuffer = await response.arrayBuffer();
	const zipBuffer = Buffer.from(arrayBuffer);
	console.log(`  Downloaded ${(zipBuffer.byteLength / 1024).toFixed(1)} KB`);

	// Write zip to temp dir and extract
	const tmpDir = mkdtempSync(join(tmpdir(), 'subtlex-'));
	const zipPath = join(tmpDir, 'data.zip');
	const extractDir = join(tmpDir, 'out');
	const { writeFileSync, mkdirSync, readdirSync } = await import('node:fs');
	writeFileSync(zipPath, zipBuffer);
	mkdirSync(extractDir, { recursive: true });

	// Use unzip on Linux, PowerShell on Windows
	if (process.platform === 'win32') {
		execSync(`powershell -command "Expand-Archive -Force '${zipPath}' '${extractDir}'"`, {
			timeout: 15000
		});
	} else {
		execSync(`unzip -o "${zipPath}" -d "${extractDir}"`, { timeout: 15000 });
	}

	// Find the non-xlsx file (the plain text data file)
	const files = readdirSync(extractDir);
	const dataFile = files.find((f) => !f.endsWith('.xlsx'));
	if (!dataFile) {
		throw new Error(`No data file found in ${label} zip (files: ${files.join(', ')})`);
	}

	const buf = readFileSync(join(extractDir, dataFile));
	console.log(`  Extracted ${dataFile} (${(buf.byteLength / 1024).toFixed(1)} KB)`);

	// Cleanup
	rmSync(tmpDir, { recursive: true, force: true });

	return buf;
}

function decodeGbk(buf: Buffer): string {
	const decoder = new TextDecoder('gbk');
	return decoder.decode(buf);
}

function computeChecksum(...buffers: Buffer[]): string {
	const hash = createHash('sha256');
	for (const buf of buffers) hash.update(buf);
	return hash.digest('hex');
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

function parseCharFreq(content: string): { rows: CharRow[]; skipped: number } {
	const rows: CharRow[] = [];
	let skipped = 0;
	const lines = content.split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();
		// Skip header lines, empty lines, and metadata lines
		if (!trimmed || trimmed.startsWith('"') || trimmed.startsWith('Character')) continue;

		const parts = trimmed.split('\t');
		if (parts.length < 7) {
			skipped++;
			if (skipped <= 5) console.warn(`  CHR: skipping line: ${trimmed.slice(0, 80)}`);
			continue;
		}

		const character = parts[0];
		const count = parseInt(parts[1], 10);
		const perMillion = parseFloat(parts[2]);
		const logFreq = parseFloat(parts[3]);
		const contextDiversity = parseInt(parts[4], 10);
		const contextDiversityPct = parseFloat(parts[5]);
		const logContextDiversity = parseFloat(parts[6]);

		if (!character || isNaN(count)) {
			skipped++;
			if (skipped <= 5) console.warn(`  CHR: skipping bad data: ${trimmed.slice(0, 80)}`);
			continue;
		}

		rows.push({
			character,
			count,
			perMillion,
			logFreq,
			contextDiversity,
			contextDiversityPct,
			logContextDiversity
		});
	}

	return { rows, skipped };
}

function parseWordFreq(content: string): { rows: WordRow[]; skipped: number } {
	const rows: WordRow[] = [];
	let skipped = 0;
	const lines = content.split(/\r?\n/);

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('"') || trimmed.startsWith('Word')) continue;

		const parts = trimmed.split('\t');
		if (parts.length < 7) {
			skipped++;
			if (skipped <= 5) console.warn(`  WF: skipping line: ${trimmed.slice(0, 80)}`);
			continue;
		}

		const word = parts[0];
		const count = parseInt(parts[1], 10);
		const perMillion = parseFloat(parts[2]);
		const logFreq = parseFloat(parts[3]);
		const contextDiversity = parseInt(parts[4], 10);
		const contextDiversityPct = parseFloat(parts[5]);
		const logContextDiversity = parseFloat(parts[6]);

		if (!word || isNaN(count)) {
			skipped++;
			if (skipped <= 5) console.warn(`  WF: skipping bad data: ${trimmed.slice(0, 80)}`);
			continue;
		}

		rows.push({
			word,
			count,
			perMillion,
			logFreq,
			contextDiversity,
			contextDiversityPct,
			logContextDiversity
		});
	}

	return { rows, skipped };
}

async function upsertCharBatch(tx: Tx, batch: CharRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 8;
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, $${i * cols + 5}, $${i * cols + 6}, $${i * cols + 7}, $${i * cols + 8})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.character,
		r.count,
		r.perMillion,
		r.logFreq,
		r.contextDiversity,
		r.contextDiversityPct,
		r.logContextDiversity,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.subtlex_ch_char_raw
			(character, count, per_million, log_freq, context_diversity, context_diversity_pct, log_context_diversity, sync_version)
		VALUES ${values}
		ON CONFLICT (character) DO UPDATE SET
			count = EXCLUDED.count,
			per_million = EXCLUDED.per_million,
			log_freq = EXCLUDED.log_freq,
			context_diversity = EXCLUDED.context_diversity,
			context_diversity_pct = EXCLUDED.context_diversity_pct,
			log_context_diversity = EXCLUDED.log_context_diversity,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.subtlex_ch_char_raw.count != EXCLUDED.count
					OR stage.subtlex_ch_char_raw.is_current = false
				THEN NOW()
				ELSE stage.subtlex_ch_char_raw.updated_at
			END`,
		params
	);
}

async function upsertWordBatch(tx: Tx, batch: WordRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 8;
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, $${i * cols + 5}, $${i * cols + 6}, $${i * cols + 7}, $${i * cols + 8})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.word,
		r.count,
		r.perMillion,
		r.logFreq,
		r.contextDiversity,
		r.contextDiversityPct,
		r.logContextDiversity,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.subtlex_ch_word_raw
			(word, count, per_million, log_freq, context_diversity, context_diversity_pct, log_context_diversity, sync_version)
		VALUES ${values}
		ON CONFLICT (word) DO UPDATE SET
			count = EXCLUDED.count,
			per_million = EXCLUDED.per_million,
			log_freq = EXCLUDED.log_freq,
			context_diversity = EXCLUDED.context_diversity,
			context_diversity_pct = EXCLUDED.context_diversity_pct,
			log_context_diversity = EXCLUDED.log_context_diversity,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.subtlex_ch_word_raw.count != EXCLUDED.count
					OR stage.subtlex_ch_word_raw.is_current = false
				THEN NOW()
				ELSE stage.subtlex_ch_word_raw.updated_at
			END`,
		params
	);
}

function printSummary(label: string, s: Record<string, unknown>) {
	console.log(`\n  [${label}]`);
	console.log(`  New rows:      ${Number(s.new_rows).toLocaleString()}`);
	console.log(`  Changed:       ${Number(s.changed_rows).toLocaleString()}`);
	console.log(`  Removed:       ${Number(s.removed_rows).toLocaleString()}`);
	console.log(`  Unchanged:     ${Number(s.unchanged_rows).toLocaleString()}`);
	console.log(`  Total current: ${Number(s.total_current).toLocaleString()}`);
	console.log(`  Total removed: ${Number(s.total_removed).toLocaleString()}`);
}

async function main() {
	console.log('=== SUBTLEX-CH Import ===\n');

	const sql = postgres(DATABASE_URL!);

	try {
		// Download both files
		const chrBuf = await downloadAndExtract(CHR_URL, 'SUBTLEX-CH-CHR');
		const wfBuf = await downloadAndExtract(WF_URL, 'SUBTLEX-CH-WF');

		const checksum = computeChecksum(chrBuf, wfBuf);
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
		console.log('\nParsing character frequency...');
		const chrContent = decodeGbk(chrBuf);
		const { rows: charRows, skipped: chrSkipped } = parseCharFreq(chrContent);
		console.log(`  Parsed ${charRows.length.toLocaleString()} characters (${chrSkipped} skipped)`);

		console.log('Parsing word frequency...');
		const wfContent = decodeGbk(wfBuf);
		const { rows: wordRows, skipped: wfSkipped } = parseWordFreq(wfContent);
		console.log(`  Parsed ${wordRows.length.toLocaleString()} words (${wfSkipped} skipped)`);

		if (charRows.length === 0 || wordRows.length === 0) {
			throw new Error('No rows parsed — something is wrong');
		}

		// Upsert in transaction
		await sql.begin(async (_tx) => {
			const tx = _tx as Tx;

			// Characters
			console.log(`\nUpserting ${charRows.length.toLocaleString()} character rows...`);
			let processed = 0;
			for (let i = 0; i < charRows.length; i += BATCH_SIZE) {
				const batch = charRows.slice(i, i + BATCH_SIZE);
				await upsertCharBatch(tx, batch, nextVersion);
				processed += batch.length;
				if (processed % 5000 === 0 || processed === charRows.length) {
					console.log(
						`  CHR progress: ${processed.toLocaleString()}/${charRows.length.toLocaleString()}`
					);
				}
			}

			// Words
			console.log(`Upserting ${wordRows.length.toLocaleString()} word rows...`);
			processed = 0;
			for (let i = 0; i < wordRows.length; i += BATCH_SIZE) {
				const batch = wordRows.slice(i, i + BATCH_SIZE);
				await upsertWordBatch(tx, batch, nextVersion);
				processed += batch.length;
				if (processed % 25000 === 0 || processed === wordRows.length) {
					console.log(
						`  WF progress: ${processed.toLocaleString()}/${wordRows.length.toLocaleString()}`
					);
				}
			}

			// Mark removed rows
			console.log('\nMarking removed rows...');
			const chrRemoved = await tx.unsafe(
				`UPDATE stage.subtlex_ch_char_raw
				SET is_current = false, sync_version = $1, updated_at = NOW()
				WHERE sync_version < $1 AND is_current = true`,
				[nextVersion]
			);
			console.log(`  CHR: marked ${chrRemoved.count} rows as removed`);

			const wfRemoved = await tx.unsafe(
				`UPDATE stage.subtlex_ch_word_raw
				SET is_current = false, sync_version = $1, updated_at = NOW()
				WHERE sync_version < $1 AND is_current = true`,
				[nextVersion]
			);
			console.log(`  WF: marked ${wfRemoved.count} rows as removed`);

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
				[SOURCE_NAME, nextVersion, checksum, charRows.length + wordRows.length]
			);
		});

		// Summary
		const meta = await sql`SELECT * FROM stage.sync_metadata WHERE source = ${SOURCE_NAME}`;
		const importTime = meta[0]?.last_download;

		const chrSummary = await sql`
			SELECT
				COUNT(*) FILTER (WHERE is_current = true AND created_at >= ${importTime}) AS new_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at >= ${importTime} AND created_at < ${importTime}) AS changed_rows,
				COUNT(*) FILTER (WHERE is_current = false AND updated_at >= ${importTime}) AS removed_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at < ${importTime}) AS unchanged_rows,
				COUNT(*) FILTER (WHERE is_current = true) AS total_current,
				COUNT(*) FILTER (WHERE is_current = false) AS total_removed
			FROM stage.subtlex_ch_char_raw
		`;

		const wfSummary = await sql`
			SELECT
				COUNT(*) FILTER (WHERE is_current = true AND created_at >= ${importTime}) AS new_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at >= ${importTime} AND created_at < ${importTime}) AS changed_rows,
				COUNT(*) FILTER (WHERE is_current = false AND updated_at >= ${importTime}) AS removed_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at < ${importTime}) AS unchanged_rows,
				COUNT(*) FILTER (WHERE is_current = true) AS total_current,
				COUNT(*) FILTER (WHERE is_current = false) AS total_removed
			FROM stage.subtlex_ch_word_raw
		`;

		console.log('\n--- Import Summary ---');
		console.log(`Sync version:  ${nextVersion}`);
		console.log(`Checksum:      ${checksum.slice(0, 16)}...`);
		console.log(`Skipped lines: CHR=${chrSkipped}, WF=${wfSkipped}`);
		printSummary('Characters', chrSummary[0]);
		printSummary('Words', wfSummary[0]);
	} finally {
		await sql.end();
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

/**
 * Baxter-Sagart Old Chinese Reconstruction Import Script
 *
 * Downloads phonetic reconstruction data from English Wiktionary's
 * Lua data modules (Module:zh/data/och-pron-BS/) and loads them
 * into `stage.baxter_sagart_raw`.
 *
 * Source: English Wiktionary (CC BY-SA 4.0)
 * Original data: Baxter & Sagart, "Old Chinese: A New Reconstruction" (2014)
 * Format: Lua table modules, one or more characters per module
 *
 * Each character has one or more readings with fields:
 *   [pinyin, middleChinese, oldChinese, gloss]
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:import-baxter-sagart
 *
 * Idempotent: uses checksum comparison to skip redundant downloads,
 * and ON CONFLICT DO UPDATE to upsert rows.
 *
 * Audit columns: same as import-unihan.ts — see that file for query patterns.
 */

import { createHash } from 'node:crypto';
import postgres, { type Row, type PendingQuery } from 'postgres';
import { listModuleTitles, fetchModuleContents, parseLuaModule } from './wiktionary-lua-modules.js';

type Tx = postgres.TransactionSql & {
	<T extends readonly (object | undefined)[] = Row[]>(
		template: TemplateStringsArray,
		...parameters: readonly postgres.ParameterOrFragment<never>[]
	): PendingQuery<T>;
};

const DATABASE_URL = process.env.DATABASE_URL;
const MODULE_PREFIX = 'zh/data/och-pron-BS/';
const BATCH_SIZE = 500;

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

interface BsRow {
	character: string;
	pinyin: string;
	middleChinese: string;
	oldChinese: string;
	gloss: string;
}

function computeChecksum(data: string): string {
	return createHash('sha256').update(data).digest('hex');
}

async function getStoredMeta(
	sql: ReturnType<typeof postgres>
): Promise<{ checksum: string | null; version: number }> {
	const rows = await sql`
		SELECT checksum, version FROM stage.sync_metadata WHERE source = 'baxter_sagart'
	`;
	if (rows.length === 0) return { checksum: null, version: 0 };
	return {
		checksum: rows[0].checksum as string | null,
		version: rows[0].version as number
	};
}

async function upsertBatch(tx: Tx, batch: BsRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 6;
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, ` +
				`$${i * cols + 5}, $${i * cols + 6})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.character,
		r.pinyin,
		r.middleChinese,
		r.oldChinese,
		r.gloss,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.baxter_sagart_raw (character, pinyin, middle_chinese, old_chinese, gloss, sync_version)
		VALUES ${values}
		ON CONFLICT (character, middle_chinese, old_chinese) DO UPDATE SET
			pinyin = EXCLUDED.pinyin,
			gloss = EXCLUDED.gloss,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.baxter_sagart_raw.gloss != EXCLUDED.gloss
					OR stage.baxter_sagart_raw.pinyin != EXCLUDED.pinyin
					OR stage.baxter_sagart_raw.is_current = false
				THEN NOW()
				ELSE stage.baxter_sagart_raw.updated_at
			END`,
		params
	);
}

async function main() {
	console.log('=== Baxter-Sagart Import ===\n');

	const sql = postgres(DATABASE_URL!);

	try {
		// Enumerate modules
		console.log('Listing Wiktionary modules...');
		const titles = await listModuleTitles(MODULE_PREFIX);
		console.log(`Found ${titles.length.toLocaleString()} modules`);

		if (titles.length === 0) {
			throw new Error('No modules found — Wiktionary API may be down');
		}

		// Download all module contents
		console.log('\nDownloading module contents...');
		const contents = await fetchModuleContents(titles, (fetched, total) => {
			if (fetched % 500 === 0 || fetched === total) {
				console.log(`  Progress: ${fetched.toLocaleString()}/${total.toLocaleString()} modules`);
			}
		});
		console.log(`Downloaded ${contents.size.toLocaleString()} modules`);

		// Compute checksum of all content (sorted by title for determinism)
		const sortedKeys = Array.from(contents.keys()).sort();
		const allContent = sortedKeys.map((k) => contents.get(k)!).join('\n');
		const checksum = computeChecksum(allContent);
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

		// Parse all modules and merge by character
		console.log('\nParsing Lua modules...');
		const allCharacters = new Map<string, string[][]>();
		let modulesParsed = 0;
		let parseErrors = 0;

		for (const [title, content] of contents) {
			try {
				const parsed = parseLuaModule(content);
				for (const [char, readings] of parsed) {
					const existing = allCharacters.get(char);
					if (existing) {
						for (const r of readings) existing.push(r);
					} else {
						allCharacters.set(char, readings);
					}
				}
				modulesParsed++;
			} catch {
				parseErrors++;
				if (parseErrors <= 5) {
					console.warn(`  Parse error in ${title}`);
				}
			}
		}
		console.log(
			`Parsed ${modulesParsed.toLocaleString()} modules → ${allCharacters.size.toLocaleString()} characters (${parseErrors} errors)`
		);

		// Build rows — one row per reading, dedup by (character, MC, OC)
		const deduped = new Map<string, BsRow>();
		let totalReadings = 0;
		for (const [character, readings] of allCharacters) {
			for (const fields of readings) {
				totalReadings++;
				const mc = fields[1] ?? '';
				const oc = fields[2] ?? '';
				const key = `${character}\t${mc}\t${oc}`;
				const existing = deduped.get(key);
				const gloss = fields[3] ?? '';
				if (existing) {
					// Merge glosses for duplicate (character, MC, OC)
					if (gloss && !existing.gloss.includes(gloss)) {
						existing.gloss = existing.gloss ? `${existing.gloss}; ${gloss}` : gloss;
					}
				} else {
					deduped.set(key, {
						character,
						pinyin: fields[0] ?? '',
						middleChinese: mc,
						oldChinese: oc,
						gloss
					});
				}
			}
		}
		const rows = Array.from(deduped.values());
		console.log(
			`  ${totalReadings.toLocaleString()} readings → ${rows.length.toLocaleString()} unique (character, MC, OC) rows`
		);

		if (rows.length === 0) {
			throw new Error('No characters parsed — something is wrong');
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
				`UPDATE stage.baxter_sagart_raw
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
				['baxter_sagart', nextVersion, checksum, rows.length]
			);
		});

		// Summary
		const meta = await sql`SELECT * FROM stage.sync_metadata WHERE source = 'baxter_sagart'`;
		const importTime = meta[0]?.last_download;

		const changeSummary = await sql`
			SELECT
				COUNT(*) FILTER (WHERE is_current = true AND created_at >= ${importTime}) AS new_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at >= ${importTime} AND created_at < ${importTime}) AS changed_rows,
				COUNT(*) FILTER (WHERE is_current = false AND updated_at >= ${importTime}) AS removed_rows,
				COUNT(*) FILTER (WHERE is_current = true AND updated_at < ${importTime}) AS unchanged_rows,
				COUNT(*) FILTER (WHERE is_current = true) AS total_current,
				COUNT(*) FILTER (WHERE is_current = false) AS total_removed
			FROM stage.baxter_sagart_raw
			WHERE sync_version = ${nextVersion}
		`;
		const s = changeSummary[0];

		console.log('\n--- Import Summary ---');
		console.log(`Sync version:  ${nextVersion}`);
		console.log(`Checksum:      ${checksum.slice(0, 16)}...`);
		console.log(`Parse errors:  ${parseErrors}`);
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

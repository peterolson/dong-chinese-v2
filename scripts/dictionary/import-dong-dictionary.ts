/**
 * Dong Chinese Dictionary Import Script
 *
 * Syncs the dictionary.char, dictionary.word, and dictionary.history collections
 * from the production MongoDB into Postgres staging tables.
 *
 * Source: MongoDB dong-chinese database
 *
 * Usage:
 *   MONGODB_URI=mongodb://... DATABASE_URL=postgres://... npm run dictionary:import-dong-dictionary
 *
 * Idempotent: uses checksum comparison to skip redundant syncs,
 * and ON CONFLICT DO UPDATE to upsert rows.
 *
 * Documents are stored with key indexed columns extracted plus the full
 * MongoDB document as JSONB for flexible querying.
 */

import { createHash } from 'node:crypto';
import { MongoClient } from 'mongodb';
import postgres, { type Row, type PendingQuery } from 'postgres';

type Tx = postgres.TransactionSql & {
	<T extends readonly (object | undefined)[] = Row[]>(
		template: TemplateStringsArray,
		...parameters: readonly postgres.ParameterOrFragment<never>[]
	): PendingQuery<T>;
};

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_URL = process.env.DATABASE_URL;
const BATCH_SIZE = 500;
const SOURCE_NAME = 'dong_dictionary';
const MONGO_DB_NAME = 'dong-chinese';

if (!MONGODB_URI) {
	console.error('Error: MONGODB_URI environment variable is required');
	process.exit(1);
}
if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CharRow {
	mongoId: string;
	char: string;
	codepoint: string;
	strokeCount: number | null;
	gloss: string | null;
	data: string; // JSON string
}

interface WordRow {
	mongoId: string;
	simp: string;
	trad: string;
	gloss: string | null;
	data: string; // JSON string
}

interface HistoryRow {
	mongoId: string;
	entryType: string; // 'char' or 'word'
	entryKey: string;
	userId: string;
	timestamp: Date;
	comment: string;
	isApproved: boolean | null;
	data: string; // JSON string
}

// ---------------------------------------------------------------------------
// MongoDB helpers
// ---------------------------------------------------------------------------

function serializeDoc(doc: Record<string, unknown>): string {
	return JSON.stringify(doc, (_key, value) => {
		// Convert ObjectId to hex string for JSON serialization
		if (value && typeof value === 'object' && value.constructor?.name === 'ObjectId') {
			return value.toString();
		}
		return value;
	});
}

// ---------------------------------------------------------------------------
// Fetch from MongoDB
// ---------------------------------------------------------------------------

async function fetchChars(mongo: MongoClient): Promise<CharRow[]> {
	console.log('Fetching dictionary.char...');
	const col = mongo.db(MONGO_DB_NAME).collection('dictionary.char');
	const docs = await col.find().toArray();
	console.log(`  Found ${docs.length.toLocaleString()} documents`);

	return docs.map((doc) => ({
		mongoId: doc._id.toString(),
		char: (doc.char as string) || '',
		codepoint: (doc.codepoint as string) || '',
		strokeCount: typeof doc.strokeCount === 'number' ? doc.strokeCount : null,
		gloss: typeof doc.gloss === 'string' ? doc.gloss : null,
		data: serializeDoc(doc as Record<string, unknown>)
	}));
}

async function fetchWords(mongo: MongoClient): Promise<WordRow[]> {
	console.log('Fetching dictionary.word...');
	const col = mongo.db(MONGO_DB_NAME).collection('dictionary.word');
	const docs = await col.find().toArray();
	console.log(`  Found ${docs.length.toLocaleString()} documents`);

	return docs.map((doc) => ({
		mongoId: doc._id.toString(),
		simp: (doc.simp as string) || '',
		trad: (doc.trad as string) || '',
		gloss: typeof doc.gloss === 'string' ? doc.gloss : null,
		data: serializeDoc(doc as Record<string, unknown>)
	}));
}

async function fetchHistory(mongo: MongoClient): Promise<HistoryRow[]> {
	console.log('Fetching dictionary.history...');
	const col = mongo.db(MONGO_DB_NAME).collection('dictionary.history');
	const docs = await col.find().toArray();
	console.log(`  Found ${docs.length.toLocaleString()} documents`);

	return docs.map((doc) => {
		const isChar = 'char' in doc;
		return {
			mongoId: doc._id.toString(),
			entryType: isChar ? 'char' : 'word',
			entryKey: isChar ? (doc.char as string) || '' : (doc.simp as string) || '',
			userId: (doc.userId as string) || '',
			timestamp: new Date(doc.timestamp as number),
			comment: typeof doc.comment === 'string' ? doc.comment : '',
			isApproved: typeof doc.isApproved === 'boolean' ? doc.isApproved : null,
			data: serializeDoc(doc as Record<string, unknown>)
		};
	});
}

// ---------------------------------------------------------------------------
// Upsert functions
// ---------------------------------------------------------------------------

async function upsertCharBatch(tx: Tx, batch: CharRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 7;
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, $${i * cols + 5}, $${i * cols + 6}::jsonb, $${i * cols + 7})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.mongoId,
		r.char,
		r.codepoint,
		r.strokeCount,
		r.gloss,
		r.data,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.dong_dict_char_raw
			(mongo_id, char, codepoint, stroke_count, gloss, data, sync_version)
		VALUES ${values}
		ON CONFLICT (mongo_id) DO UPDATE SET
			char = EXCLUDED.char,
			codepoint = EXCLUDED.codepoint,
			stroke_count = EXCLUDED.stroke_count,
			gloss = EXCLUDED.gloss,
			data = EXCLUDED.data,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.dong_dict_char_raw.data IS DISTINCT FROM EXCLUDED.data
					OR stage.dong_dict_char_raw.is_current = false
				THEN NOW()
				ELSE stage.dong_dict_char_raw.updated_at
			END`,
		params
	);
}

async function upsertWordBatch(tx: Tx, batch: WordRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 6;
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, $${i * cols + 5}::jsonb, $${i * cols + 6})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [r.mongoId, r.simp, r.trad, r.gloss, r.data, syncVersion]);

	await tx.unsafe(
		`INSERT INTO stage.dong_dict_word_raw
			(mongo_id, simp, trad, gloss, data, sync_version)
		VALUES ${values}
		ON CONFLICT (mongo_id) DO UPDATE SET
			simp = EXCLUDED.simp,
			trad = EXCLUDED.trad,
			gloss = EXCLUDED.gloss,
			data = EXCLUDED.data,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.dong_dict_word_raw.data IS DISTINCT FROM EXCLUDED.data
					OR stage.dong_dict_word_raw.is_current = false
				THEN NOW()
				ELSE stage.dong_dict_word_raw.updated_at
			END`,
		params
	);
}

async function upsertHistoryBatch(tx: Tx, batch: HistoryRow[], syncVersion: number): Promise<void> {
	if (batch.length === 0) return;

	const cols = 9;
	const values = batch
		.map(
			(_, i) =>
				`($${i * cols + 1}, $${i * cols + 2}, $${i * cols + 3}, $${i * cols + 4}, $${i * cols + 5}, $${i * cols + 6}, $${i * cols + 7}, $${i * cols + 8}::jsonb, $${i * cols + 9})`
		)
		.join(', ');

	const params = batch.flatMap((r) => [
		r.mongoId,
		r.entryType,
		r.entryKey,
		r.userId,
		r.timestamp.toISOString(),
		r.comment,
		r.isApproved,
		r.data,
		syncVersion
	]);

	await tx.unsafe(
		`INSERT INTO stage.dong_dict_history_raw
			(mongo_id, entry_type, entry_key, user_id, timestamp, comment, is_approved, data, sync_version)
		VALUES ${values}
		ON CONFLICT (mongo_id) DO UPDATE SET
			entry_type = EXCLUDED.entry_type,
			entry_key = EXCLUDED.entry_key,
			user_id = EXCLUDED.user_id,
			timestamp = EXCLUDED.timestamp,
			comment = EXCLUDED.comment,
			is_approved = EXCLUDED.is_approved,
			data = EXCLUDED.data,
			sync_version = EXCLUDED.sync_version,
			is_current = true,
			updated_at = CASE
				WHEN stage.dong_dict_history_raw.data IS DISTINCT FROM EXCLUDED.data
					OR stage.dong_dict_history_raw.is_current = false
				THEN NOW()
				ELSE stage.dong_dict_history_raw.updated_at
			END`,
		params
	);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

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
	console.log('=== Dong Chinese Dictionary Import ===\n');

	const mongo = new MongoClient(MONGODB_URI!);
	const sql = postgres(DATABASE_URL!);

	try {
		await mongo.connect();

		// Fetch all data from MongoDB
		const charRows = await fetchChars(mongo);
		const wordRows = await fetchWords(mongo);
		const historyRows = await fetchHistory(mongo);

		await mongo.close();
		console.log('');

		// Compute checksum over all data
		const hash = createHash('sha256');
		for (const r of charRows) hash.update(r.data);
		for (const r of wordRows) hash.update(r.data);
		for (const r of historyRows) hash.update(r.data);
		const checksum = hash.digest('hex');
		console.log(`Checksum: ${checksum}`);

		// Check if we already have this version
		const storedRows = await sql`
			SELECT checksum, version FROM stage.sync_metadata WHERE source = ${SOURCE_NAME}
		`;
		const stored =
			storedRows.length === 0
				? { checksum: null, version: 0 }
				: {
						checksum: storedRows[0].checksum as string | null,
						version: storedRows[0].version as number
					};

		if (stored.checksum === checksum) {
			console.log('Checksum matches stored version — skipping import.');
			await sql.end();
			return;
		}

		const nextVersion = stored.version + 1;
		console.log(`Import version: ${nextVersion} (previous: ${stored.version})`);

		// Upsert in transaction
		await sql.begin(async (_tx) => {
			const tx = _tx as Tx;

			// Characters
			console.log(`\nUpserting ${charRows.length.toLocaleString()} char rows...`);
			let processed = 0;
			for (let i = 0; i < charRows.length; i += BATCH_SIZE) {
				const batch = charRows.slice(i, i + BATCH_SIZE);
				await upsertCharBatch(tx, batch, nextVersion);
				processed += batch.length;
				if (processed % 10000 === 0 || processed === charRows.length) {
					console.log(
						`  Progress: ${processed.toLocaleString()}/${charRows.length.toLocaleString()}`
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
						`  Progress: ${processed.toLocaleString()}/${wordRows.length.toLocaleString()}`
					);
				}
			}

			// History
			console.log(`Upserting ${historyRows.length.toLocaleString()} history rows...`);
			processed = 0;
			for (let i = 0; i < historyRows.length; i += BATCH_SIZE) {
				const batch = historyRows.slice(i, i + BATCH_SIZE);
				await upsertHistoryBatch(tx, batch, nextVersion);
				processed += batch.length;
				if (processed % 5000 === 0 || processed === historyRows.length) {
					console.log(
						`  Progress: ${processed.toLocaleString()}/${historyRows.length.toLocaleString()}`
					);
				}
			}

			// Mark removed rows
			console.log('\nMarking removed rows...');
			for (const table of ['dong_dict_char_raw', 'dong_dict_word_raw', 'dong_dict_history_raw']) {
				const removed = await tx.unsafe(
					`UPDATE stage.${table}
					SET is_current = false, sync_version = $1, updated_at = NOW()
					WHERE sync_version < $1 AND is_current = true`,
					[nextVersion]
				);
				console.log(`  ${table}: marked ${removed.count} rows as removed`);
			}

			// Update sync metadata
			const totalRows = charRows.length + wordRows.length + historyRows.length;
			await tx.unsafe(
				`INSERT INTO stage.sync_metadata (source, version, last_download, checksum, row_count, updated_at)
				VALUES ($1, $2, NOW(), $3, $4, NOW())
				ON CONFLICT (source) DO UPDATE SET
					version = EXCLUDED.version,
					last_download = NOW(),
					checksum = EXCLUDED.checksum,
					row_count = EXCLUDED.row_count,
					updated_at = NOW()`,
				[SOURCE_NAME, nextVersion, checksum, totalRows]
			);
		});

		// Summary
		const meta = await sql`SELECT * FROM stage.sync_metadata WHERE source = ${SOURCE_NAME}`;
		const importTime = meta[0]?.last_download;

		for (const [label, table] of [
			['Characters', 'dong_dict_char_raw'],
			['Words', 'dong_dict_word_raw'],
			['History', 'dong_dict_history_raw']
		] as const) {
			const summary = await sql.unsafe(
				`SELECT
					COUNT(*) FILTER (WHERE is_current = true AND created_at >= $1) AS new_rows,
					COUNT(*) FILTER (WHERE is_current = true AND updated_at >= $1 AND created_at < $1) AS changed_rows,
					COUNT(*) FILTER (WHERE is_current = false AND updated_at >= $1) AS removed_rows,
					COUNT(*) FILTER (WHERE is_current = true AND updated_at < $1) AS unchanged_rows,
					COUNT(*) FILTER (WHERE is_current = true) AS total_current,
					COUNT(*) FILTER (WHERE is_current = false) AS total_removed
				FROM stage.${table}`,
				[importTime]
			);
			printSummary(label, summary[0]);
		}

		console.log(`\nSync version:  ${nextVersion}`);
		console.log(`Checksum:      ${checksum.slice(0, 16)}...`);
	} finally {
		await mongo.close().catch(() => {});
		await sql.end();
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

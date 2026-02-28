/**
 * Import Legacy History into char_manual
 *
 * Reads char-type edits from stage.dong_dict_history_raw and inserts them
 * into dictionary.char_manual, preserving the full edit history from the
 * Meteor-era MongoDB.
 *
 * Status mapping:
 *   isApproved = true  → 'approved'
 *   isApproved = false → 'rejected'
 *   isApproved = null  → 'approved' (pre-approval-system edits)
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run import:legacy-history
 *
 * Idempotent: skips rows whose mongo_id already exists in char_manual.edit_comment
 * (stored as a prefix tag "[mongo:<id>] ...").
 */

import postgres, { type Row, type PendingQuery } from 'postgres';

type Tx = postgres.TransactionSql & {
	<T extends readonly (object | undefined)[] = Row[]>(
		template: TemplateStringsArray,
		...parameters: readonly postgres.ParameterOrFragment<never>[]
	): PendingQuery<T>;
};

const DATABASE_URL = process.env.DATABASE_URL;
const BATCH_SIZE = 500;

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryRawRow {
	mongo_id: string;
	entry_key: string;
	user_id: string;
	timestamp: Date;
	comment: string;
	is_approved: boolean | null;
	data: Record<string, unknown>;
}

/** Parsed snapshot of a character from MongoDB changes/previous */
interface CharSnapshot {
	gloss?: string | null;
	hint?: string | null;
	originalMeaning?: string | null;
	isVerified?: boolean | null;
	components?: unknown;
	customSources?: unknown;
	codepoint?: string | null;
	strokeCount?: number | null;
	images?: unknown[];
	oldPronunciations?: unknown[];
	pinyinFrequencies?: Array<{ pinyin: string; count: number }>;
	shuowen?: string | null;
}

interface CharManualRow {
	character: string;
	codepoint: string | null;
	gloss: string | null;
	hint: string | null;
	originalMeaning: string | null;
	strokeCountSimp: number | null;
	strokeCountTrad: number | null;
	isVerified: boolean | null;
	components: unknown;
	customSources: unknown;
	strokeDataSimp: unknown;
	strokeDataTrad: unknown;
	fragmentsSimp: unknown;
	fragmentsTrad: unknown;
	historicalImages: unknown;
	historicalPronunciations: unknown;
	shuowenExplanation: string | null;
	pinyinFrequencies: unknown;
	pinyin: string[] | null;
	changedFields: string[] | null;
	status: string;
	reviewedBy: string | null;
	reviewedAt: Date | null;
	reviewComment: string | null;
	editedBy: string | null;
	editComment: string;
	createdAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson(v: unknown): unknown {
	if (typeof v === 'string') {
		try {
			return JSON.parse(v);
		} catch {
			return v;
		}
	}
	return v;
}

function parseSnapshot(raw: unknown): CharSnapshot | null {
	const obj = parseJson(raw);
	if (!obj || typeof obj !== 'object') return null;
	return obj as CharSnapshot;
}

/**
 * Extract stroke data and historical images from a MongoDB images array.
 * The last image entry with a `data` sub-object containing strokes/medians
 * is the curated stroke data. Everything else is a historical image.
 */
function splitImages(images: unknown[]): {
	strokeData: { strokes: string[]; medians: number[][][] } | null;
	fragments: unknown;
	historicalImages: unknown[] | null;
} {
	let strokeData: { strokes: string[]; medians: number[][][] } | null = null;
	let fragments: unknown = null;
	let strokeIndex = -1;

	// Find the last image entry with stroke data
	for (let i = images.length - 1; i >= 0; i--) {
		const img = images[i] as Record<string, unknown>;
		const d = parseJson(img?.data) as Record<string, unknown> | null;
		if (d?.strokes && d?.medians) {
			strokeData = {
				strokes: parseJson(d.strokes) as string[],
				medians: parseJson(d.medians) as number[][][]
			};
			fragments = img.fragments ? parseJson(img.fragments) : null;
			strokeIndex = i;
			break;
		}
	}

	// Everything else is a historical image
	const historical = images.filter((_, i) => {
		if (i === strokeIndex) return false;
		const img = images[i] as Record<string, unknown>;
		const d = parseJson(img?.data) as Record<string, unknown> | null;
		// Also exclude any other entries that have stroke data
		return !d?.strokes;
	});

	return {
		strokeData,
		fragments,
		historicalImages: historical.length > 0 ? historical : null
	};
}

/**
 * Derive pinyin array from pinyinFrequencies (top 3 by count, deduplicated).
 */
function derivePinyin(pf: Array<{ pinyin: string; count: number }> | undefined): string[] | null {
	if (!pf || pf.length === 0) return null;
	const seen = new Set<string>();
	const result: string[] = [];
	// Sort by count descending
	const sorted = [...pf].sort((a, b) => b.count - a.count);
	for (const entry of sorted) {
		if (!entry.pinyin) continue;
		const lower = entry.pinyin.toLowerCase();
		if (!seen.has(lower)) {
			seen.add(lower);
			result.push(lower);
		}
		if (result.length >= 3) break;
	}
	return result.length > 0 ? result : null;
}

/**
 * Normalize legacy MongoDB pronunciation entries.
 * The old Meteor schema used MC/OC as field names; our DB schema uses middleChinese/oldChinese.
 */
function normalizeHistoricalPronunciations(raw: unknown): unknown[] | null {
	if (!raw || !Array.isArray(raw) || raw.length === 0) return null;
	return raw.map((entry) => {
		const e = entry as Record<string, unknown>;
		const result: Record<string, unknown> = { source: e.source };
		// Map MC → middleChinese, OC → oldChinese (prefer canonical names if both exist)
		const mc = (e.middleChinese as string | undefined) ?? (e.MC as string | undefined);
		const oc = (e.oldChinese as string | undefined) ?? (e.OC as string | undefined);
		if (mc) result.middleChinese = mc;
		if (oc) result.oldChinese = oc;
		if (e.pinyin) result.pinyin = e.pinyin;
		if (e.gloss) result.gloss = e.gloss;
		if (e.phoneticSeries) result.phoneticSeries = e.phoneticSeries;
		if (e.rhymeGroup) result.rhymeGroup = e.rhymeGroup;
		if (e.notes) result.notes = e.notes;
		return result;
	});
}

/**
 * Fields we can diff between changes and previous to compute changedFields.
 * Intentionally broader than EDITABLE_FIELDS — legacy edits could modify fields
 * like codepoint, pinyinFrequencies, and shuowenExplanation that are now read-only.
 */
const DIFFABLE_FIELDS: Array<{
	mongoKey: string;
	manualKey: string;
}> = [
	{ mongoKey: 'gloss', manualKey: 'gloss' },
	{ mongoKey: 'hint', manualKey: 'hint' },
	{ mongoKey: 'originalMeaning', manualKey: 'originalMeaning' },
	{ mongoKey: 'isVerified', manualKey: 'isVerified' },
	{ mongoKey: 'components', manualKey: 'components' },
	{ mongoKey: 'customSources', manualKey: 'customSources' },
	{ mongoKey: 'codepoint', manualKey: 'codepoint' },
	{ mongoKey: 'strokeCount', manualKey: 'strokeCountSimp' },
	{ mongoKey: 'images', manualKey: 'images' }, // special: expands to multiple fields
	{ mongoKey: 'oldPronunciations', manualKey: 'historicalPronunciations' },
	{ mongoKey: 'pinyinFrequencies', manualKey: 'pinyinFrequencies' },
	{ mongoKey: 'shuowen', manualKey: 'shuowenExplanation' }
];

/**
 * Compute which char_manual fields changed between previous and changes snapshots.
 */
function computeChangedFields(
	changes: CharSnapshot | null,
	previous: CharSnapshot | null
): string[] | null {
	if (!changes || !previous) return null; // no previous → can't diff

	const changed: string[] = [];

	for (const { mongoKey, manualKey } of DIFFABLE_FIELDS) {
		const cVal = (changes as Record<string, unknown>)[mongoKey];
		const pVal = (previous as Record<string, unknown>)[mongoKey];

		if (JSON.stringify(cVal) !== JSON.stringify(pVal)) {
			if (manualKey === 'images') {
				// Images field maps to multiple char_manual columns
				changed.push('strokeDataSimp', 'fragmentsSimp', 'historicalImages');
			} else {
				changed.push(manualKey);
			}
		}
	}

	// If pinyinFrequencies changed, pinyin is also derived from it
	if (changed.includes('pinyinFrequencies')) {
		changed.push('pinyin');
	}

	return changed.length > 0 ? changed : null;
}

/**
 * Map a history row to a char_manual insert row.
 */
function mapToCharManual(row: HistoryRawRow): CharManualRow {
	const data = row.data;
	const changes = parseSnapshot(data.changes);
	const previous = parseSnapshot(data.previous);

	// Extract fields from changes snapshot
	const gloss = (changes?.gloss as string | null | undefined) ?? null;
	const hint = (changes?.hint as string | null | undefined) ?? null;
	const originalMeaning = (changes?.originalMeaning as string | null | undefined) ?? null;
	const isVerified = changes?.isVerified != null ? Boolean(changes.isVerified) : null;
	const components = changes?.components ? parseJson(changes.components) : null;
	const customSources = changes?.customSources ? parseJson(changes.customSources) : null;
	const codepoint = (changes?.codepoint as string | null | undefined) ?? null;
	const strokeCountSimp = typeof changes?.strokeCount === 'number' ? changes.strokeCount : null;

	// Images → stroke data + historical images
	const images = changes?.images ? (parseJson(changes.images) as unknown[]) : null;
	let strokeDataSimp: unknown = null;
	let fragmentsSimp: unknown = null;
	let historicalImages: unknown = null;

	if (images && Array.isArray(images)) {
		const split = splitImages(images);
		if (split.strokeData) {
			strokeDataSimp = {
				strokes: split.strokeData.strokes,
				medians: split.strokeData.medians,
				source: 'dong'
			};
		}
		fragmentsSimp = split.fragments;
		historicalImages = split.historicalImages;
	}

	// Historical pronunciations — normalize legacy MC/OC keys to middleChinese/oldChinese
	const rawProns = changes?.oldPronunciations ? parseJson(changes.oldPronunciations) : null;
	const historicalPronunciations = normalizeHistoricalPronunciations(rawProns);

	// Pinyin frequencies
	const rawPf = changes?.pinyinFrequencies
		? (parseJson(changes.pinyinFrequencies) as Array<{ pinyin: string; count: number }>)
		: null;
	const pinyinFrequencies = rawPf && rawPf.length > 0 ? rawPf : null;

	// Shuowen
	const shuowenExplanation = typeof changes?.shuowen === 'string' ? changes.shuowen : null;

	// Pinyin derived from frequencies
	const pinyin = rawPf ? derivePinyin(rawPf) : null;

	// Status mapping
	let status: string;
	if (row.is_approved === true) {
		status = 'approved';
	} else if (row.is_approved === false) {
		status = 'rejected';
	} else {
		// null isApproved → pre-approval-system edit, treat as approved
		status = 'approved';
	}

	// Reviewer info
	const approver = data.approver as string | null | undefined;
	const approvalTimestamp = data.approvalTimestamp as number | null | undefined;
	const reviewedBy = approver && approver !== '' ? approver : null;
	const reviewedAt = approvalTimestamp != null ? new Date(approvalTimestamp) : null;
	// The legacy MongoDB schema only stored rejectionReason — approved edits had no comment field.
	const rejectionReason = data.rejectionReason as string | null | undefined;
	const reviewComment =
		rejectionReason && rejectionReason.trim() !== '' ? rejectionReason.trim() : null;

	// Changed fields
	const changedFields = computeChangedFields(changes, previous);

	// Tag the edit comment with the mongo ID for idempotency
	const editComment = `[mongo:${row.mongo_id}] ${row.comment}`;

	// simplifiedVariants / traditionalVariants are omitted — the legacy schema didn't track them.
	return {
		character: row.entry_key,
		codepoint,
		gloss,
		hint,
		originalMeaning,
		strokeCountSimp,
		strokeCountTrad: null,
		isVerified,
		components,
		customSources,
		strokeDataSimp,
		strokeDataTrad: null,
		fragmentsSimp,
		fragmentsTrad: null,
		historicalImages,
		historicalPronunciations,
		shuowenExplanation,
		pinyinFrequencies,
		pinyin,
		changedFields,
		status,
		reviewedBy,
		reviewedAt,
		reviewComment,
		editedBy: row.user_id || null,
		editComment,
		createdAt: row.timestamp
	};
}

// ---------------------------------------------------------------------------
// Batch insert
// ---------------------------------------------------------------------------

const INSERT_COLUMNS = [
	'character',
	'codepoint',
	'gloss',
	'hint',
	'original_meaning',
	'stroke_count_simp',
	'stroke_count_trad',
	'is_verified',
	'components',
	'custom_sources',
	'stroke_data_simp',
	'stroke_data_trad',
	'fragments_simp',
	'fragments_trad',
	'historical_images',
	'historical_pronunciations',
	'shuowen_explanation',
	'pinyin_frequencies',
	'pinyin',
	'changed_fields',
	'status',
	'reviewed_by',
	'reviewed_at',
	'review_comment',
	'edited_by',
	'edit_comment',
	'created_at'
] as const;

function toDbRow(r: CharManualRow): Record<string, unknown> {
	return {
		character: r.character,
		codepoint: r.codepoint,
		gloss: r.gloss,
		hint: r.hint,
		original_meaning: r.originalMeaning,
		stroke_count_simp: r.strokeCountSimp,
		stroke_count_trad: r.strokeCountTrad,
		is_verified: r.isVerified,
		components: r.components,
		custom_sources: r.customSources,
		stroke_data_simp: r.strokeDataSimp,
		stroke_data_trad: r.strokeDataTrad,
		fragments_simp: r.fragmentsSimp,
		fragments_trad: r.fragmentsTrad,
		historical_images: r.historicalImages,
		historical_pronunciations: r.historicalPronunciations,
		shuowen_explanation: r.shuowenExplanation,
		pinyin_frequencies: r.pinyinFrequencies,
		pinyin: r.pinyin,
		changed_fields: r.changedFields,
		status: r.status,
		reviewed_by: r.reviewedBy,
		reviewed_at: r.reviewedAt,
		review_comment: r.reviewComment,
		edited_by: r.editedBy,
		edit_comment: r.editComment,
		created_at: r.createdAt
	};
}

async function insertBatch(tx: Tx, batch: CharManualRow[]): Promise<void> {
	if (batch.length === 0) return;
	const dbRows = batch.map(toDbRow);
	await tx`INSERT INTO dictionary.char_manual ${tx(dbRows, ...INSERT_COLUMNS)}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	console.log('=== Import Legacy History into char_manual ===\n');
	const startTime = Date.now();

	const sql = postgres(DATABASE_URL!);

	try {
		// Fix double-encoded JSONB data (string-inside-jsonb from old import)
		const fixed = await sql`
			UPDATE stage.dong_dict_history_raw
			SET data = (data#>>'{}')::jsonb
			WHERE jsonb_typeof(data) = 'string'
		`;
		if (Number(fixed.count) > 0) {
			console.log(`Fixed ${fixed.count} double-encoded rows in dong_dict_history_raw`);
		}

		// Load already-imported mongo IDs for incremental idempotency
		console.log('Checking for existing legacy imports...');
		const existingRows = await sql`
			SELECT edit_comment FROM dictionary.char_manual
			WHERE edit_comment LIKE '[mongo:%'
		`;
		const importedIds = new Set<string>();
		for (const r of existingRows) {
			const match = (r.edit_comment as string).match(/^\[mongo:(\S+)\]/);
			if (match) importedIds.add(match[1]);
		}
		if (importedIds.size > 0) {
			console.log(`  ${importedIds.size.toLocaleString()} already imported`);
		}

		// Load all char history rows
		console.log('Loading char history from stage.dong_dict_history_raw...');
		const rows = await sql<HistoryRawRow[]>`
			SELECT mongo_id, entry_key, user_id, timestamp, comment, is_approved, data
			FROM stage.dong_dict_history_raw
			WHERE is_current = true AND entry_type = 'char'
			ORDER BY timestamp ASC
		`;
		console.log(`  ${rows.length.toLocaleString()} rows loaded`);

		// Map to char_manual rows, skipping already-imported
		console.log('Mapping to char_manual format...');
		const manualRows: CharManualRow[] = [];
		let skipped = 0;
		let alreadyImported = 0;

		for (const row of rows) {
			if (importedIds.has(row.mongo_id)) {
				alreadyImported++;
				continue;
			}
			const data = row.data;
			const changes = parseJson(data.changes);
			if (!changes || typeof changes !== 'object') {
				skipped++;
				continue;
			}
			manualRows.push(mapToCharManual(row));
		}
		console.log(
			`  ${manualRows.length.toLocaleString()} new, ${alreadyImported.toLocaleString()} already imported, ${skipped} skipped (no changes)`
		);

		if (manualRows.length === 0) {
			console.log('\nNothing to import.');
			await sql.end();
			return;
		}

		// Batch insert
		console.log(
			`\nInserting ${manualRows.length.toLocaleString()} rows into dictionary.char_manual...`
		);
		await sql.begin(async (_tx) => {
			const tx = _tx as Tx;
			let processed = 0;
			for (let i = 0; i < manualRows.length; i += BATCH_SIZE) {
				const batch = manualRows.slice(i, i + BATCH_SIZE);
				await insertBatch(tx, batch);
				processed += batch.length;
				if (processed % 2000 === 0 || processed === manualRows.length) {
					console.log(
						`  Progress: ${processed.toLocaleString()}/${manualRows.length.toLocaleString()}`
					);
				}
			}
		});

		// Summary
		const summary = await sql`
			SELECT
				count(*)::int AS total,
				count(*) FILTER (WHERE status = 'approved')::int AS approved,
				count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
				count(*) FILTER (WHERE status = 'pending')::int AS pending,
				count(*) FILTER (WHERE changed_fields IS NOT NULL)::int AS has_changed_fields
			FROM dictionary.char_manual
			WHERE edit_comment LIKE '[mongo:%'
		`;
		const s = summary[0];
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

		console.log(`\n=== Done ===`);
		console.log(`Total imported: ${s.total}`);
		console.log(`  Approved:  ${s.approved}`);
		console.log(`  Rejected:  ${s.rejected}`);
		console.log(`  Pending:   ${s.pending}`);
		console.log(`  With changedFields: ${s.has_changed_fields}`);
		console.log(`Time: ${elapsed}s`);
	} finally {
		await sql.end();
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

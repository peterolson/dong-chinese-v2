import { db } from '$lib/server/db';
import { charBase, charManual } from '$lib/server/db/dictionary.schema';
import { charView } from '$lib/server/db/dictionary.views';
import { eq, desc, and, sql } from 'drizzle-orm';
import { EDITABLE_FIELDS } from '$lib/data/editable-fields';
import { computeChangedFields } from '$lib/data/deep-equal';

export type CharManualInsert = typeof charManual.$inferInsert;
export type CharManualRow = typeof charManual.$inferSelect;

/** Strip internal import tags (e.g. "[mongo:cb6rRRWzdwKX4NdAb]") from edit comments for display. */
function stripImportTag(comment: string): string {
	return comment.replace(/^\[mongo:[A-Za-z0-9]{17,24}\]\s*/, '');
}

export class CharEditError extends Error {
	code: string;
	constructor(code: string, message: string) {
		super(message);
		this.code = code;
	}
}

/**
 * Submit a character edit. If autoApprove is true (caller has wikiEdit permission),
 * the edit is immediately approved. Otherwise it's pending review.
 *
 * autoApprove requires a userId — anonymous users cannot auto-approve.
 * Requires at least one of userId or anonymousSessionId for attribution.
 * The character must exist in char_base — edits for unknown characters are rejected
 * because the dictionary.char view is driven by char_base.
 *
 * Computes changedFields by diffing submitted data against the current char view state.
 */
export async function submitCharEdit(params: {
	character: string;
	data: Omit<
		CharManualInsert,
		| 'id'
		| 'character'
		| 'changedFields'
		| 'status'
		| 'reviewedBy'
		| 'reviewedAt'
		| 'reviewComment'
		| 'editedBy'
		| 'anonymousSessionId'
		| 'editComment'
		| 'createdAt'
	>;
	editedBy: { userId?: string; anonymousSessionId?: string };
	editComment: string;
	autoApprove: boolean;
}): Promise<{ id: string; status: 'pending' | 'approved' }> {
	if (!params.editedBy.userId && !params.editedBy.anonymousSessionId) {
		throw new Error('At least one of userId or anonymousSessionId is required');
	}

	// Load char_base (needed for existence check + COALESCE-aware change detection)
	const [baseState] = await db
		.select()
		.from(charBase)
		.where(eq(charBase.character, params.character));
	if (!baseState) {
		throw new Error(`Character '${params.character}' does not exist in char_base`);
	}

	// Load current state from the char view (COALESCE overlay of manual on base)
	const [currentState] = await db
		.select()
		.from(charView)
		.where(eq(charView.character, params.character));

	// Build effective post-approval values. The char view uses COALESCE(manual, base),
	// so a null in char_manual falls through to char_base. We must diff against the
	// effective value (submitted ?? base) to avoid recording no-op changes where a user
	// clears a field that has a base value — approving null just exposes the base value.
	const submittedRecord = params.data as unknown as Record<string, unknown>;
	const baseRecord = baseState as unknown as Record<string, unknown>;
	const effectiveSubmitted: Record<string, unknown> = {};
	for (const field of EDITABLE_FIELDS) {
		if (field in submittedRecord) {
			effectiveSubmitted[field] = submittedRecord[field] ?? baseRecord[field];
		}
	}

	const referenceState = (currentState ?? baseState) as unknown as Record<string, unknown>;
	const changedFields = computeChangedFields(referenceState, effectiveSubmitted, EDITABLE_FIELDS);

	if (changedFields.length === 0) {
		throw new CharEditError('NO_FIELDS_CHANGED', 'No fields were changed');
	}

	// Auto-approve requires an authenticated user
	const canAutoApprove = params.autoApprove && params.editedBy.userId != null;
	const status = canAutoApprove ? 'approved' : 'pending';

	const [row] = await db
		.insert(charManual)
		.values({
			character: params.character,
			...params.data,
			changedFields,
			status,
			reviewedBy: canAutoApprove ? params.editedBy.userId! : null,
			reviewedAt: canAutoApprove ? new Date() : null,
			editedBy: params.editedBy.userId ?? null,
			anonymousSessionId: params.editedBy.anonymousSessionId ?? null,
			editComment: params.editComment
		})
		.returning({ id: charManual.id });

	return { id: row.id, status };
}

/**
 * Approve a pending edit. Merges the edit's changed fields with the current
 * char view state so that only intentionally changed fields are applied.
 *
 * For legacy rows with changedFields = null, falls back to the old behavior
 * (approve as-is without merge).
 *
 * Returns true if the edit was approved, false if it was not found or already reviewed.
 */
export async function approveCharEdit(
	editId: string,
	reviewedBy: string,
	reviewComment?: string
): Promise<boolean> {
	// Load the pending edit
	const edit = await getCharManualById(editId);
	if (!edit || edit.status !== 'pending') return false;

	// If changedFields is null (legacy row), approve without merge
	if (edit.changedFields == null) {
		const rows = await db
			.update(charManual)
			.set({
				status: 'approved',
				reviewedBy,
				reviewedAt: new Date(),
				reviewComment: reviewComment ?? null
			})
			.where(and(eq(charManual.id, editId), eq(charManual.status, 'pending')))
			.returning({ id: charManual.id });

		return rows.length > 0;
	}

	// Load current char view state for merging
	const [currentState] = await db
		.select()
		.from(charView)
		.where(eq(charView.character, edit.character));

	// Build merged data: use edit's values for changedFields, current state for everything else
	const changedSet = new Set(edit.changedFields);
	const editRecord = edit as unknown as Record<string, unknown>;
	const currentRecord = (currentState ?? {}) as unknown as Record<string, unknown>;

	// Merge all charManual data columns (not just editable — we need frequency, shuowen, etc.)
	const mergedValues: Record<string, unknown> = {};

	// For editable fields: use edit's value if in changedFields, else current state.
	// When currentState exists, always prefer its value (even if null) so that
	// explicitly-nulled fields aren't overwritten by stale pending edit data.
	for (const field of EDITABLE_FIELDS) {
		if (changedSet.has(field)) {
			mergedValues[field] = editRecord[field];
		} else if (currentState) {
			mergedValues[field] = currentRecord[field];
		} else {
			mergedValues[field] = editRecord[field];
		}
	}

	// For non-editable data columns: always use current state (frequency, shuowen, etc.)
	const nonEditableDataColumns = [
		'codepoint',
		'junDaRank',
		'junDaFrequency',
		'junDaPerMillion',
		'subtlexRank',
		'subtlexCount',
		'subtlexPerMillion',
		'subtlexContextDiversity',
		'shuowenExplanation',
		'shuowenPronunciation',
		'shuowenPinyin',
		'pinyinFrequencies'
	];
	for (const field of nonEditableDataColumns) {
		if (currentState) {
			mergedValues[field] = currentRecord[field];
		} else {
			mergedValues[field] = editRecord[field];
		}
	}

	// Update the edit row with merged data + approved status
	// Use WHERE status = 'pending' as an optimistic lock
	const rows = await db
		.update(charManual)
		.set({
			...mergedValues,
			status: 'approved',
			reviewedBy,
			reviewedAt: new Date(),
			reviewComment: reviewComment ?? null
		})
		.where(and(eq(charManual.id, editId), eq(charManual.status, 'pending')))
		.returning({ id: charManual.id });

	return rows.length > 0;
}

/**
 * Reject a pending edit. Requires a review comment explaining the rejection.
 * Returns true if the edit was rejected, false if it was not found or already reviewed.
 */
export async function rejectCharEdit(
	editId: string,
	reviewedBy: string,
	reviewComment: string
): Promise<boolean> {
	const rows = await db
		.update(charManual)
		.set({
			status: 'rejected',
			reviewedBy,
			reviewedAt: new Date(),
			reviewComment
		})
		.where(and(eq(charManual.id, editId), eq(charManual.status, 'pending')))
		.returning({ id: charManual.id });

	return rows.length > 0;
}

/**
 * Get pending edits, optionally filtered by character.
 */
export async function getPendingEdits(character?: string): Promise<CharManualRow[]> {
	const conditions = [eq(charManual.status, 'pending')];
	if (character) {
		conditions.push(eq(charManual.character, character));
	}

	const rows = await db
		.select()
		.from(charManual)
		.where(and(...conditions))
		.orderBy(desc(charManual.createdAt));

	return rows.map((r) => ({ ...r, editComment: stripImportTag(r.editComment) }));
}

/**
 * Get edit history for a character (all statuses), most recent first.
 * Returns paginated results with total count.
 */
export async function getCharEditHistory(
	character: string,
	{ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}
): Promise<{ edits: CharManualRow[]; total: number }> {
	const [rows, countResult] = await Promise.all([
		db
			.select()
			.from(charManual)
			.where(eq(charManual.character, character))
			.orderBy(desc(charManual.createdAt))
			.limit(limit)
			.offset(offset),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(charManual)
			.where(eq(charManual.character, character))
			.then((rows) => rows[0])
	]);

	return {
		edits: rows.map((r) => ({ ...r, editComment: stripImportTag(r.editComment) })),
		total: countResult.count
	};
}

/**
 * Get a single char_manual edit by ID.
 */
export async function getCharManualById(editId: string): Promise<CharManualRow | null> {
	const [row] = await db.select().from(charManual).where(eq(charManual.id, editId)).limit(1);
	if (!row) return null;
	return { ...row, editComment: stripImportTag(row.editComment) };
}

/**
 * Get recent edits across all characters, paginated. Includes all statuses.
 * Returns full rows (needed for diff display).
 */
export async function getRecentEdits({
	limit = 50,
	offset = 0
}: { limit?: number; offset?: number } = {}) {
	const [edits, countResult] = await Promise.all([
		db.select().from(charManual).orderBy(desc(charManual.createdAt)).limit(limit).offset(offset),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(charManual)
			.then((rows) => rows[0])
	]);

	return {
		edits: edits.map((e) => ({ ...e, editComment: stripImportTag(e.editComment) })),
		total: countResult.count
	};
}

/**
 * Count pending edits for a character.
 */
export async function countPendingEdits(character: string): Promise<number> {
	const [result] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(charManual)
		.where(and(eq(charManual.character, character), eq(charManual.status, 'pending')));

	return result.count;
}

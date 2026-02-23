import { db } from '$lib/server/db';
import { charBase, charManual } from '$lib/server/db/dictionary.schema';
import { eq, desc, and, sql } from 'drizzle-orm';

export type CharManualInsert = typeof charManual.$inferInsert;
export type CharManualRow = typeof charManual.$inferSelect;

/**
 * Submit a character edit. If autoApprove is true (caller has wikiEdit permission),
 * the edit is immediately approved. Otherwise it's pending review.
 *
 * autoApprove requires a userId — anonymous users cannot auto-approve.
 * Requires at least one of userId or anonymousSessionId for attribution.
 * The character must exist in char_base — edits for unknown characters are rejected
 * because the dictionary.char view is driven by char_base.
 */
export async function submitCharEdit(params: {
	character: string;
	data: Omit<
		CharManualInsert,
		| 'id'
		| 'character'
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

	const [existing] = await db
		.select({ character: charBase.character })
		.from(charBase)
		.where(eq(charBase.character, params.character));
	if (!existing) {
		throw new Error(`Character '${params.character}' does not exist in char_base`);
	}

	// Auto-approve requires an authenticated user
	const canAutoApprove = params.autoApprove && params.editedBy.userId != null;
	const status = canAutoApprove ? 'approved' : 'pending';

	const [row] = await db
		.insert(charManual)
		.values({
			character: params.character,
			...params.data,
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
 * Approve a pending edit. Sets the reviewer and timestamp.
 * Returns true if the edit was approved, false if it was not found or already reviewed.
 */
export async function approveCharEdit(
	editId: string,
	reviewedBy: string,
	reviewComment?: string
): Promise<boolean> {
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

	return db
		.select()
		.from(charManual)
		.where(and(...conditions))
		.orderBy(desc(charManual.createdAt));
}

/**
 * Get edit history for a character (all statuses), most recent first.
 */
export async function getCharEditHistory(character: string, limit = 50): Promise<CharManualRow[]> {
	return db
		.select()
		.from(charManual)
		.where(eq(charManual.character, character))
		.orderBy(desc(charManual.createdAt))
		.limit(limit);
}

/**
 * Get a single char_manual edit by ID.
 */
export async function getCharManualById(editId: string): Promise<CharManualRow | null> {
	const [row] = await db.select().from(charManual).where(eq(charManual.id, editId)).limit(1);
	return row ?? null;
}

/**
 * Get recent edits across all characters, paginated. Includes all statuses.
 */
export async function getRecentEdits({
	limit = 50,
	offset = 0
}: { limit?: number; offset?: number } = {}): Promise<{
	edits: CharManualRow[];
	total: number;
}> {
	const [edits, countResult] = await Promise.all([
		db.select().from(charManual).orderBy(desc(charManual.createdAt)).limit(limit).offset(offset),
		db
			.select({ count: sql<number>`count(*)::int` })
			.from(charManual)
			.then((rows) => rows[0])
	]);

	return { edits, total: countResult.count };
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

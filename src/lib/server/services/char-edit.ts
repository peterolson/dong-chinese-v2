import { db } from '$lib/server/db';
import { charManual } from '$lib/server/db/dictionary.schema';
import { eq, desc, and } from 'drizzle-orm';

export type CharManualInsert = typeof charManual.$inferInsert;
export type CharManualRow = typeof charManual.$inferSelect;

/**
 * Submit a character edit. If autoApprove is true (caller has wikiEdit permission),
 * the edit is immediately approved. Otherwise it's pending review.
 *
 * autoApprove requires a userId — anonymous users cannot auto-approve.
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
		| 'editedBy'
		| 'anonymousSessionId'
		| 'editComment'
		| 'createdAt'
	>;
	editedBy: { userId?: string; anonymousSessionId?: string };
	editComment: string;
	autoApprove: boolean;
}): Promise<{ id: string; status: 'pending' | 'approved' }> {
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
export async function approveCharEdit(editId: string, reviewedBy: string): Promise<boolean> {
	const rows = await db
		.update(charManual)
		.set({
			status: 'approved',
			reviewedBy,
			reviewedAt: new Date()
		})
		.where(and(eq(charManual.id, editId), eq(charManual.status, 'pending')))
		.returning({ id: charManual.id });

	return rows.length > 0;
}

/**
 * Reject a pending edit. Sets the reviewer and timestamp.
 * Returns true if the edit was rejected, false if it was not found or already reviewed.
 */
export async function rejectCharEdit(editId: string, reviewedBy: string): Promise<boolean> {
	const rows = await db
		.update(charManual)
		.set({
			status: 'rejected',
			reviewedBy,
			reviewedAt: new Date()
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

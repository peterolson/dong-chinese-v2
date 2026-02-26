import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { db } from '$lib/server/db';
import { charBase, charManual } from '$lib/server/db/dictionary.schema';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import {
	submitCharEdit,
	approveCharEdit,
	rejectCharEdit,
	getPendingEdits,
	getCharEditHistory,
	getCharManualById,
	getRecentEdits,
	countPendingEdits,
	getUserPendingEdit,
	updateCharEdit,
	getUserPendingEdits,
	countAllPendingEdits
} from './char-edit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const testUserIds: string[] = [];
const testChars: string[] = [];

// Characters used by tests — seeded into char_base so submitCharEdit passes validation
const ALL_TEST_CHARS = ['你', '好', '中', '大', '小', '人', '山', '水', '火', '木', '金', '土'];

beforeEach(async () => {
	// Clean up any leftover data from a previous failed run
	await db.delete(charManual);
	for (const c of ALL_TEST_CHARS) {
		await db.delete(charBase).where(eq(charBase.character, c));
	}

	await db.insert(charBase).values(
		ALL_TEST_CHARS.map((c) => ({
			character: c,
			gloss: 'test'
		}))
	);
	testChars.push(...ALL_TEST_CHARS);
});

afterEach(async () => {
	await db.delete(charManual);
	for (const c of testChars) {
		await db.delete(charBase).where(eq(charBase.character, c));
	}
	testChars.length = 0;
	for (const id of testUserIds) {
		await db.delete(user).where(eq(user.id, id));
	}
	testUserIds.length = 0;
});

async function createTestUser(id: string): Promise<string> {
	await db.insert(user).values({
		id,
		name: 'Test User',
		email: `${id}@test.com`,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	testUserIds.push(id);
	return id;
}

describe('submitCharEdit', () => {
	it('creates a pending edit for unauthenticated user', async () => {
		const result = await submitCharEdit({
			character: '你',
			data: { gloss: 'you' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000001' },
			editComment: 'test edit',
			autoApprove: false
		});

		expect(result.id).toMatch(UUID_REGEX);
		expect(result.status).toBe('pending');
	});

	it('auto-approves edit for authenticated user with autoApprove', async () => {
		const userId = await createTestUser('edit-auto');
		const result = await submitCharEdit({
			character: '好',
			data: { gloss: 'good' },
			editedBy: { userId },
			editComment: 'verified',
			autoApprove: true
		});

		expect(result.status).toBe('approved');

		const rows = await db.select().from(charManual).where(eq(charManual.id, result.id));
		expect(rows[0].reviewedBy).toBe(userId);
		expect(rows[0].reviewedAt).not.toBeNull();
	});

	it('does not auto-approve when userId is missing even with autoApprove=true', async () => {
		const result = await submitCharEdit({
			character: '中',
			data: { gloss: 'middle' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000002' },
			editComment: 'anonymous attempt',
			autoApprove: true
		});

		expect(result.status).toBe('pending');
	});

	it('throws when character does not exist in char_base', async () => {
		await expect(
			submitCharEdit({
				character: '🚫', // emoji — guaranteed not in char_base
				data: { gloss: 'dragons' },
				editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000010' },
				editComment: '',
				autoApprove: false
			})
		).rejects.toThrow('does not exist in char_base');
	});

	it('throws when neither userId nor anonymousSessionId is provided', async () => {
		await expect(
			submitCharEdit({
				character: '你',
				data: { gloss: 'you' },
				editedBy: {},
				editComment: '',
				autoApprove: false
			})
		).rejects.toThrow('At least one of userId or anonymousSessionId is required');
	});
});

describe('approveCharEdit', () => {
	it('approves a pending edit and returns true', async () => {
		const result = await submitCharEdit({
			character: '大',
			data: { gloss: 'big' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000003' },
			editComment: '',
			autoApprove: false
		});

		const reviewerId = await createTestUser('reviewer-1');
		const approved = await approveCharEdit(result.id, reviewerId);
		expect(approved).toBe(true);

		const rows = await db.select().from(charManual).where(eq(charManual.id, result.id));
		expect(rows[0].status).toBe('approved');
		expect(rows[0].reviewedBy).toBe(reviewerId);
	});

	it('returns false for already-approved edit', async () => {
		const userId = await createTestUser('reviewer-2');
		const result = await submitCharEdit({
			character: '小',
			data: { gloss: 'small' },
			editedBy: { userId },
			editComment: '',
			autoApprove: true
		});

		const approved = await approveCharEdit(result.id, userId);
		expect(approved).toBe(false);
	});

	it('returns false for non-existent edit', async () => {
		const approved = await approveCharEdit('00000000-0000-0000-0000-000000000099', 'nobody');
		expect(approved).toBe(false);
	});
});

describe('rejectCharEdit', () => {
	it('rejects a pending edit and returns true', async () => {
		const result = await submitCharEdit({
			character: '人',
			data: { gloss: 'person' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000004' },
			editComment: '',
			autoApprove: false
		});

		const reviewerId = await createTestUser('reviewer-3');
		const rejected = await rejectCharEdit(result.id, reviewerId, 'Rejected');
		expect(rejected).toBe(true);

		const rows = await db.select().from(charManual).where(eq(charManual.id, result.id));
		expect(rows[0].status).toBe('rejected');
	});

	it('returns false for already-rejected edit', async () => {
		const result = await submitCharEdit({
			character: '山',
			data: { gloss: 'mountain' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000005' },
			editComment: '',
			autoApprove: false
		});

		const reviewerId = await createTestUser('reviewer-4');
		await rejectCharEdit(result.id, reviewerId, 'Rejected');
		const rejected = await rejectCharEdit(result.id, reviewerId, 'Rejected');
		expect(rejected).toBe(false);
	});
});

describe('getPendingEdits', () => {
	it('returns only pending edits', async () => {
		const userId = await createTestUser('pending-test');

		await submitCharEdit({
			character: '水',
			data: { gloss: 'water' },
			editedBy: { userId },
			editComment: '',
			autoApprove: true // approved
		});
		await submitCharEdit({
			character: '火',
			data: { gloss: 'fire' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000006' },
			editComment: '',
			autoApprove: false // pending
		});

		const pending = await getPendingEdits();
		expect(pending).toHaveLength(1);
		expect(pending[0].character).toBe('火');
	});

	it('filters by character', async () => {
		await submitCharEdit({
			character: '木',
			data: { gloss: 'tree' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000007' },
			editComment: '',
			autoApprove: false
		});
		await submitCharEdit({
			character: '金',
			data: { gloss: 'gold' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000008' },
			editComment: '',
			autoApprove: false
		});

		const pending = await getPendingEdits('木');
		expect(pending).toHaveLength(1);
		expect(pending[0].character).toBe('木');
	});
});

describe('getCharEditHistory', () => {
	it('returns all edits for a character ordered by newest first', async () => {
		const userId = await createTestUser('history-test');

		await submitCharEdit({
			character: '土',
			data: { gloss: 'earth' },
			editedBy: { userId },
			editComment: 'first',
			autoApprove: true
		});
		await submitCharEdit({
			character: '土',
			data: { gloss: 'soil' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000009' },
			editComment: 'second',
			autoApprove: false
		});

		const { edits, total } = await getCharEditHistory('土');
		expect(edits).toHaveLength(2);
		expect(total).toBe(2);
		expect(edits[0].editComment).toBe('second');
		expect(edits[1].editComment).toBe('first');
	});

	it('returns empty result for character with no edits', async () => {
		const { edits, total } = await getCharEditHistory('龍');
		expect(edits).toEqual([]);
		expect(total).toBe(0);
	});
});

describe('getCharManualById', () => {
	it('returns the edit row when it exists', async () => {
		const result = await submitCharEdit({
			character: '你',
			data: { gloss: 'you' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000020' },
			editComment: 'test lookup',
			autoApprove: false
		});

		const row = await getCharManualById(result.id);
		expect(row).not.toBeNull();
		expect(row!.id).toBe(result.id);
		expect(row!.character).toBe('你');
		expect(row!.editComment).toBe('test lookup');
	});

	it('returns null for non-existent id', async () => {
		const row = await getCharManualById('00000000-0000-0000-0000-000000000099');
		expect(row).toBeNull();
	});
});

describe('getRecentEdits', () => {
	it('returns empty result when no edits exist', async () => {
		const result = await getRecentEdits();
		expect(result.edits).toHaveLength(0);
		expect(result.total).toBe(0);
	});

	it('returns edits ordered by newest first', async () => {
		const userId = await createTestUser('recent-order');
		await submitCharEdit({
			character: '水',
			data: { gloss: 'water' },
			editedBy: { userId },
			editComment: 'first',
			autoApprove: true
		});
		await submitCharEdit({
			character: '火',
			data: { gloss: 'fire' },
			editedBy: { userId },
			editComment: 'second',
			autoApprove: true
		});

		const result = await getRecentEdits();
		expect(result.edits).toHaveLength(2);
		expect(result.total).toBe(2);
		expect(result.edits[0].character).toBe('火');
		expect(result.edits[1].character).toBe('水');
	});

	it('respects limit and offset', async () => {
		const userId = await createTestUser('recent-limit');
		await submitCharEdit({
			character: '木',
			data: { gloss: 'tree' },
			editedBy: { userId },
			editComment: 'a',
			autoApprove: true
		});
		await submitCharEdit({
			character: '金',
			data: { gloss: 'gold' },
			editedBy: { userId },
			editComment: 'b',
			autoApprove: true
		});
		await submitCharEdit({
			character: '土',
			data: { gloss: 'earth' },
			editedBy: { userId },
			editComment: 'c',
			autoApprove: true
		});

		const result = await getRecentEdits({ limit: 2, offset: 1 });
		expect(result.edits).toHaveLength(2);
		expect(result.total).toBe(3);
		expect(result.edits[0].character).toBe('金');
	});

	it('excludes pending edits', async () => {
		const userId = await createTestUser('recent-test');

		await submitCharEdit({
			character: '大',
			data: { gloss: 'big' },
			editedBy: { userId },
			editComment: 'auto-approved',
			autoApprove: true
		});
		await submitCharEdit({
			character: '小',
			data: { gloss: 'small' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000026' },
			editComment: 'pending',
			autoApprove: false
		});

		const result = await getRecentEdits();
		// Only the approved edit should be returned; pending is excluded
		expect(result.edits).toHaveLength(1);
		expect(result.edits[0].status).toBe('approved');
	});
});

describe('submitCharEdit — changedFields', () => {
	it('computes changedFields for only the fields that actually changed', async () => {
		// char_base has gloss='test' for all chars. Submitting gloss='you' should detect that change.
		const result = await submitCharEdit({
			character: '你',
			data: { gloss: 'you', hint: null, isVerified: false },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000040' },
			editComment: 'change gloss only',
			autoApprove: false
		});

		const row = await getCharManualById(result.id);
		expect(row).not.toBeNull();
		expect(row!.changedFields).toContain('gloss');
		// hint and isVerified are null/false in both current state and submitted data, so shouldn't be changed
		expect(row!.changedFields).not.toContain('hint');
		expect(row!.changedFields).not.toContain('isVerified');
	});

	it('detects multiple changed fields', async () => {
		const result = await submitCharEdit({
			character: '好',
			data: { gloss: 'good', hint: 'female + child', isVerified: true },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000041' },
			editComment: 'multiple changes',
			autoApprove: false
		});

		const row = await getCharManualById(result.id);
		expect(row!.changedFields).toContain('gloss');
		expect(row!.changedFields).toContain('hint');
		expect(row!.changedFields).toContain('isVerified');
	});

	it('throws when no fields were changed', async () => {
		// char_base has gloss='test' for all chars. Submitting the same value should fail.
		await expect(
			submitCharEdit({
				character: '你',
				data: { gloss: 'test' },
				editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000045' },
				editComment: 'no-op edit',
				autoApprove: false
			})
		).rejects.toThrow('No fields were changed');
	});

	it('treats null submission as no-op when base has a value (COALESCE semantics)', async () => {
		// char_base has gloss='test'. Submitting gloss=null would produce no visible change
		// because COALESCE(null, 'test') = 'test' in the view.
		await expect(
			submitCharEdit({
				character: '你',
				data: { gloss: null },
				editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000046' },
				editComment: 'clear gloss',
				autoApprove: false
			})
		).rejects.toThrow('No fields were changed');
	});

	it('detects clearing a manual override as a real change', async () => {
		// First: create an approved edit overriding gloss to 'you'
		const userId = await createTestUser('coalesce-test');
		await submitCharEdit({
			character: '你',
			data: { gloss: 'you' },
			editedBy: { userId },
			editComment: 'override gloss',
			autoApprove: true
		});

		// Now: submit gloss=null. Since current view shows 'you' (manual override)
		// and the effective post-approval value would be 'test' (base), this IS a change.
		const result = await submitCharEdit({
			character: '你',
			data: { gloss: null },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000047' },
			editComment: 'reset to base',
			autoApprove: false
		});

		expect(result.status).toBe('pending');
		const row = await getCharManualById(result.id);
		expect(row!.changedFields).toContain('gloss');
	});
});

describe('approveCharEdit — merge', () => {
	it('merges: uses changed fields from edit, unchanged from current state', async () => {
		const userId = await createTestUser('merge-reviewer');

		// First: create an approved edit that sets hint='water flows'
		await submitCharEdit({
			character: '水',
			data: { gloss: 'water', hint: 'water flows' },
			editedBy: { userId },
			editComment: 'set hint',
			autoApprove: true
		});

		// Second: submit a pending edit that changes gloss only
		const pendingResult = await submitCharEdit({
			character: '水',
			data: { gloss: 'liquid', hint: 'water flows' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000042' },
			editComment: 'change gloss',
			autoApprove: false
		});

		// Verify changedFields only includes gloss
		const pendingRow = await getCharManualById(pendingResult.id);
		expect(pendingRow!.changedFields).toEqual(['gloss']);

		// Approve — should merge: gloss from edit, hint from current state
		const approved = await approveCharEdit(pendingResult.id, userId);
		expect(approved).toBe(true);

		const approvedRow = await getCharManualById(pendingResult.id);
		expect(approvedRow!.gloss).toBe('liquid'); // from the edit
		expect(approvedRow!.hint).toBe('water flows'); // from current state (preserved)
	});

	it('handles legacy rows with changedFields=null (no merge)', async () => {
		// Directly insert a legacy row without changedFields
		const [legacyRow] = await db
			.insert(charManual)
			.values({
				character: '火',
				gloss: 'flame',
				status: 'pending',
				editedBy: null,
				anonymousSessionId: '00000000-0000-0000-0000-000000000043',
				editComment: 'legacy edit',
				changedFields: null
			})
			.returning({ id: charManual.id });

		const reviewerId = await createTestUser('legacy-reviewer');
		const approved = await approveCharEdit(legacyRow.id, reviewerId);
		expect(approved).toBe(true);

		const row = await getCharManualById(legacyRow.id);
		expect(row!.status).toBe('approved');
		expect(row!.gloss).toBe('flame'); // kept as-is, no merge
	});
});

describe('getRecentEdits — changedFields', () => {
	it('includes changedFields in results', async () => {
		const userId = await createTestUser('changed-fields-test');
		await submitCharEdit({
			character: '木',
			data: { gloss: 'tree' },
			editedBy: { userId },
			editComment: 'test',
			autoApprove: true
		});

		const result = await getRecentEdits();
		expect(result.edits).toHaveLength(1);
		expect(result.edits[0]).toHaveProperty('changedFields');
		expect(result.edits[0].changedFields).toContain('gloss');
	});
});

describe('countPendingEdits', () => {
	it('returns count of pending edits for a character', async () => {
		await submitCharEdit({
			character: '人',
			data: { gloss: 'person' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000030' },
			editComment: 'edit 1',
			autoApprove: false
		});
		await submitCharEdit({
			character: '人',
			data: { gloss: 'human' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000031' },
			editComment: 'edit 2',
			autoApprove: false
		});

		const count = await countPendingEdits('人');
		expect(count).toBe(2);
	});

	it('returns 0 when no pending edits exist', async () => {
		const count = await countPendingEdits('山');
		expect(count).toBe(0);
	});

	it('does not count approved edits', async () => {
		const userId = await createTestUser('count-test');

		await submitCharEdit({
			character: '中',
			data: { gloss: 'middle' },
			editedBy: { userId },
			editComment: 'approved one',
			autoApprove: true
		});

		const count = await countPendingEdits('中');
		expect(count).toBe(0);
	});

	it('scopes by editedBy when provided', async () => {
		const anonId1 = '00000000-0000-0000-0000-000000000032';
		const anonId2 = '00000000-0000-0000-0000-000000000033';

		await submitCharEdit({
			character: '人',
			data: { gloss: 'person' },
			editedBy: { anonymousSessionId: anonId1 },
			editComment: 'by anon 1',
			autoApprove: false
		});
		await submitCharEdit({
			character: '人',
			data: { gloss: 'human' },
			editedBy: { anonymousSessionId: anonId2 },
			editComment: 'by anon 2',
			autoApprove: false
		});

		const countAll = await countPendingEdits('人');
		expect(countAll).toBe(2);

		const countScoped = await countPendingEdits('人', { anonymousSessionId: anonId1 });
		expect(countScoped).toBe(1);
	});
});

describe('getUserPendingEdit', () => {
	it('finds a pending edit by anonymous session', async () => {
		const anonId = '00000000-0000-0000-0000-000000000050';
		await submitCharEdit({
			character: '水',
			data: { gloss: 'water' },
			editedBy: { anonymousSessionId: anonId },
			editComment: 'anon edit',
			autoApprove: false
		});

		const result = await getUserPendingEdit('水', { anonymousSessionId: anonId });
		expect(result).not.toBeNull();
		expect(result!.character).toBe('水');
		expect(result!.gloss).toBe('water');
	});

	it('finds a pending edit by userId', async () => {
		const userId = await createTestUser('pending-user-1');
		await submitCharEdit({
			character: '火',
			data: { gloss: 'fire' },
			editedBy: { userId },
			editComment: 'user edit',
			autoApprove: false
		});

		const result = await getUserPendingEdit('火', { userId });
		expect(result).not.toBeNull();
		expect(result!.character).toBe('火');
	});

	it('returns null when no pending edit exists', async () => {
		const result = await getUserPendingEdit('水', {
			anonymousSessionId: '00000000-0000-0000-0000-000000000051'
		});
		expect(result).toBeNull();
	});

	it('does not return approved edits', async () => {
		const userId = await createTestUser('pending-user-2');
		await submitCharEdit({
			character: '木',
			data: { gloss: 'tree' },
			editedBy: { userId },
			editComment: 'auto-approved',
			autoApprove: true
		});

		const result = await getUserPendingEdit('木', { userId });
		expect(result).toBeNull();
	});

	it('does not return other users pending edits', async () => {
		const anonId1 = '00000000-0000-0000-0000-000000000052';
		const anonId2 = '00000000-0000-0000-0000-000000000053';
		await submitCharEdit({
			character: '金',
			data: { gloss: 'gold' },
			editedBy: { anonymousSessionId: anonId1 },
			editComment: 'by anon 1',
			autoApprove: false
		});

		const result = await getUserPendingEdit('金', { anonymousSessionId: anonId2 });
		expect(result).toBeNull();
	});

	it('returns null when neither userId nor anonymousSessionId provided', async () => {
		const result = await getUserPendingEdit('水', {});
		expect(result).toBeNull();
	});
});

describe('updateCharEdit', () => {
	it('updates a pending edit in-place', async () => {
		const anonId = '00000000-0000-0000-0000-000000000054';
		const original = await submitCharEdit({
			character: '水',
			data: { gloss: 'water' },
			editedBy: { anonymousSessionId: anonId },
			editComment: 'first version',
			autoApprove: false
		});

		const updated = await updateCharEdit({
			editId: original.id,
			character: '水',
			data: { gloss: 'liquid' },
			editComment: 'revised version'
		});

		expect(updated).not.toBeNull();
		expect(updated!.id).toBe(original.id);
		expect(updated!.status).toBe('pending');

		const row = await getCharManualById(original.id);
		expect(row!.gloss).toBe('liquid');
		expect(row!.editComment).toBe('revised version');
	});

	it('returns null if edit was already approved (race condition)', async () => {
		const userId = await createTestUser('update-race');
		const original = await submitCharEdit({
			character: '火',
			data: { gloss: 'fire' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000055' },
			editComment: 'pending edit',
			autoApprove: false
		});

		// Approve the edit (simulating race condition)
		await approveCharEdit(original.id, userId);

		const updated = await updateCharEdit({
			editId: original.id,
			character: '火',
			data: { gloss: 'flame' },
			editComment: 'too late'
		});

		expect(updated).toBeNull();
	});

	it('throws when no fields changed', async () => {
		const anonId = '00000000-0000-0000-0000-000000000056';
		const original = await submitCharEdit({
			character: '木',
			data: { gloss: 'tree' },
			editedBy: { anonymousSessionId: anonId },
			editComment: 'original',
			autoApprove: false
		});

		// Submitting the same base value (base is 'test', view now shows 'tree' pending)
		// Actually, submitting 'test' should compute changed from current view state
		await expect(
			updateCharEdit({
				editId: original.id,
				character: '木',
				data: { gloss: 'test' }, // same as base
				editComment: 'no change'
			})
		).rejects.toThrow('No fields were changed');
	});

	it('resets createdAt to now', async () => {
		const anonId = '00000000-0000-0000-0000-000000000057';
		const original = await submitCharEdit({
			character: '土',
			data: { gloss: 'earth' },
			editedBy: { anonymousSessionId: anonId },
			editComment: 'first',
			autoApprove: false
		});

		const originalRow = await getCharManualById(original.id);
		const originalCreatedAt = originalRow!.createdAt;

		// Small delay to ensure different timestamp
		await new Promise((r) => setTimeout(r, 50));

		await updateCharEdit({
			editId: original.id,
			character: '土',
			data: { gloss: 'soil' },
			editComment: 'second'
		});

		const updatedRow = await getCharManualById(original.id);
		expect(updatedRow!.createdAt.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
	});
});

describe('getUserPendingEdits', () => {
	it('returns all pending edits for a user', async () => {
		const anonId = '00000000-0000-0000-0000-000000000058';
		await submitCharEdit({
			character: '水',
			data: { gloss: 'water' },
			editedBy: { anonymousSessionId: anonId },
			editComment: 'edit 1',
			autoApprove: false
		});
		await submitCharEdit({
			character: '火',
			data: { gloss: 'fire' },
			editedBy: { anonymousSessionId: anonId },
			editComment: 'edit 2',
			autoApprove: false
		});

		const edits = await getUserPendingEdits({ anonymousSessionId: anonId });
		expect(edits).toHaveLength(2);
		const chars = edits.map((e) => e.character).sort();
		expect(chars).toEqual(['水', '火'].sort());
	});

	it('does not return other users edits', async () => {
		const anonId1 = '00000000-0000-0000-0000-000000000059';
		const anonId2 = '00000000-0000-0000-0000-000000000060';
		await submitCharEdit({
			character: '木',
			data: { gloss: 'tree' },
			editedBy: { anonymousSessionId: anonId1 },
			editComment: 'anon 1',
			autoApprove: false
		});
		await submitCharEdit({
			character: '金',
			data: { gloss: 'gold' },
			editedBy: { anonymousSessionId: anonId2 },
			editComment: 'anon 2',
			autoApprove: false
		});

		const edits = await getUserPendingEdits({ anonymousSessionId: anonId1 });
		expect(edits).toHaveLength(1);
		expect(edits[0].character).toBe('木');
	});

	it('returns empty array when no identity provided', async () => {
		const edits = await getUserPendingEdits({});
		expect(edits).toEqual([]);
	});
});

describe('countAllPendingEdits', () => {
	it('returns total count of all pending edits', async () => {
		await submitCharEdit({
			character: '水',
			data: { gloss: 'water' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000061' },
			editComment: 'a',
			autoApprove: false
		});
		await submitCharEdit({
			character: '火',
			data: { gloss: 'fire' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000062' },
			editComment: 'b',
			autoApprove: false
		});

		const count = await countAllPendingEdits();
		expect(count).toBe(2);
	});

	it('returns 0 when no pending edits exist', async () => {
		const count = await countAllPendingEdits();
		expect(count).toBe(0);
	});

	it('does not count approved edits', async () => {
		const userId = await createTestUser('count-all-test');
		await submitCharEdit({
			character: '中',
			data: { gloss: 'middle' },
			editedBy: { userId },
			editComment: 'approved',
			autoApprove: true
		});

		const count = await countAllPendingEdits();
		expect(count).toBe(0);
	});
});

describe('getRecentEdits — excludes pending', () => {
	it('excludes pending edits from results', async () => {
		const userId = await createTestUser('recent-exclude');

		// Create one approved and one pending
		await submitCharEdit({
			character: '大',
			data: { gloss: 'big' },
			editedBy: { userId },
			editComment: 'auto-approved',
			autoApprove: true
		});
		await submitCharEdit({
			character: '小',
			data: { gloss: 'small' },
			editedBy: { anonymousSessionId: '00000000-0000-0000-0000-000000000063' },
			editComment: 'pending',
			autoApprove: false
		});

		const result = await getRecentEdits();
		expect(result.edits).toHaveLength(1);
		expect(result.total).toBe(1);
		expect(result.edits[0].status).toBe('approved');
	});
});

describe('variantOf validation', () => {
	it('rejects multi-character variantOf', async () => {
		const userId = await createTestUser('variant-multi');
		await expect(
			submitCharEdit({
				character: '你',
				data: { variantOf: '好人' },
				editedBy: { userId },
				editComment: 'multi-char',
				autoApprove: true
			})
		).rejects.toThrow('variantOf must be a single character');
	});

	it('rejects self-referencing variantOf', async () => {
		const userId = await createTestUser('variant-self');
		await expect(
			submitCharEdit({
				character: '你',
				data: { variantOf: '你' },
				editedBy: { userId },
				editComment: 'self-ref',
				autoApprove: true
			})
		).rejects.toThrow('variantOf cannot point to self');
	});

	it('rejects variantOf pointing to nonexistent character', async () => {
		const userId = await createTestUser('variant-missing');
		await expect(
			submitCharEdit({
				character: '你',
				data: { variantOf: '鑫' },
				editedBy: { userId },
				editComment: 'missing target',
				autoApprove: true
			})
		).rejects.toThrow('target character does not exist');
	});

	it('rejects variantOf that would create a chain', async () => {
		const userId = await createTestUser('variant-chain');
		// First, set 好 → 中
		await submitCharEdit({
			character: '好',
			data: { variantOf: '中' },
			editedBy: { userId },
			editComment: 'set variant',
			autoApprove: true
		});
		// Now try to set 你 → 好 (would create chain 你→好→中)
		await expect(
			submitCharEdit({
				character: '你',
				data: { variantOf: '好' },
				editedBy: { userId },
				editComment: 'chain attempt',
				autoApprove: true
			})
		).rejects.toThrow('it is itself a variant of');
	});

	it('rejects variantOf when character is already a canonical target', async () => {
		const userId = await createTestUser('variant-reverse');
		// First, set 好 → 你
		await submitCharEdit({
			character: '好',
			data: { variantOf: '你' },
			editedBy: { userId },
			editComment: 'set variant',
			autoApprove: true
		});
		// Now try to set 你 → 中 (你 is already a canonical for 好)
		await expect(
			submitCharEdit({
				character: '你',
				data: { variantOf: '中' },
				editedBy: { userId },
				editComment: 'reverse chain',
				autoApprove: true
			})
		).rejects.toThrow('points to this character as its canonical form');
	});

	it('accepts valid variantOf', async () => {
		const userId = await createTestUser('variant-valid');
		const edit = await submitCharEdit({
			character: '你',
			data: { variantOf: '好' },
			editedBy: { userId },
			editComment: 'valid variant',
			autoApprove: true
		});
		expect(edit.id).toMatch(UUID_REGEX);
	});
});

import { describe, expect, it, afterEach } from 'vitest';
import { db } from '$lib/server/db';
import { charManual } from '$lib/server/db/dictionary.schema';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import {
	submitCharEdit,
	approveCharEdit,
	rejectCharEdit,
	getPendingEdits,
	getCharEditHistory
} from './char-edit';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const testUserIds: string[] = [];

afterEach(async () => {
	await db.delete(charManual);
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
		const rejected = await rejectCharEdit(result.id, reviewerId);
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
		await rejectCharEdit(result.id, reviewerId);
		const rejected = await rejectCharEdit(result.id, reviewerId);
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

		const history = await getCharEditHistory('土');
		expect(history).toHaveLength(2);
		expect(history[0].editComment).toBe('second');
		expect(history[1].editComment).toBe('first');
	});

	it('returns empty array for character with no edits', async () => {
		const history = await getCharEditHistory('龍');
		expect(history).toEqual([]);
	});
});

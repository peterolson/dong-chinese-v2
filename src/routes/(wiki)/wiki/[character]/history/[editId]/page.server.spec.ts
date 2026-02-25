import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

const mockGetCharManualById = vi.fn();
const mockGetCharacterData = vi.fn();
const mockResolveUserNames = vi.fn();

vi.mock('$lib/server/services/char-edit', () => ({
	getCharManualById: (...args: unknown[]) => mockGetCharManualById(...args)
}));

vi.mock('$lib/server/services/dictionary', () => ({
	getCharacterData: (...args: unknown[]) => mockGetCharacterData(...args)
}));

vi.mock('$lib/server/services/user', () => ({
	resolveUserNames: (...args: unknown[]) => mockResolveUserNames(...args)
}));

vi.mock('$lib/data/editable-fields', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/data/editable-fields')>();
	return actual;
});

const { load } = await import('./+page.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

// ── Helpers ────────────────────────────────────────────────────

function makeEvent(character: string, editId: string) {
	return {
		params: { character, editId }
	} as unknown as Parameters<typeof load>[0];
}

function makeFakeEdit(overrides: Record<string, unknown> = {}) {
	return {
		id: 'edit-1',
		character: '水',
		status: 'approved',
		editComment: 'Updated gloss',
		reviewComment: 'LGTM',
		editedBy: 'user-1',
		reviewedBy: 'reviewer-1',
		createdAt: new Date('2025-01-15T10:00:00Z'),
		reviewedAt: new Date('2025-01-15T11:00:00Z'),
		changedFields: ['gloss'],
		gloss: 'water (edited)',
		hint: null,
		originalMeaning: null,
		isVerified: true,
		pinyin: ['shuǐ'],
		components: null,
		simplifiedVariants: null,
		traditionalVariants: null,
		customSources: null,
		strokeDataSimp: null,
		strokeDataTrad: null,
		strokeCountSimp: 4,
		strokeCountTrad: null,
		fragmentsSimp: null,
		fragmentsTrad: null,
		historicalImages: null,
		historicalPronunciations: null,
		...overrides
	};
}

function makeFakeBaseData(overrides: Record<string, unknown> = {}) {
	return {
		character: '水',
		gloss: 'water (base)',
		hint: 'flows downhill',
		originalMeaning: null,
		isVerified: false,
		pinyin: ['shuǐ'],
		components: null,
		simplifiedVariants: null,
		traditionalVariants: null,
		customSources: null,
		strokeDataSimp: null,
		strokeDataTrad: null,
		strokeCountSimp: 4,
		strokeCountTrad: null,
		fragmentsSimp: null,
		fragmentsTrad: null,
		historicalImages: null,
		historicalPronunciations: null,
		...overrides
	};
}

// ── Tests ──────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
	mockResolveUserNames.mockResolvedValue(new Map());
});

describe('load', () => {
	it('returns snapshot with edit fields overlaid on base data', async () => {
		const edit = makeFakeEdit({ gloss: 'water (edited)', changedFields: ['gloss'] });
		const baseData = makeFakeBaseData({ gloss: 'water (base)', hint: 'flows downhill' });
		mockGetCharManualById.mockResolvedValue(edit);
		mockGetCharacterData.mockResolvedValue(baseData);
		mockResolveUserNames.mockResolvedValue(
			new Map([
				['user-1', 'Alice'],
				['reviewer-1', 'Bob']
			])
		);

		const result = await loadResult(makeEvent('水', 'edit-1'));

		// gloss should come from the edit, hint should remain from base
		expect(result.snapshot.gloss).toBe('water (edited)');
		expect(result.snapshot.hint).toBe('flows downhill');
	});

	it('returns edit metadata with resolved names', async () => {
		const edit = makeFakeEdit();
		mockGetCharManualById.mockResolvedValue(edit);
		mockGetCharacterData.mockResolvedValue(makeFakeBaseData());
		mockResolveUserNames.mockResolvedValue(
			new Map([
				['user-1', 'Alice'],
				['reviewer-1', 'Bob']
			])
		);

		const result = await loadResult(makeEvent('水', 'edit-1'));

		expect(result.editMeta).toMatchObject({
			id: 'edit-1',
			status: 'approved',
			editComment: 'Updated gloss',
			reviewComment: 'LGTM',
			editorName: 'Alice',
			reviewerName: 'Bob',
			createdAt: '2025-01-15T10:00:00.000Z',
			reviewedAt: '2025-01-15T11:00:00.000Z',
			changedFields: ['gloss']
		});
	});

	it('throws 404 when edit not found', async () => {
		mockGetCharManualById.mockResolvedValue(null);

		await expect(load(makeEvent('水', 'nonexistent'))).rejects.toMatchObject({
			status: 404
		});
	});

	it('throws 404 when edit belongs to different character', async () => {
		const edit = makeFakeEdit({ character: '火' });
		mockGetCharManualById.mockResolvedValue(edit);

		await expect(load(makeEvent('水', 'edit-1'))).rejects.toMatchObject({
			status: 404
		});
	});

	it('throws 404 when base character data not found', async () => {
		const edit = makeFakeEdit();
		mockGetCharManualById.mockResolvedValue(edit);
		mockGetCharacterData.mockResolvedValue(null);

		await expect(load(makeEvent('水', 'edit-1'))).rejects.toMatchObject({
			status: 404
		});
	});

	it('labels anonymous editor as "Anonymous"', async () => {
		const edit = makeFakeEdit({ editedBy: null, reviewedBy: null, reviewedAt: null });
		mockGetCharManualById.mockResolvedValue(edit);
		mockGetCharacterData.mockResolvedValue(makeFakeBaseData());

		const result = await loadResult(makeEvent('水', 'edit-1'));

		expect(result.editMeta.editorName).toBe('Anonymous');
		expect(result.editMeta.reviewerName).toBeNull();
	});

	it('labels unresolved user as "Unknown"', async () => {
		const edit = makeFakeEdit({ editedBy: 'deleted-user', reviewedBy: 'deleted-reviewer' });
		mockGetCharManualById.mockResolvedValue(edit);
		mockGetCharacterData.mockResolvedValue(makeFakeBaseData());
		mockResolveUserNames.mockResolvedValue(new Map());

		const result = await loadResult(makeEvent('水', 'edit-1'));

		expect(result.editMeta.editorName).toBe('Unknown');
		expect(result.editMeta.reviewerName).toBe('Unknown');
	});

	it('uses first character from multi-codepoint param', async () => {
		const edit = makeFakeEdit({ character: '水' });
		mockGetCharManualById.mockResolvedValue(edit);
		mockGetCharacterData.mockResolvedValue(makeFakeBaseData());

		await loadResult(makeEvent('水abc', 'edit-1'));

		expect(mockGetCharacterData).toHaveBeenCalledWith('水');
	});
});

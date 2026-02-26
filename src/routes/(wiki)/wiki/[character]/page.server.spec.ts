import { describe, expect, it } from 'vitest';

const { load } = await import('./+page.server');

async function loadResult(...args: Parameters<typeof load>) {
	const r = await load(...args);
	if (!r) throw new Error('Unexpected void from load');
	return r;
}

function makeEvent(searchParams: Record<string, string> = {}) {
	const url = new URL('http://localhost:5173/wiki/水');
	for (const [k, v] of Object.entries(searchParams)) {
		url.searchParams.set(k, v);
	}
	return { url } as Parameters<typeof load>[0];
}

describe('load', () => {
	it('returns showDraft false when no view param', async () => {
		const result = await loadResult(makeEvent());

		expect(result.showDraft).toBe(false);
	});

	it('returns showDraft true when view=draft', async () => {
		const result = await loadResult(makeEvent({ view: 'draft' }));

		expect(result.showDraft).toBe(true);
	});

	it('returns showDraft false for non-draft view param', async () => {
		const result = await loadResult(makeEvent({ view: 'published' }));

		expect(result.showDraft).toBe(false);
	});
});

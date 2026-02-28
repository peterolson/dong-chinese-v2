import { describe, expect, it, vi } from 'vitest';

const mockExecute = vi.fn();

vi.mock('$lib/server/db', () => ({
	db: { execute: (...args: unknown[]) => mockExecute(...args) }
}));

const { GET } = await import('./+server');

describe('GET /api/health', () => {
	it('returns ok when DB is reachable', async () => {
		mockExecute.mockResolvedValueOnce([{ '?column?': 1 }]);
		const response = await GET({} as Parameters<typeof GET>[0]);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'ok' });
	});

	it('returns 503 when DB is unreachable', async () => {
		mockExecute.mockRejectedValueOnce(new Error('connection refused'));
		const response = await GET({} as Parameters<typeof GET>[0]);
		expect(response.status).toBe(503);
		expect(await response.json()).toEqual({ status: 'error', detail: 'database unreachable' });
	});
});

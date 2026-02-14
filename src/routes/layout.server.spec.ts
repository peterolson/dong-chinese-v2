import { describe, expect, it } from 'vitest';
import { load } from './+layout.server';

function makeEvent(user: { id: string; name: string } | null = null) {
	return { locals: { user } } as Parameters<typeof load>[0];
}

describe('root layout load', () => {
	it('returns user when authenticated', async () => {
		const user = { id: '1', name: 'Alice' };
		const result = (await load(makeEvent(user))) as { user: typeof user | null };
		expect(result.user).toEqual(user);
	});

	it('returns null when not authenticated', async () => {
		const result = (await load(makeEvent())) as { user: null };
		expect(result.user).toBeNull();
	});

	it('returns null when locals.user is undefined', async () => {
		const event = { locals: {} } as Parameters<typeof load>[0];
		const result = (await load(event)) as { user: null };
		expect(result.user).toBeNull();
	});
});

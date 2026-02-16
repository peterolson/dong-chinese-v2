import { describe, expect, it, afterEach } from 'vitest';
import { db } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';
import {
	readSettingsCookie,
	writeSettingsCookie,
	readUserSettings,
	writeUserSettings,
	applySettings,
	syncSettingsOnLogin,
	syncSettingsOnSignup
} from './settings';

// ── Helpers ──────────────────────────────────────────────────────

/** Minimal mock of SvelteKit's Cookies interface */
function makeCookies(initial: Record<string, string> = {}) {
	const jar = new Map(Object.entries(initial));
	return {
		get: (name: string) => jar.get(name),
		set: (name: string, value: string) => jar.set(name, value),
		delete: (name: string) => jar.delete(name),
		/** Expose jar for assertions */
		_jar: jar
	} as unknown as import('@sveltejs/kit').Cookies;
}

let testUserId: string | null = null;

afterEach(async () => {
	await db.delete(userSettings);
	if (testUserId) {
		await db.delete(user).where(eq(user.id, testUserId));
		testUserId = null;
	}
});

/** Insert a minimal user row so FK constraint is satisfied */
async function createTestUser(id: string): Promise<string> {
	await db.insert(user).values({
		id,
		name: 'Test User',
		email: `${id}@test.com`,
		emailVerified: false,
		createdAt: new Date(),
		updatedAt: new Date()
	});
	testUserId = id;
	return id;
}

// ── readSettingsCookie ───────────────────────────────────────────

describe('readSettingsCookie', () => {
	it('returns empty object when no cookie exists', () => {
		const cookies = makeCookies();
		expect(readSettingsCookie(cookies)).toEqual({});
	});

	it('parses valid JSON cookie', () => {
		const cookies = makeCookies({ settings: '{"theme":"dark"}' });
		expect(readSettingsCookie(cookies)).toEqual({ theme: 'dark' });
	});

	it('returns empty object for invalid JSON', () => {
		const cookies = makeCookies({ settings: 'not-json' });
		expect(readSettingsCookie(cookies)).toEqual({});
	});
});

// ── writeSettingsCookie ─────────────────────────────────────────

describe('writeSettingsCookie', () => {
	it('sets cookie with non-default values', () => {
		const cookies = makeCookies();
		writeSettingsCookie(cookies, { theme: 'dark' }, false);
		expect(cookies.get('settings')).toBe('{"theme":"dark"}');
	});

	it('deletes cookie when all values are defaults', () => {
		const cookies = makeCookies({ settings: '{"theme":"dark"}' });
		writeSettingsCookie(cookies, { theme: null }, false);
		expect(cookies.get('settings')).toBeUndefined();
	});

	it('deletes cookie when partial is empty', () => {
		const cookies = makeCookies({ settings: '{"theme":"dark"}' });
		writeSettingsCookie(cookies, {}, false);
		expect(cookies.get('settings')).toBeUndefined();
	});
});

// ── readUserSettings (DB) ───────────────────────────────────────

describe('readUserSettings', () => {
	it('returns empty object when no DB row exists', async () => {
		const result = await readUserSettings(db, 'nonexistent-user');
		expect(result).toEqual({});
	});

	it('returns theme from DB row', async () => {
		const id = await createTestUser('settings-read-1');
		await db.insert(userSettings).values({ userId: id, theme: 'dark' });

		const result = await readUserSettings(db, id);
		expect(result).toEqual({ theme: 'dark' });
	});

	it('ignores invalid theme values in DB', async () => {
		const id = await createTestUser('settings-read-2');
		await db.insert(userSettings).values({ userId: id, theme: 'bogus' });

		const result = await readUserSettings(db, id);
		expect(result).toEqual({});
	});

	it('returns empty when theme is null in DB', async () => {
		const id = await createTestUser('settings-read-3');
		await db.insert(userSettings).values({ userId: id, theme: null });

		const result = await readUserSettings(db, id);
		expect(result).toEqual({});
	});
});

// ── writeUserSettings (DB) ──────────────────────────────────────

describe('writeUserSettings', () => {
	it('inserts a new row', async () => {
		const id = await createTestUser('settings-write-1');
		await writeUserSettings(db, id, { theme: 'light' });

		const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));
		expect(rows).toHaveLength(1);
		expect(rows[0].theme).toBe('light');
	});

	it('upserts on conflict (updates existing row)', async () => {
		const id = await createTestUser('settings-write-2');
		await writeUserSettings(db, id, { theme: 'light' });
		await writeUserSettings(db, id, { theme: 'dark' });

		const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));
		expect(rows).toHaveLength(1);
		expect(rows[0].theme).toBe('dark');
	});

	it('writes null theme when not provided', async () => {
		const id = await createTestUser('settings-write-3');
		await writeUserSettings(db, id, {});

		const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));
		expect(rows).toHaveLength(1);
		expect(rows[0].theme).toBeNull();
	});
});

// ── applySettings ───────────────────────────────────────────────

describe('applySettings', () => {
	it('writes cookie only when no userId', async () => {
		const cookies = makeCookies();
		await applySettings(cookies, { theme: 'dark' }, false);

		expect(cookies.get('settings')).toBe('{"theme":"dark"}');
	});

	it('writes cookie and DB when userId is provided', async () => {
		const id = await createTestUser('settings-apply-1');
		const cookies = makeCookies();
		await applySettings(cookies, { theme: 'light' }, false, id, db);

		expect(cookies.get('settings')).toBe('{"theme":"light"}');
		const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));
		expect(rows[0].theme).toBe('light');
	});
});

// ── syncSettingsOnLogin ─────────────────────────────────────────

describe('syncSettingsOnLogin', () => {
	it('overwrites cookie with DB settings when DB has settings', async () => {
		const id = await createTestUser('settings-login-1');
		await db.insert(userSettings).values({ userId: id, theme: 'dark' });

		const cookies = makeCookies({ settings: '{"theme":"light"}' });
		await syncSettingsOnLogin(db, id, cookies, false);

		expect(readSettingsCookie(cookies)).toEqual({ theme: 'dark' });
	});

	it('preserves cookie and writes to DB when DB has no settings', async () => {
		const id = await createTestUser('settings-login-2');

		const cookies = makeCookies({ settings: '{"theme":"light"}' });
		await syncSettingsOnLogin(db, id, cookies, false);

		// Cookie preserved
		expect(readSettingsCookie(cookies)).toEqual({ theme: 'light' });
		// Written to DB
		const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));
		expect(rows[0].theme).toBe('light');
	});

	it('does nothing when both DB and cookie are empty', async () => {
		const id = await createTestUser('settings-login-3');

		const cookies = makeCookies();
		await syncSettingsOnLogin(db, id, cookies, false);

		expect(cookies.get('settings')).toBeUndefined();
		const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));
		expect(rows).toHaveLength(0);
	});
});

// ── syncSettingsOnSignup ────────────────────────────────────────

describe('syncSettingsOnSignup', () => {
	it('copies cookie settings to DB', async () => {
		const id = await createTestUser('settings-signup-1');
		const cookies = makeCookies({ settings: '{"theme":"dark"}' });
		await syncSettingsOnSignup(db, id, cookies);

		const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));
		expect(rows[0].theme).toBe('dark');
	});

	it('does nothing when cookie is empty', async () => {
		const id = await createTestUser('settings-signup-2');
		const cookies = makeCookies();
		await syncSettingsOnSignup(db, id, cookies);

		const rows = await db.select().from(userSettings).where(eq(userSettings.userId, id));
		expect(rows).toHaveLength(0);
	});
});

import type { Cookies } from '@sveltejs/kit';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { SETTINGS_COOKIE, SETTINGS_DEFAULTS, type UserSettings } from '$lib/settings';
import { userSettings } from '$lib/server/db/schema';

const MAX_AGE = 34560000; // 400 days

/** Parse the JSON settings cookie → only non-default values */
export function readSettingsCookie(cookies: Cookies): Partial<UserSettings> {
	const raw = cookies.get(SETTINGS_COOKIE);
	if (!raw) return {};
	try {
		return JSON.parse(raw);
	} catch {
		return {};
	}
}

/** Write non-default values to the JSON cookie (or delete if all defaults) */
export function writeSettingsCookie(
	cookies: Cookies,
	partial: Partial<UserSettings>,
	isSecure: boolean
): void {
	const nonDefault: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(partial)) {
		if (value !== SETTINGS_DEFAULTS[key as keyof UserSettings]) {
			nonDefault[key] = value;
		}
	}

	if (Object.keys(nonDefault).length === 0) {
		cookies.delete(SETTINGS_COOKIE, { path: '/' });
	} else {
		cookies.set(SETTINGS_COOKIE, JSON.stringify(nonDefault), {
			path: '/',
			httpOnly: false,
			sameSite: 'lax',
			secure: isSecure,
			maxAge: MAX_AGE
		});
	}
}

/** Read settings from the DB for a user */
export async function readUserSettings(
	db: PostgresJsDatabase<Record<string, unknown>>,
	userId: string
): Promise<Partial<UserSettings>> {
	const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
	if (rows.length === 0) return {};

	const row = rows[0];
	const result: Partial<UserSettings> = {};
	if (row.theme === 'light' || row.theme === 'dark') {
		result.theme = row.theme;
	}
	return result;
}

/** Upsert settings for a user in the DB */
export async function writeUserSettings(
	db: PostgresJsDatabase<Record<string, unknown>>,
	userId: string,
	partial: Partial<UserSettings>
): Promise<void> {
	const theme = partial.theme ?? null;
	await db
		.insert(userSettings)
		.values({
			userId,
			theme
		})
		.onConflictDoUpdate({
			target: userSettings.userId,
			set: {
				theme,
				updatedAt: new Date()
			}
		});
}

/**
 * The one function form actions call:
 * writes cookie, writes DB if authenticated.
 */
export async function applySettings(
	cookies: Cookies,
	settings: Partial<UserSettings>,
	isSecure: boolean,
	userId?: string,
	db?: PostgresJsDatabase<Record<string, unknown>>
): Promise<void> {
	writeSettingsCookie(cookies, settings, isSecure);
	if (userId && db) {
		await writeUserSettings(db, userId, settings);
	}
}

/** Login: DB → cookie if DB has settings; otherwise cookie → DB (preserve anonymous prefs) */
export async function syncSettingsOnLogin(
	db: PostgresJsDatabase<Record<string, unknown>>,
	userId: string,
	cookies: Cookies,
	isSecure: boolean
): Promise<void> {
	const dbSettings = await readUserSettings(db, userId);
	if (Object.keys(dbSettings).length > 0) {
		// DB has settings — overwrite cookie (DB is source of truth for returning users)
		writeSettingsCookie(cookies, dbSettings, isSecure);
	} else {
		// No DB settings — preserve cookie preferences and save them to DB
		const cookieSettings = readSettingsCookie(cookies);
		if (Object.keys(cookieSettings).length > 0) {
			await writeUserSettings(db, userId, cookieSettings);
		}
	}
}

/** Signup: cookie → DB (preserve anonymous preferences) */
export async function syncSettingsOnSignup(
	db: PostgresJsDatabase<Record<string, unknown>>,
	userId: string,
	cookies: Cookies
): Promise<void> {
	const cookieSettings = readSettingsCookie(cookies);
	if (Object.keys(cookieSettings).length > 0) {
		await writeUserSettings(db, userId, cookieSettings);
	}
}

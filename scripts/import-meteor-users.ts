/**
 * Meteor User Import Script
 *
 * Migrates users from Meteor/MongoDB to the new SvelteKit/Postgres database.
 * Preserves bcrypt password hashes and OAuth provider IDs so existing users
 * can log in with their current credentials.
 *
 * Usage:
 *   MONGODB_URI=mongodb://... DATABASE_URL=postgres://... npm run import:users
 *
 * Idempotent: uses ON CONFLICT DO NOTHING so it can be safely re-run.
 */

import { MongoClient } from 'mongodb';
import postgres, { type Row, type PendingQuery } from 'postgres';

/**
 * postgres.js TransactionSql loses its call signature due to TS Omit limitation.
 * Re-add the template tag call signature so `tx\`...\`` works.
 */
type Tx = postgres.TransactionSql & {
	<T extends readonly (object | undefined)[] = Row[]>(
		template: TemplateStringsArray,
		...parameters: readonly postgres.ParameterOrFragment<never>[]
	): PendingQuery<T>;
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_URL = process.env.DATABASE_URL;
const BATCH_SIZE = 100;
const PLACEHOLDER_DOMAIN = 'noemail.dong-chinese.com';
const MONGO_DB_NAME = 'dong-chinese';

if (!MONGODB_URI) {
	console.error('Error: MONGODB_URI environment variable is required');
	process.exit(1);
}
if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeteorUser {
	_id: string;
	username?: string;
	emails?: Array<{ address: string | null; verified?: boolean }>;
	profile?: { name?: string; darkMode?: boolean; isTraditional?: boolean };
	services?: {
		password?: { bcrypt?: string };
		google?: { id?: string; email?: string; name?: string; picture?: string };
		facebook?: { id?: string; email?: string; name?: string };
		twitter?: { id?: string; screenName?: string };
	};
	createdAt?: Date;
}

interface UserRow {
	id: string;
	name: string;
	email: string;
	emailVerified: boolean;
	image: string | null;
	username: string | null;
	displayUsername: string | null;
	createdAt: Date;
	updatedAt: Date;
}

interface AccountRow {
	id: string;
	accountId: string;
	providerId: string;
	userId: string;
	password: string | null;
	createdAt: Date;
	updatedAt: Date;
}

interface UserEmailRow {
	userId: string;
	email: string;
	verified: boolean;
	isPrimary: boolean;
	createdAt: Date;
	updatedAt: Date;
}

interface SettingsRow {
	userId: string;
	settings: Record<string, unknown>;
	now: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
	// Generate a random ID compatible with Better Auth (nanoid-like)
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	for (const byte of bytes) {
		result += chars[byte % chars.length];
	}
	return result;
}

/**
 * Resolve the primary email for a Meteor user.
 * Priority: first verified non-null → first non-null → OAuth email → placeholder
 */
function resolvePrimaryEmail(meteorUser: MeteorUser): { email: string; verified: boolean } {
	const emails = meteorUser.emails ?? [];

	// First verified non-null email
	for (const e of emails) {
		if (e.address && e.verified) {
			return { email: e.address.toLowerCase(), verified: true };
		}
	}

	// First non-null email
	for (const e of emails) {
		if (e.address) {
			return { email: e.address.toLowerCase(), verified: false };
		}
	}

	// OAuth email (Google → Facebook)
	const services = meteorUser.services ?? {};
	if (services.google?.email) {
		return { email: services.google.email.toLowerCase(), verified: true };
	}
	if (services.facebook?.email) {
		return { email: services.facebook.email.toLowerCase(), verified: false };
	}

	// Placeholder
	return {
		email: `${meteorUser._id}@${PLACEHOLDER_DOMAIN}`,
		verified: false
	};
}

/**
 * Resolve display name for a Meteor user.
 * Priority: profile.name → OAuth name → username → email local part
 */
function resolveName(meteorUser: MeteorUser, primaryEmail: string): string {
	if (meteorUser.profile?.name) return meteorUser.profile.name;

	const services = meteorUser.services ?? {};
	if (services.google?.name) return services.google.name;
	if (services.facebook?.name) return services.facebook.name;
	if (services.twitter?.screenName) return services.twitter.screenName;

	if (meteorUser.username) return meteorUser.username;

	return primaryEmail.split('@')[0];
}

/**
 * Collect all non-null emails from a Meteor user (both emails array and OAuth).
 */
function collectAllEmails(meteorUser: MeteorUser, primaryEmail: string): UserEmailRow[] {
	const seen = new Set<string>();
	const result: UserEmailRow[] = [];
	const now = meteorUser.createdAt ?? new Date();

	function addEmail(email: string, verified: boolean) {
		const lower = email.toLowerCase();
		if (seen.has(lower)) return;
		seen.add(lower);
		result.push({
			userId: meteorUser._id,
			email: lower,
			verified,
			isPrimary: lower === primaryEmail.toLowerCase(),
			createdAt: now,
			updatedAt: now
		});
	}

	// From emails array
	for (const e of meteorUser.emails ?? []) {
		if (e.address) {
			addEmail(e.address, e.verified ?? false);
		}
	}

	// From OAuth providers
	const services = meteorUser.services ?? {};
	if (services.google?.email) addEmail(services.google.email, true);
	if (services.facebook?.email) addEmail(services.facebook.email, false);

	// Ensure primary email is always present
	if (!seen.has(primaryEmail.toLowerCase())) {
		addEmail(primaryEmail, false);
	}

	return result;
}

/**
 * Map Meteor profile fields to user_settings columns.
 * Returns null if the user has no non-default settings.
 * Add future setting mappings here.
 */
function resolveSettings(meteorUser: MeteorUser): Record<string, unknown> | null {
	const settings: Record<string, unknown> = {};

	if (meteorUser.profile?.darkMode) {
		settings.theme = 'dark';
	}

	if (meteorUser.profile?.isTraditional) {
		settings.character_set = 'traditional';
	}

	return Object.keys(settings).length > 0 ? settings : null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	console.log('Connecting to MongoDB...');
	const mongo = new MongoClient(MONGODB_URI!);
	await mongo.connect();
	const mongoDb = mongo.db(MONGO_DB_NAME);
	const usersCollection = mongoDb.collection<MeteorUser>('users');

	console.log('Connecting to Postgres...');
	const sql = postgres(DATABASE_URL!);

	const totalCount = await usersCollection.countDocuments();
	console.log(`Found ${totalCount} users in MongoDB`);

	let imported = 0;
	let skipped = 0;
	let errors = 0;

	const cursor = usersCollection.find().batchSize(BATCH_SIZE);
	let batch: MeteorUser[] = [];

	for await (const meteorUser of cursor) {
		batch.push(meteorUser);

		if (batch.length >= BATCH_SIZE) {
			const result = await processBatch(sql, batch);
			imported += result.imported;
			skipped += result.skipped;
			errors += result.errors;
			console.log(
				`Progress: ${imported + skipped + errors}/${totalCount} (imported: ${imported}, skipped: ${skipped}, errors: ${errors})`
			);
			batch = [];
		}
	}

	// Process remaining users
	if (batch.length > 0) {
		const result = await processBatch(sql, batch);
		imported += result.imported;
		skipped += result.skipped;
		errors += result.errors;
	}

	console.log('\n--- Import Summary ---');
	console.log(`Total in MongoDB: ${totalCount}`);
	console.log(`Imported:         ${imported}`);
	console.log(`Skipped (exists): ${skipped}`);
	console.log(`Errors:           ${errors}`);

	await cursor.close();
	await mongo.close();
	await sql.end();
}

/**
 * Sanitize error messages to avoid leaking user emails in logs.
 */
function sanitizeError(err: unknown): string {
	const msg = err instanceof Error ? err.message : String(err);
	// Redact anything that looks like an email address
	return msg.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED]');
}

/**
 * Deduplicate rows before SQL insertion.
 * Meteor data can have duplicate emails across users (shared OAuth accounts,
 * case variations, etc.). Multi-row INSERTs fail on intra-batch duplicates
 * because ON CONFLICT only handles conflicts with existing DB rows.
 */
function deduplicateBatch(
	userRows: UserRow[],
	accountRows: AccountRow[],
	emailRows: UserEmailRow[],
	settingsRows: SettingsRow[]
): {
	users: UserRow[];
	accounts: AccountRow[];
	emails: UserEmailRow[];
	settings: SettingsRow[];
	droppedUsers: number;
} {
	// Deduplicate users by primary email (first wins)
	const seenEmails = new Set<string>();
	const seenUsernames = new Set<string>();
	const validUserIds = new Set<string>();
	const users: UserRow[] = [];

	for (const u of userRows) {
		if (seenEmails.has(u.email)) continue;
		if (u.username && seenUsernames.has(u.username)) continue;
		seenEmails.add(u.email);
		if (u.username) seenUsernames.add(u.username);
		validUserIds.add(u.id);
		users.push(u);
	}

	// Filter child rows to only reference surviving users
	const accounts = accountRows.filter((a) => validUserIds.has(a.userId));
	const settings = settingsRows.filter((s) => validUserIds.has(s.userId));

	// Deduplicate email rows by email address (first wins)
	const seenEmailAddrs = new Set<string>();
	const emails: UserEmailRow[] = [];
	for (const e of emailRows) {
		if (!validUserIds.has(e.userId)) continue;
		if (seenEmailAddrs.has(e.email)) continue;
		seenEmailAddrs.add(e.email);
		emails.push(e);
	}

	return { users, accounts, emails, settings, droppedUsers: userRows.length - users.length };
}

async function processBatch(
	sql: ReturnType<typeof postgres>,
	batch: MeteorUser[]
): Promise<{ imported: number; skipped: number; errors: number }> {
	let imported = 0;
	let skipped = 0;
	let errors = 0;

	// Prepare all rows up front
	const userRows: UserRow[] = [];
	const accountRows: AccountRow[] = [];
	const emailRows: UserEmailRow[] = [];
	const settingsRows: SettingsRow[] = [];

	for (const meteorUser of batch) {
		try {
			const { email: primaryEmail, verified: primaryVerified } = resolvePrimaryEmail(meteorUser);
			const name = resolveName(meteorUser, primaryEmail);
			const now = meteorUser.createdAt ?? new Date();

			userRows.push({
				id: meteorUser._id,
				name,
				email: primaryEmail,
				emailVerified: primaryVerified,
				image: meteorUser.services?.google?.picture ?? null,
				username: meteorUser.username?.toLowerCase() ?? null,
				displayUsername: meteorUser.username ?? null,
				createdAt: now,
				updatedAt: now
			});

			const services = meteorUser.services ?? {};
			if (services.password?.bcrypt) {
				accountRows.push({
					id: generateId(),
					accountId: meteorUser._id,
					providerId: 'credential',
					userId: meteorUser._id,
					password: services.password.bcrypt,
					createdAt: now,
					updatedAt: now
				});
			}
			if (services.google?.id) {
				accountRows.push({
					id: generateId(),
					accountId: services.google.id,
					providerId: 'google',
					userId: meteorUser._id,
					password: null,
					createdAt: now,
					updatedAt: now
				});
			}
			if (services.facebook?.id) {
				accountRows.push({
					id: generateId(),
					accountId: services.facebook.id,
					providerId: 'facebook',
					userId: meteorUser._id,
					password: null,
					createdAt: now,
					updatedAt: now
				});
			}
			if (services.twitter?.id) {
				accountRows.push({
					id: generateId(),
					accountId: services.twitter.id,
					providerId: 'twitter',
					userId: meteorUser._id,
					password: null,
					createdAt: now,
					updatedAt: now
				});
			}

			emailRows.push(...collectAllEmails(meteorUser, primaryEmail));

			const settings = resolveSettings(meteorUser);
			if (settings) {
				settingsRows.push({ userId: meteorUser._id, settings, now });
			}
		} catch (err) {
			errors++;
			console.error(`Error preparing user ${meteorUser._id}: ${sanitizeError(err)}`);
		}
	}

	// Deduplicate before touching SQL — prevents intra-batch unique constraint violations
	const deduped = deduplicateBatch(userRows, accountRows, emailRows, settingsRows);
	skipped += deduped.droppedUsers;

	// Execute all inserts in a single transaction with multi-row operations
	try {
		await sql.begin(async (_tx) => {
			const tx = _tx as Tx;

			if (deduped.users.length > 0) {
				const dbUsers = deduped.users.map((u) => ({
					id: u.id,
					name: u.name,
					email: u.email,
					email_verified: u.emailVerified,
					image: u.image,
					username: u.username,
					display_username: u.displayUsername,
					created_at: u.createdAt,
					updated_at: u.updatedAt
				}));
				const inserted = await tx`
					INSERT INTO "user" ${tx(dbUsers, 'id', 'name', 'email', 'email_verified', 'image', 'username', 'display_username', 'created_at', 'updated_at')}
					ON CONFLICT (id) DO NOTHING
					RETURNING id
				`;
				const insertedIds = new Set(inserted.map((r) => r.id as string));
				imported = insertedIds.size;
				skipped += deduped.users.length - imported;

				// Only insert accounts/emails for newly inserted users
				const newAccounts = deduped.accounts.filter((a) => insertedIds.has(a.userId));
				const newEmails = deduped.emails.filter((e) => insertedIds.has(e.userId));

				if (newAccounts.length > 0) {
					const dbAccounts = newAccounts.map((a) => ({
						id: a.id,
						account_id: a.accountId,
						provider_id: a.providerId,
						user_id: a.userId,
						password: a.password,
						created_at: a.createdAt,
						updated_at: a.updatedAt
					}));
					await tx`
						INSERT INTO account ${tx(dbAccounts, 'id', 'account_id', 'provider_id', 'user_id', 'password', 'created_at', 'updated_at')}
						ON CONFLICT (id) DO NOTHING
					`;
				}

				if (newEmails.length > 0) {
					const dbEmails = newEmails.map((e) => ({
						id: crypto.randomUUID(),
						user_id: e.userId,
						email: e.email,
						verified: e.verified,
						is_primary: e.isPrimary,
						created_at: e.createdAt,
						updated_at: e.updatedAt
					}));
					await tx`
						INSERT INTO user_email ${tx(dbEmails, 'id', 'user_id', 'email', 'verified', 'is_primary', 'created_at', 'updated_at')}
						ON CONFLICT (email) DO NOTHING
					`;
				}
			}

			// Upsert settings for all users (including existing ones)
			for (const { userId, settings, now } of deduped.settings) {
				const settingKeys = Object.keys(settings);
				const columns = ['user_id', 'created_at', 'updated_at', ...settingKeys];
				const values: (string | Date)[] = [
					userId,
					now,
					now,
					...(Object.values(settings) as (string | Date)[])
				];
				const updateSet = settingKeys.map((k, i) => `${k} = $${i + 4}`).join(', ');
				await tx.unsafe(
					`INSERT INTO user_settings (${columns.join(', ')})
					VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
					ON CONFLICT (user_id) DO UPDATE SET ${updateSet}, updated_at = $3`,
					values
				);
			}
		});
	} catch (err) {
		console.error(`Error processing batch: ${sanitizeError(err)}`);
		errors += deduped.users.length;
		imported = 0;
	}

	return { imported, skipped, errors };
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

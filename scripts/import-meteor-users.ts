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
	const mongoDb = mongo.db();
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

async function processBatch(
	sql: ReturnType<typeof postgres>,
	batch: MeteorUser[]
): Promise<{ imported: number; skipped: number; errors: number }> {
	let imported = 0;
	let skipped = 0;
	let errors = 0;

	for (const meteorUser of batch) {
		try {
			const result = await importUser(sql, meteorUser);
			if (result === 'imported') imported++;
			else skipped++;
		} catch (err) {
			errors++;
			console.error(`Error importing user ${meteorUser._id}:`, err);
		}
	}

	return { imported, skipped, errors };
}

async function importUser(
	sql: ReturnType<typeof postgres>,
	meteorUser: MeteorUser
): Promise<'imported' | 'skipped'> {
	const { email: primaryEmail, verified: primaryVerified } = resolvePrimaryEmail(meteorUser);
	const name = resolveName(meteorUser, primaryEmail);
	const now = meteorUser.createdAt ?? new Date();

	// Prepare user row
	const userRow: UserRow = {
		id: meteorUser._id,
		name,
		email: primaryEmail,
		emailVerified: primaryVerified,
		image: meteorUser.services?.google?.picture ?? null,
		username: meteorUser.username?.toLowerCase() ?? null,
		displayUsername: meteorUser.username ?? null,
		createdAt: now,
		updatedAt: now
	};

	// Prepare account rows
	const accounts: AccountRow[] = [];
	const services = meteorUser.services ?? {};

	if (services.password?.bcrypt) {
		accounts.push({
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
		accounts.push({
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
		accounts.push({
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
		accounts.push({
			id: generateId(),
			accountId: services.twitter.id,
			providerId: 'twitter',
			userId: meteorUser._id,
			password: null,
			createdAt: now,
			updatedAt: now
		});
	}

	// Prepare email rows
	const emailRows = collectAllEmails(meteorUser, primaryEmail);

	// Insert in a transaction
	let wasInserted = false;

	await sql.begin(async (_tx) => {
		const tx = _tx as Tx;
		// Insert user (ON CONFLICT DO NOTHING for idempotency)
		const userResult = await tx`
			INSERT INTO "user" (id, name, email, email_verified, image, username, display_username, created_at, updated_at)
			VALUES (
				${userRow.id},
				${userRow.name},
				${userRow.email},
				${userRow.emailVerified},
				${userRow.image},
				${userRow.username},
				${userRow.displayUsername},
				${userRow.createdAt},
				${userRow.updatedAt}
			)
			ON CONFLICT (id) DO NOTHING
			RETURNING id
		`;

		wasInserted = userResult.length > 0;

		// Upsert user settings (always runs, even for existing users)
		const settings = resolveSettings(meteorUser);
		if (settings) {
			const settingKeys = Object.keys(settings);
			const columns = ['user_id', 'created_at', 'updated_at', ...settingKeys];
			const values: (string | Date)[] = [
				meteorUser._id,
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

		if (!wasInserted) return; // User already exists, skip accounts and emails

		// Insert accounts
		for (const acc of accounts) {
			await tx`
				INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
				VALUES (
					${acc.id},
					${acc.accountId},
					${acc.providerId},
					${acc.userId},
					${acc.password},
					${acc.createdAt},
					${acc.updatedAt}
				)
				ON CONFLICT (id) DO NOTHING
			`;
		}

		// Insert emails
		for (const emailRow of emailRows) {
			await tx`
				INSERT INTO user_email (id, user_id, email, verified, is_primary, created_at, updated_at)
				VALUES (
					${crypto.randomUUID()},
					${emailRow.userId},
					${emailRow.email},
					${emailRow.verified},
					${emailRow.isPrimary},
					${emailRow.createdAt},
					${emailRow.updatedAt}
				)
				ON CONFLICT (email) DO NOTHING
			`;
		}
	});

	return wasInserted ? 'imported' : 'skipped';
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

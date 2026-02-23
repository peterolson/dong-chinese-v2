import { pgTable, uuid, timestamp, text, boolean, index, unique } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

export const userSettings = pgTable('user_settings', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	theme: text('theme'),
	characterSet: text('character_set'),
	phoneticScript: text('phonetic_script'),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const anonymousSession = pgTable('anonymous_session', {
	id: uuid('id').primaryKey().defaultRandom(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export const userEmail = pgTable(
	'user_email',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		email: text('email').notNull().unique(),
		verified: boolean('verified').default(false).notNull(),
		isPrimary: boolean('is_primary').default(false).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [index('user_email_user_id_idx').on(table.userId)]
);

export const userPermission = pgTable(
	'user_permission',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		permission: text('permission').notNull(),
		grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
		grantedBy: text('granted_by').references(() => user.id, { onDelete: 'set null' }) // admin who granted; null for imports
	},
	(table) => [
		unique('user_permission_user_id_permission_unique').on(table.userId, table.permission),
		index('user_permission_user_id_idx').on(table.userId)
	]
);

export * from './auth.schema';
export * from './stage.schema';
export * from './dictionary.schema';

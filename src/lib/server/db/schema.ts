import { pgTable, uuid, timestamp, text, boolean, index } from 'drizzle-orm/pg-core';
import { user } from './auth.schema';

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

export * from './auth.schema';

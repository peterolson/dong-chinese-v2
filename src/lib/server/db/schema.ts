import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';

export const anonymousSession = pgTable('anonymous_session', {
	id: uuid('id').primaryKey().defaultRandom(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

export * from './auth.schema';

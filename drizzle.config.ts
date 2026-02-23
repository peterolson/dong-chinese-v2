import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	schema: [
		'./src/lib/server/db/schema.ts',
		'./src/lib/server/db/stage.schema.ts',
		'./src/lib/server/db/dictionary.schema.ts',
		'./src/lib/server/db/dictionary.views.ts'
	],
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL },
	schemaFilter: ['public', 'stage', 'dictionary'],
	verbose: true,
	strict: true
});

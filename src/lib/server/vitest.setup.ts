// Redirect integration tests to the dedicated test database (port 5435)
// so that `npx vitest run` never touches the dev database.
//
// SvelteKit's $env/dynamic/private bakes .env values into a snapshot at
// vite plugin init time — it does NOT read from process.env at runtime
// in vitest. We must mock the module directly.
//
// In CI (GitHub Actions sets CI=true), DATABASE_URL is already set to
// the ephemeral service container — no override needed.
import { vi } from 'vitest';

if (!process.env.CI) {
	if (!process.env.TEST_DATABASE_URL) {
		throw new Error('TEST_DATABASE_URL environment variable is required for local test runs');
	}
	process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

vi.mock('$env/dynamic/private', () => ({
	env: new Proxy({} as Record<string, string | undefined>, {
		get(_, prop: string) {
			return process.env[prop];
		}
	})
}));

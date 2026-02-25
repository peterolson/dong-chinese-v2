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
	process.env.DATABASE_URL = 'postgres://root:mysecretpassword@localhost:5435/test';
}

vi.mock('$env/dynamic/private', () => ({
	env: new Proxy({} as Record<string, string | undefined>, {
		get(_, prop: string) {
			return process.env[prop];
		}
	})
}));

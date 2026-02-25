import { defineConfig } from '@playwright/test';

try {
	process.loadEnvFile();
} catch {
	// .env may not exist (e.g. CI sets env vars directly)
}

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview', port: 4173, timeout: 120000 },
	testDir: 'e2e'
});

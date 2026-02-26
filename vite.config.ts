import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
const dirname =
	typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
	plugins: [sveltekit(), devtoolsJson()],
	server: {
		port: 3000,
		strictPort: true
	},
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov', 'json-summary', 'json'],
			reportsDirectory: './coverage',
			include: ['src/**/*.{ts,js,svelte}'],
			exclude: [
				'src/**/*.{test,spec}.{ts,js}',
				'src/**/*.stories.{ts,js,svelte}',
				'src/lib/server/db/migrations/**',
				'src/lib/server/auth.ts',
				'src/lib/server/db/index.ts',
				'src/lib/server/db/auth.schema.ts',
				'src/lib/server/db/dictionary.schema.ts',
				'src/lib/server/db/dictionary.views.ts',
				'src/lib/server/db/stage.schema.ts',
				'src/lib/server/db/schema.ts',
				'src/lib/server/services/email.ts',
				'src/lib/server/services/dictionary.ts',
				'src/hooks.server.ts',
				'src/routes/api/tts/**',
				'src/routes/api/dictionary/**',
				'src/routes/*/dictionary/*/+page.server.ts',
				'src/routes/*/dictionary/explain/**',
				'src/**/*.svelte',
				'src/lib/types/**',
				'src/stories/**'
			]
		},
		expect: {
			requireAssertions: true
		},
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [
							{
								browser: 'chromium',
								headless: true
							}
						]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['src/lib/server/vitest.setup.ts']
				}
			},
			{
				extends: true,
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
					storybookTest({
						configDir: path.join(dirname, '.storybook')
					})
				],
				test: {
					name: 'storybook',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [
							{
								browser: 'chromium'
							}
						]
					},
					setupFiles: ['.storybook/vitest.setup.ts']
				}
			}
		]
	}
});

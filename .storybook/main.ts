import type { StorybookConfig } from '@storybook/sveltekit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
	addons: [
		'@storybook/addon-svelte-csf',
		'@chromatic-com/storybook',
		'@storybook/addon-vitest',
		'@storybook/addon-a11y',
		'@storybook/addon-docs'
	],
	framework: '@storybook/sveltekit',
	viteFinal(config) {
		config.resolve ??= {};
		config.resolve.alias ??= {};
		const aliases = config.resolve.alias as Record<string, string>;
		aliases['$app/paths'] = path.resolve(__dirname, 'mocks/app-paths.ts');
		aliases['$env/dynamic/public'] = path.resolve(__dirname, 'mocks/env-dynamic-public.ts');
		return config;
	}
};
export default config;

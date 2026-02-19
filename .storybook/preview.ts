import type { Preview } from '@storybook/sveltekit';
import '../src/routes/global.css';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},

		a11y: {
			// 'todo' - show a11y violations in the test UI only
			// 'error' - fail CI on a11y violations
			// 'off' - skip a11y checks entirely
			test: 'todo'
		}
	},

	globalTypes: {
		theme: {
			description: 'Color theme',
			toolbar: {
				title: 'Theme',
				icon: 'paintbrush',
				items: [
					{ value: 'light', title: 'Light', icon: 'sun' },
					{ value: 'dark', title: 'Dark', icon: 'moon' }
				],
				dynamicTitle: true
			}
		}
	},

	initialGlobals: {
		theme: 'light'
	},

	decorators: [
		(Story, { globals }) => {
			const theme = globals.theme || 'light';
			document.documentElement.setAttribute('data-theme', theme);
			return Story();
		}
	]
};

export default preview;

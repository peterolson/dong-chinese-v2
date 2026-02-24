<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import Sidebar from './sidebar.svelte';

	const { Story } = defineMeta({
		title: 'Layout/Sidebar',
		component: Sidebar,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story
	name="Learn Active"
	args={{ currentPath: '/learn' }}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const nav = canvas.getByRole('navigation', { name: 'Main navigation' });
		await expect(nav).toBeInTheDocument();
		const learnLink = canvas.getByRole('link', { name: 'Learn' });
		await expect(learnLink).toHaveAttribute('aria-current', 'page');
		const dictLink = canvas.getByRole('link', { name: 'Dictionary' });
		await expect(dictLink).not.toHaveAttribute('aria-current');
	}}
/>

<Story name="Dictionary Active" args={{ currentPath: '/dictionary' }} />

<Story name="Settings Active" args={{ currentPath: '/settings' }} />

<Story
	name="No Active Page"
	args={{ currentPath: '/some-other-page' }}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const links = canvas.getAllByRole('link');
		for (const link of links) {
			await expect(link).not.toHaveAttribute('aria-current');
		}
	}}
/>

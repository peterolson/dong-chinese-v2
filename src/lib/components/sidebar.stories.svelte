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
	name="Home Active"
	args={{ currentPath: '/' }}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const nav = canvas.getByRole('navigation', { name: 'Main navigation' });
		await expect(nav).toBeInTheDocument();
		const homeLink = canvas.getByRole('link', { name: 'Home' });
		await expect(homeLink).toHaveAttribute('aria-current', 'page');
		const lessonsLink = canvas.getByRole('link', { name: 'Lessons' });
		await expect(lessonsLink).not.toHaveAttribute('aria-current');
	}}
/>

<Story
	name="Lessons Active"
	args={{ currentPath: '/lessons' }}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const lessonsLink = canvas.getByRole('link', { name: 'Lessons' });
		await expect(lessonsLink).toHaveAttribute('aria-current', 'page');
		const homeLink = canvas.getByRole('link', { name: 'Home' });
		await expect(homeLink).not.toHaveAttribute('aria-current');
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

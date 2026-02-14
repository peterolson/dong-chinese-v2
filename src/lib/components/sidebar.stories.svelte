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
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const nav = canvas.getByRole('navigation', { name: 'Main navigation' });
		await expect(nav).toBeInTheDocument();
		const homeLink = canvas.getByRole('link', { name: 'Home' });
		await expect(homeLink).toHaveAttribute('aria-current', 'page');
		const lessonsLink = canvas.getByRole('link', { name: 'Lessons' });
		await expect(lessonsLink).not.toHaveAttribute('aria-current');
	}}
>
	<div style="height: 500px;">
		<Sidebar currentPath="/" />
	</div>
</Story>

<Story
	name="Lessons Active"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const lessonsLink = canvas.getByRole('link', { name: 'Lessons' });
		await expect(lessonsLink).toHaveAttribute('aria-current', 'page');
		const homeLink = canvas.getByRole('link', { name: 'Home' });
		await expect(homeLink).not.toHaveAttribute('aria-current');
	}}
>
	<div style="height: 500px;">
		<Sidebar currentPath="/lessons" />
	</div>
</Story>

<Story name="Dictionary Active">
	<div style="height: 500px;">
		<Sidebar currentPath="/dictionary" />
	</div>
</Story>

<Story name="Settings Active">
	<div style="height: 500px;">
		<Sidebar currentPath="/settings" />
	</div>
</Story>

<Story
	name="No Active Page"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const links = canvas.getAllByRole('link');
		for (const link of links) {
			await expect(link).not.toHaveAttribute('aria-current');
		}
	}}
>
	<div style="height: 500px;">
		<Sidebar currentPath="/some-other-page" />
	</div>
</Story>

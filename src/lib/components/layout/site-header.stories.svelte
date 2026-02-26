<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, within } from 'storybook/test';
	import SiteHeader from './site-header.svelte';

	const { Story } = defineMeta({
		title: 'Layout/SiteHeader',
		component: SiteHeader,
		tags: ['autodocs'],
		parameters: {
			layout: 'fullscreen'
		}
	});
</script>

<Story
	name="Logged Out"
	args={{ user: null }}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const logo = canvas.getByAltText('懂中文 Dong Chinese');
		await expect(logo).toBeInTheDocument();
		const loginLink = canvas.getByRole('link', { name: /log in/i });
		await expect(loginLink).toBeInTheDocument();
	}}
/>

<Story
	name="Logged In"
	args={{
		user: {
			id: '1',
			name: 'Jane Doe',
			email: 'jane@example.com',
			emailVerified: true,
			image: null,
			createdAt: new Date(),
			updatedAt: new Date()
		}
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const toggle = canvas.getByRole('checkbox', { name: /account menu/i });
		await expect(toggle).toBeInTheDocument();
		// Open the popover
		await userEvent.click(toggle);
		await expect(canvas.getByText('Jane Doe')).toBeVisible();
		await expect(canvas.getByRole('button', { name: /sign out/i })).toBeVisible();
	}}
/>

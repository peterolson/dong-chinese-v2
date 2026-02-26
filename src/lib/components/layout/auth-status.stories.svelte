<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, within } from 'storybook/test';
	import AuthStatus from './auth-status.svelte';

	const { Story } = defineMeta({
		title: 'Auth/AuthStatus',
		component: AuthStatus,
		tags: ['autodocs']
	});
</script>

<Story
	name="Logged Out"
	args={{ user: null }}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const loginLink = canvas.getByRole('link', { name: /log in/i });
		await expect(loginLink).toBeInTheDocument();
		await expect(loginLink).toHaveAttribute('href', '/login');
		const accountButton = canvas.queryByLabelText('Account menu');
		await expect(accountButton).not.toBeInTheDocument();
	}}
/>

<Story
	name="Logged In With Name"
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
		// Should not have a log in link
		const loginLink = canvas.queryByRole('link', { name: /log in/i });
		await expect(loginLink).not.toBeInTheDocument();
	}}
/>

<Story
	name="Logged In Email Only"
	args={{
		user: {
			id: '2',
			name: '',
			email: 'user@example.com',
			emailVerified: false,
			image: null,
			createdAt: new Date(),
			updatedAt: new Date()
		}
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Open the popover to see the email
		await userEvent.click(canvas.getByRole('checkbox', { name: /account menu/i }));
		await expect(canvas.getByText('user@example.com')).toBeVisible();
		await expect(canvas.getByRole('button', { name: /sign out/i })).toBeVisible();
	}}
/>

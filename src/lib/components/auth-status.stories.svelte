<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
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
		// Sign out button should not be present
		const signOutButton = canvas.queryByRole('button', { name: /sign out/i });
		await expect(signOutButton).not.toBeInTheDocument();
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
		// Should display the user's name
		await expect(canvas.getByText('Jane Doe')).toBeInTheDocument();
		// Should have a sign out button
		const signOutButton = canvas.getByRole('button', { name: /sign out/i });
		await expect(signOutButton).toBeInTheDocument();
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
		// Should fall back to email when name is empty
		await expect(canvas.getByText('user@example.com')).toBeInTheDocument();
		// Should still have sign out button
		const signOutButton = canvas.getByRole('button', { name: /sign out/i });
		await expect(signOutButton).toBeInTheDocument();
	}}
/>

<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import Alert from './alert.svelte';

	const { Story } = defineMeta({
		title: 'Components/Alert',
		component: Alert,
		tags: ['autodocs']
	});
</script>

<Story
	name="Error"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const alert = canvas.getByRole('alert');
		await expect(alert).toBeInTheDocument();
		await expect(alert).toHaveTextContent('Invalid credentials. Please try again.');
	}}
>
	<Alert variant="error">Invalid credentials. Please try again.</Alert>
</Story>

<Story
	name="Success"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const status = canvas.getByRole('status');
		await expect(status).toBeInTheDocument();
		await expect(status).toHaveTextContent('Check your email for a sign-in link.');
	}}
>
	<Alert variant="success">Check your email for a sign-in link.</Alert>
</Story>

<Story
	name="Warning"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const alert = canvas.getByRole('alert');
		await expect(alert).toBeInTheDocument();
		await expect(alert).toHaveTextContent('Your session will expire in 5 minutes.');
	}}
>
	<Alert variant="warning">Your session will expire in 5 minutes.</Alert>
</Story>

<Story
	name="Info"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const status = canvas.getByRole('status');
		await expect(status).toBeInTheDocument();
		await expect(status).toHaveTextContent('You can also sign in with your username.');
	}}
>
	<Alert variant="info">You can also sign in with your username.</Alert>
</Story>

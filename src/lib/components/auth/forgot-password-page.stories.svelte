<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import ForgotPasswordPage from '../../../routes/(auth)/forgot-password/+page.svelte';

	const { Story } = defineMeta({
		title: 'Auth/ForgotPasswordPage',
		component: ForgotPasswordPage,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		}
	});
</script>

<Story
	name="Default"
	args={{
		form: null
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByRole('heading', { name: /reset your password/i })).toBeInTheDocument();
		await expect(canvas.getByLabelText(/email/i)).toBeRequired();
		await expect(canvas.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
		await expect(canvas.getByRole('link', { name: /back to log in/i })).toHaveAttribute(
			'href',
			'/login'
		);
	}}
/>

<Story
	name="With Error"
	args={{
		form: {
			message: 'Email is required.',
			email: ''
		}
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const alert = canvas.getByRole('alert');
		await expect(alert).toBeInTheDocument();
		await expect(alert).toHaveTextContent('Email is required.');
	}}
/>

<Story
	name="Success"
	args={{
		form: {
			success: true
		}
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const status = canvas.getByRole('status');
		await expect(status).toBeInTheDocument();
		await expect(status).toHaveTextContent(/password reset link/i);
		// Form should not be visible after success
		const button = canvas.queryByRole('button', { name: /send reset link/i });
		await expect(button).not.toBeInTheDocument();
	}}
/>

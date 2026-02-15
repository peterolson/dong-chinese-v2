<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import ResetPasswordPage from '../../routes/(auth)/reset-password/+page.svelte';

	const { Story } = defineMeta({
		title: 'Auth/ResetPasswordPage',
		component: ResetPasswordPage,
		tags: ['autodocs'],
		parameters: {
			layout: 'centered'
		}
	});
</script>

<Story
	name="Default"
	args={{
		data: {
			token: 'abc123'
		},
		form: null
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByRole('heading', { name: /set a new password/i })).toBeInTheDocument();
		await expect(canvas.getByLabelText(/^new password/i)).toBeRequired();
		await expect(canvas.getByLabelText(/^confirm new password/i)).toBeRequired();
		await expect(canvas.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
		await expect(canvas.getByRole('link', { name: /back to log in/i })).toHaveAttribute(
			'href',
			'/login'
		);
	}}
/>

<Story
	name="With Error"
	args={{
		data: {
			token: 'abc123'
		},
		form: {
			message: 'Passwords do not match.'
		}
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const alert = canvas.getByRole('alert');
		await expect(alert).toBeInTheDocument();
		await expect(alert).toHaveTextContent('Passwords do not match.');
	}}
/>

<Story
	name="Expired Token"
	args={{
		data: {
			token: 'expired-token'
		},
		form: {
			message: 'This reset link has expired or is invalid. Please request a new one.'
		}
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const alert = canvas.getByRole('alert');
		await expect(alert).toBeInTheDocument();
		await expect(alert).toHaveTextContent(/expired or is invalid/i);
	}}
/>

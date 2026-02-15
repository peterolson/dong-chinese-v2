<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import LoginPage from '../../routes/(auth)/login/+page.svelte';

	const { Story } = defineMeta({
		title: 'Auth/LoginPage',
		component: LoginPage,
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
			socialProviders: [],
			redirectTo: '/',
			passwordReset: false
		},
		form: null
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Page heading
		await expect(canvas.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
		// Identifier and password fields
		const identifierInput = canvas.getByLabelText(/email or username/i);
		await expect(identifierInput).toBeInTheDocument();
		await expect(identifierInput).toHaveAttribute('type', 'text');
		await expect(identifierInput).toBeRequired();
		const passwordInput = canvas.getByLabelText(/^password$/i);
		await expect(passwordInput).toBeInTheDocument();
		await expect(passwordInput).toBeRequired();
		// Submit button
		await expect(canvas.getByRole('button', { name: /log in/i })).toBeInTheDocument();
		// Links
		await expect(canvas.getByRole('link', { name: /create an account/i })).toHaveAttribute(
			'href',
			'/register'
		);
		await expect(canvas.getByRole('link', { name: /forgot password/i })).toHaveAttribute(
			'href',
			'/forgot-password'
		);
		// No error message
		const alert = canvas.queryByRole('alert');
		await expect(alert).not.toBeInTheDocument();
		// No social providers section
		const socialButton = canvas.queryByText(/google|facebook|github/i);
		await expect(socialButton).not.toBeInTheDocument();
	}}
/>

<Story
	name="With Error"
	args={{
		data: {
			socialProviders: [],
			redirectTo: '/',
			passwordReset: false
		},
		form: {
			message: 'Invalid credentials.',
			identifier: 'user@example.com'
		}
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Error message should be visible
		const alert = canvas.getByRole('alert');
		await expect(alert).toBeInTheDocument();
		await expect(alert).toHaveTextContent('Invalid credentials.');
		// Identifier field should be repopulated
		const identifierInput = canvas.getByLabelText(/email or username/i);
		await expect(identifierInput).toHaveValue('user@example.com');
	}}
/>

<Story
	name="With Error Username"
	args={{
		data: {
			socialProviders: [],
			redirectTo: '/',
			passwordReset: false
		},
		form: {
			message: 'Invalid credentials.',
			identifier: 'johndoe'
		}
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Error message should be visible
		const alert = canvas.getByRole('alert');
		await expect(alert).toBeInTheDocument();
		await expect(alert).toHaveTextContent('Invalid credentials.');
		// Identifier field should be repopulated with username
		const identifierInput = canvas.getByLabelText(/email or username/i);
		await expect(identifierInput).toHaveValue('johndoe');
	}}
/>

<Story
	name="With Social Providers"
	args={{
		data: {
			socialProviders: [
				{ name: 'google', label: 'Google' },
				{ name: 'github', label: 'GitHub' }
			],
			redirectTo: '/',
			passwordReset: false
		},
		form: null
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Social buttons should be rendered with branded text
		await expect(canvas.getByRole('button', { name: /google/i })).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: /github/i })).toBeInTheDocument();
		// "or" divider should be visible
		const dividers = canvas.getAllByText('or');
		await expect(dividers.length).toBeGreaterThanOrEqual(1);
	}}
/>

<Story
	name="All Social Providers"
	args={{
		data: {
			socialProviders: [
				{ name: 'google', label: 'Google' },
				{ name: 'facebook', label: 'Facebook' },
				{ name: 'github', label: 'GitHub' }
			],
			redirectTo: '/dashboard',
			passwordReset: false
		},
		form: null
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// All three social buttons
		await expect(canvas.getByRole('button', { name: /google/i })).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: /facebook/i })).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: /github/i })).toBeInTheDocument();
	}}
/>

<Story
	name="Password Reset Success"
	args={{
		data: {
			socialProviders: [],
			redirectTo: '/',
			passwordReset: true
		},
		form: null
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		// Success message should be visible
		const status = canvas.getByRole('status');
		await expect(status).toBeInTheDocument();
		await expect(status).toHaveTextContent(/password has been reset/i);
	}}
/>

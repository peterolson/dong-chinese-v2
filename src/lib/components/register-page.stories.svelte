<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import RegisterPage from '../../routes/(auth)/register/+page.svelte';

	const { Story } = defineMeta({
		title: 'Auth/RegisterPage',
		component: RegisterPage,
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
			redirectTo: '/'
		},
		form: null
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
		const emailInputs = canvas.getAllByRole('textbox', { name: /^email$/i });
		const registrationEmail = emailInputs.find((el) => el.hasAttribute('required'));
		await expect(registrationEmail).toBeInTheDocument();
		await expect(canvas.getByLabelText(/^password/i)).toBeRequired();
		await expect(canvas.getByLabelText(/^confirm password/i)).toBeRequired();
		await expect(canvas.getByRole('button', { name: /create account/i })).toBeInTheDocument();
		await expect(canvas.getByRole('link', { name: /log in/i })).toHaveAttribute('href', '/login');
	}}
/>

<Story
	name="With Error"
	args={{
		data: {
			socialProviders: [],
			redirectTo: '/'
		},
		form: {
			message: 'An account with this email already exists.',
			name: 'Alice',
			email: 'alice@example.com',
			username: 'alice'
		}
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const alert = canvas.getByRole('alert');
		await expect(alert).toBeInTheDocument();
		await expect(alert).toHaveTextContent('An account with this email already exists.');
		await expect(canvas.getByLabelText(/^name$/i)).toHaveValue('Alice');
		const emailInputs = canvas.getAllByRole('textbox', { name: /^email$/i });
		const registrationEmail = emailInputs.find((el) => el.hasAttribute('required'));
		await expect(registrationEmail).toHaveValue('alice@example.com');
		await expect(canvas.getByLabelText(/^username$/i)).toHaveValue('alice');
	}}
/>

<Story
	name="With Social Providers"
	args={{
		data: {
			socialProviders: [
				{ name: 'google', label: 'Google' },
				{ name: 'facebook', label: 'Facebook' },
				{ name: 'github', label: 'GitHub' }
			],
			redirectTo: '/'
		},
		form: null
	}}
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByRole('button', { name: /google/i })).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: /facebook/i })).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: /github/i })).toBeInTheDocument();
	}}
/>

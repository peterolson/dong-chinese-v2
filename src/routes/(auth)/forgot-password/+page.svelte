<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Alert from '$lib/components/alert.svelte';
	import AuthCard from '$lib/components/auth-card.svelte';
	import Button from '$lib/components/button.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Forgot password — Dong Chinese</title>
</svelte:head>

<AuthCard
	title="Reset your password"
	subtitle="Enter the email address associated with your account and we'll send you a link to reset your password."
>
	{#snippet alerts()}
		{#if form?.success}
			<Alert variant="success">
				If an account exists with that email, you'll receive a password reset link shortly. Check
				your inbox.
			</Alert>
		{/if}
	{/snippet}

	{#if !form?.success}
		{#if form?.message}
			<Alert variant="error">{form.message}</Alert>
		{/if}

		<form method="post" action="?/requestReset" use:enhance>
			<label>
				<span>Email</span>
				<input type="email" name="email" autocomplete="email" required value={form?.email ?? ''} />
			</label>

			<Button type="submit" variant="primary">Send reset link</Button>
		</form>
	{/if}

	<p class="auth-footer">
		<a href={resolve('/(auth)/login')}>Back to log in</a>
	</p>
</AuthCard>

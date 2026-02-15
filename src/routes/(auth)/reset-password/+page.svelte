<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Alert from '$lib/components/alert.svelte';
	import AuthCard from '$lib/components/auth-card.svelte';
	import Button from '$lib/components/button.svelte';
	import PasswordInput from '$lib/components/password-input.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Reset password — Dong Chinese</title>
</svelte:head>

<AuthCard title="Set a new password">
	{#snippet alerts()}
		{#if form?.message}
			<Alert variant="error">{form.message}</Alert>
		{/if}
	{/snippet}

	<form method="post" action="?/resetPassword" use:enhance>
		<input type="hidden" name="token" value={data.token} />

		<label>
			<span>New password</span>
			<PasswordInput name="newPassword" autocomplete="new-password" required />
		</label>

		<label>
			<span>Confirm new password</span>
			<PasswordInput name="confirmPassword" autocomplete="new-password" required />
		</label>

		<Button type="submit" variant="primary">Reset password</Button>
	</form>

	<p class="auth-footer">
		<a href={resolve('/(auth)/login')}>Back to log in</a>
	</p>
</AuthCard>

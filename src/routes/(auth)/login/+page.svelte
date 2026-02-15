<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Alert from '$lib/components/ui/alert.svelte';
	import AuthCard from '$lib/components/auth/auth-card.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import MagicLinkForm from '$lib/components/auth/magic-link-form.svelte';
	import PasswordInput from '$lib/components/auth/password-input.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Log in — Dong Chinese</title>
</svelte:head>

<AuthCard title="Log in" socialProviders={data.socialProviders} redirectTo={data.redirectTo}>
	{#snippet alerts()}
		{#if data.passwordReset}
			<Alert variant="success">Your password has been reset. You can now log in.</Alert>
		{/if}
	{/snippet}

	{#snippet socialExtra()}
		<div class="magic-link-wrap">
			<MagicLinkForm
				redirectTo={data.redirectTo}
				magicLinkMessage={form?.magicLinkMessage}
				magicLinkError={form?.magicLinkError}
			/>
		</div>
	{/snippet}

	{#if form?.message}
		<Alert variant="error">{form.message}</Alert>
	{/if}

	<form method="post" action="?/signIn" use:enhance>
		<input type="hidden" name="redirectTo" value={data.redirectTo} />

		<label>
			<span>Email or username</span>
			<input
				type="text"
				name="identifier"
				autocomplete="username"
				required
				value={form?.identifier ?? ''}
			/>
		</label>

		<label>
			<span>Password</span>
			<PasswordInput name="password" autocomplete="current-password" required />
		</label>

		<Button type="submit" variant="primary">Log in</Button>
	</form>

	<div class="auth-links">
		<a href={resolve('/(auth)/register')}>Create an account</a>
		<a href={resolve('/(auth)/forgot-password')}>Forgot password?</a>
	</div>

	{#snippet afterColumns()}
		{#if data.socialProviders.length === 0}
			<div class="standalone-magic-link">
				<div class="divider"><span>or</span></div>
				<MagicLinkForm
					redirectTo={data.redirectTo}
					magicLinkMessage={form?.magicLinkMessage}
					magicLinkError={form?.magicLinkError}
				/>
			</div>
		{/if}
	{/snippet}
</AuthCard>

<style>
	.magic-link-wrap {
		margin-top: 0.25rem;
	}

	.standalone-magic-link {
		margin-top: 1.5rem;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		color: var(--muted-foreground);
		font-size: 0.8125rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--border);
	}
</style>

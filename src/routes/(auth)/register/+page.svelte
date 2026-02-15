<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Alert from '$lib/components/alert.svelte';
	import AuthCard from '$lib/components/auth-card.svelte';
	import Button from '$lib/components/button.svelte';
	import MagicLinkForm from '$lib/components/magic-link-form.svelte';
	import PasswordInput from '$lib/components/password-input.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Create an account — Dong Chinese</title>
</svelte:head>

<AuthCard
	title="Create an account"
	socialProviders={data.socialProviders}
	redirectTo={data.redirectTo}
	socialButtonPrefix="Sign up with"
>
	{#snippet socialExtra()}
		<div class="magic-link-wrap">
			<MagicLinkForm
				redirectTo={data.redirectTo}
				label="Email me a sign up link"
				magicLinkMessage={form?.magicLinkMessage}
				magicLinkError={form?.magicLinkError}
			/>
		</div>
	{/snippet}

	{#if form?.message}
		<Alert variant="error">{form.message}</Alert>
	{/if}

	<form method="post" action="?/signUp" use:enhance>
		<input type="hidden" name="redirectTo" value={data.redirectTo} />

		<label>
			<span>Name</span>
			<input
				type="text"
				name="name"
				autocomplete="name"
				value={form?.name ?? ''}
				placeholder="Optional"
			/>
		</label>

		<label>
			<span>Email</span>
			<input type="email" name="email" autocomplete="email" required value={form?.email ?? ''} />
		</label>

		<label>
			<span>Username</span>
			<input
				type="text"
				name="username"
				autocomplete="username"
				value={form?.username ?? ''}
				placeholder="Optional"
			/>
		</label>

		<label>
			<span>Password</span>
			<PasswordInput name="password" autocomplete="new-password" required />
		</label>

		<label>
			<span>Confirm password</span>
			<PasswordInput name="confirmPassword" autocomplete="new-password" required />
		</label>

		<Button type="submit" variant="primary">Create account</Button>
	</form>

	<p class="auth-footer">
		Already have an account? <a href={resolve('/(auth)/login')}>Log in</a>
	</p>

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

<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Alert from '$lib/components/alert.svelte';
	import Button from '$lib/components/button.svelte';
	import ProgressButton from '$lib/components/progress-button.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let magicLinkLoading = $state(false);
</script>

<svelte:head>
	<title>Log in — Dong Chinese</title>
</svelte:head>

<div class="login-page">
	<h1>Log in</h1>

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
			<input type="password" name="password" autocomplete="current-password" required />
		</label>

		<Button type="submit">Log in</Button>
	</form>

	<p class="links">
		<a href={resolve('/(auth)/register')}>Create an account</a>
		<a href={resolve('/(auth)/forgot-password')}>Forgot password?</a>
	</p>

	<div class="divider"><span>or</span></div>

	{#if form?.magicLinkMessage && !form?.magicLinkError}
		<Alert variant="success">{form.magicLinkMessage}</Alert>
	{:else}
		<form
			method="post"
			action="?/sendMagicLink"
			use:enhance={() => {
				magicLinkLoading = true;
				return async ({ update }) => {
					magicLinkLoading = false;
					await update();
				};
			}}
		>
			<input type="hidden" name="redirectTo" value={data.redirectTo} />

			{#if form?.magicLinkMessage && form?.magicLinkError}
				<Alert variant="error">{form.magicLinkMessage}</Alert>
			{/if}

			<label>
				<span>Email</span>
				<input type="email" name="email" autocomplete="email" required />
			</label>

			<ProgressButton type="submit" loading={magicLinkLoading}>Email sign-in link</ProgressButton>
		</form>
	{/if}

	{#if data.socialProviders.length > 0}
		<div class="divider"><span>or</span></div>

		<div class="social-providers">
			{#each data.socialProviders as provider (provider.name)}
				<form method="post" action="?/signInSocial" use:enhance>
					<input type="hidden" name="provider" value={provider.name} />
					<input type="hidden" name="redirectTo" value={data.redirectTo} />
					<Button type="submit" variant="outline">
						Continue with {provider.label}
					</Button>
				</form>
			{/each}
		</div>
	{/if}
</div>

<style>
	.login-page {
		max-width: 24rem;
		margin: 2rem auto;
		padding: 0 1rem;
	}

	h1 {
		margin-bottom: 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	label span {
		font-weight: 500;
	}

	input[type='text'],
	input[type='password'],
	input[type='email'] {
		padding: 0.5rem;
		border: 1px solid var(--color-border, #ccc);
		border-radius: 4px;
		font-size: 1rem;
	}

	.links {
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
		font-size: 0.875rem;
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin: 1.5rem 0;
		color: var(--color-text-muted, #666);
		font-size: 0.875rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--color-border, #ccc);
	}

	.social-providers {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
</style>

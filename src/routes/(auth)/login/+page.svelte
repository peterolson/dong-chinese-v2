<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Log in — Dong Chinese</title>
</svelte:head>

<div class="login-page">
	<h1>Log in</h1>

	{#if form?.message}
		<p class="error" role="alert">{form.message}</p>
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

		<button type="submit">Log in</button>
	</form>

	<p class="links">
		<a href="/register">Create an account</a>
		<a href="/forgot-password">Forgot password?</a>
	</p>

	{#if data.socialProviders.length > 0}
		<div class="divider"><span>or</span></div>

		<div class="social-providers">
			{#each data.socialProviders as provider (provider.name)}
				<form method="post" action="?/signInSocial" use:enhance>
					<input type="hidden" name="provider" value={provider.name} />
					<input type="hidden" name="redirectTo" value={data.redirectTo} />
					<button type="submit" class="social-button">
						Continue with {provider.label}
					</button>
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

	.error {
		color: var(--color-error, #c00);
		background: var(--color-error-bg, #fdd);
		border: 1px solid var(--color-error-border, #c00);
		border-radius: 4px;
		padding: 0.5rem 0.75rem;
		margin-bottom: 1rem;
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
	input[type='password'] {
		padding: 0.5rem;
		border: 1px solid var(--color-border, #ccc);
		border-radius: 4px;
		font-size: 1rem;
	}

	button[type='submit'] {
		padding: 0.5rem 1rem;
		background: var(--color-primary, #1a73e8);
		color: var(--color-primary-text, #fff);
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
	}

	button[type='submit']:hover {
		opacity: 0.9;
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

	.social-button {
		width: 100%;
		background: var(--color-surface, #fff);
		color: var(--color-text, #333);
		border: 1px solid var(--color-border, #ccc);
	}

	.social-button:hover {
		background: var(--color-surface-hover, #f5f5f5);
		opacity: 1;
	}
</style>

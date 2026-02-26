<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleUser } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import type { AuthUser } from '$lib/server/auth';

	let { user, variant = 'default' }: { user: AuthUser | null; variant?: 'default' | 'on-primary' } =
		$props();

	const id = $props.id();
	const toggleId = `account-toggle-${id}`;
	const username = $derived(user ? user.name || user.username || user.email : null);
</script>

<div class="auth-status" class:on-primary={variant === 'on-primary'}>
	{#if user}
		<input type="checkbox" id={toggleId} class="sr-only" aria-label="Account menu" />
		<label for={toggleId} class="account-button">
			<CircleUser size={22} aria-hidden="true" />
		</label>
		<div class="account-popover">
			<label for={toggleId} class="account-backdrop"></label>
			<div class="account-menu">
				<span class="user-name">{username}</span>
				<form method="post" action="/login?/signOut" use:enhance>
					<button type="submit" class="sign-out-btn">Sign out</button>
				</form>
			</div>
		</div>
	{:else}
		<a href={resolve('/login')} class="login-link">Log in</a>
	{/if}
</div>

<style>
	.auth-status {
		display: flex;
		align-items: center;
		font-size: 0.875rem;
		user-select: none;
		position: relative;
		color: var(--muted-foreground);
	}

	.auth-status.on-primary {
		color: var(--primary-foreground);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.account-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius);
		color: inherit;
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.auth-status:not(.on-primary) .account-button:hover {
		background: var(--surface);
	}

	.auth-status.on-primary .account-button:hover {
		background: rgb(255 255 255 / 0.15);
	}

	.sr-only:focus-visible ~ .account-button {
		outline: 2px solid var(--ring, Highlight);
		outline-offset: 2px;
	}

	.account-popover {
		display: none;
	}

	.sr-only:checked ~ .account-popover {
		display: block;
	}

	.account-backdrop {
		position: fixed;
		inset: 0;
		cursor: default;
	}

	.account-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.25rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.5rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: max-content;
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
		z-index: 1;
	}

	.user-name {
		color: var(--muted-foreground);
		font-size: 0.875rem;
	}

	.sign-out-btn {
		color: var(--muted-foreground);
		background: none;
		border: 1px solid var(--border);
		padding: 0.25rem 0.75rem;
		font-size: 0.875rem;
		border-radius: var(--radius);
		cursor: pointer;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			color 0.15s;
	}

	.sign-out-btn:hover {
		background: var(--surface);
		border-color: var(--muted-foreground);
		color: var(--foreground);
	}

	.login-link {
		color: inherit;
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-decoration: none;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			color 0.15s;
	}

	.auth-status.on-primary .login-link {
		border-color: rgb(255 255 255 / 0.3);
	}

	.auth-status:not(.on-primary) .login-link:hover {
		background: var(--surface);
		border-color: var(--muted-foreground);
		color: var(--foreground);
		text-decoration: none;
	}

	.auth-status.on-primary .login-link:hover {
		background: rgb(255 255 255 / 0.15);
		border-color: rgb(255 255 255 / 0.5);
		text-decoration: none;
	}
</style>

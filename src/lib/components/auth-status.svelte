<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { AuthUser } from '$lib/server/auth';

	let { user }: { user: AuthUser | null } = $props();
</script>

<div class="auth-status">
	{#if user}
		<span class="user-name">{user.name || user.username || user.email}</span>
		<form method="post" action="/login?/signOut" use:enhance>
			<button type="submit">Sign out</button>
		</form>
	{:else}
		<a href={resolve('/login')}>Log in</a>
	{/if}
</div>

<style>
	.auth-status {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.user-name {
		color: var(--color-text, #333);
	}

	form {
		display: inline;
	}

	button {
		background: none;
		border: none;
		color: var(--color-primary, #1a73e8);
		cursor: pointer;
		padding: 0;
		font-size: inherit;
		text-decoration: underline;
	}

	button:hover {
		opacity: 0.8;
	}

	a {
		color: var(--color-primary, #1a73e8);
	}
</style>

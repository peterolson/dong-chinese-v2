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
		color: var(--primary-foreground);
		user-select: none;
	}

	.user-name {
		opacity: 0.9;
	}

	form {
		display: inline;
	}

	button {
		background: none;
		border: 1px solid rgb(255 255 255 / 0.3);
		color: var(--primary-foreground);
		cursor: pointer;
		padding: 0.25rem 0.75rem;
		font-size: inherit;
		border-radius: var(--radius);
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	button:hover {
		background: rgb(255 255 255 / 0.15);
		border-color: rgb(255 255 255 / 0.5);
	}

	a {
		color: var(--primary-foreground);
		padding: 0.25rem 0.75rem;
		border: 1px solid rgb(255 255 255 / 0.3);
		border-radius: var(--radius);
		transition:
			background-color 0.15s,
			border-color 0.15s;
		text-decoration: none;
	}

	a:hover {
		background: rgb(255 255 255 / 0.15);
		border-color: rgb(255 255 255 / 0.5);
		text-decoration: none;
	}
</style>

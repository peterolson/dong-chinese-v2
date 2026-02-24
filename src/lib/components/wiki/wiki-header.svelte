<script lang="ts">
	import { Menu } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import type { AuthUser } from '$lib/server/auth';

	let { user }: { user: AuthUser | null } = $props();
</script>

<header class="wiki-header">
	<div class="header-left">
		<label for="sidebar-toggle" class="menu-button" aria-label="Toggle navigation">
			<Menu size={24} aria-hidden="true" />
		</label>
		<a href={resolve('/wiki')} class="wiki-brand">
			<span class="wiki-brand-zh" aria-hidden="true">字</span>
			<span class="wiki-brand-text">Chinese Character Wiki</span>
		</a>
	</div>
	<div class="header-right">
		{#if user}
			<span class="user-name">{user.name || user.username || user.email}</span>
			<form method="post" action="/login?/signOut">
				<button type="submit" class="header-link">Sign out</button>
			</form>
		{:else}
			<a href={resolve('/login')} class="header-link">Log in</a>
		{/if}
	</div>
</header>

<style>
	.wiki-header {
		position: sticky;
		top: 0;
		z-index: 30;
		height: var(--header-height);
		background: var(--background);
		color: var(--foreground);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		border-bottom: 1px solid var(--border);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.menu-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius);
		color: var(--muted-foreground);
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.menu-button:hover {
		background: var(--surface);
	}

	.wiki-brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--foreground);
		user-select: none;
	}

	.wiki-brand:hover {
		text-decoration: none;
	}

	.wiki-brand-zh {
		font-size: 1.5rem;
		line-height: 1;
		font-weight: 700;
		color: var(--muted-foreground);
	}

	.wiki-brand-text {
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
		user-select: none;
	}

	.user-name {
		color: var(--muted-foreground);
	}

	form {
		display: inline;
	}

	.header-link {
		color: var(--muted-foreground);
		background: none;
		border: 1px solid var(--border);
		padding: 0.25rem 0.75rem;
		font-size: inherit;
		border-radius: var(--radius);
		text-decoration: none;
		transition:
			background-color 0.15s,
			border-color 0.15s,
			color 0.15s;
	}

	.header-link:hover {
		background: var(--surface);
		border-color: var(--muted-foreground);
		color: var(--foreground);
		text-decoration: none;
	}

	@media (max-width: 480px) {
		.wiki-brand-text {
			font-size: 0.9375rem;
		}

		.wiki-brand-zh {
			font-size: 1.25rem;
		}
	}
</style>

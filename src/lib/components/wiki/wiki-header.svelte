<script lang="ts">
	import { Menu } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import AuthStatus from '$lib/components/layout/auth-status.svelte';
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
			<span class="wiki-brand-text brand-full">Chinese Character Wiki</span>
			<span class="wiki-brand-text brand-short">Wiki</span>
		</a>
	</div>
	<AuthStatus {user} />
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

	.brand-short {
		display: none;
	}

	@media (max-width: 480px) {
		.brand-full {
			display: none;
		}

		.brand-short {
			display: inline;
		}

		.wiki-brand-zh {
			font-size: 1.25rem;
		}
	}
</style>

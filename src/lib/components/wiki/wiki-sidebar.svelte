<script lang="ts">
	import { House, Search, List, Clock, CheckCircle, BookText } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { canReview = false }: { canReview?: boolean } = $props();

	const mainNav = [
		{ href: '/wiki', label: 'Wiki Home', icon: House },
		{ href: '/wiki/search', label: 'Search', icon: Search },
		{ href: '/wiki/lists', label: 'Lists', icon: List },
		{ href: '/wiki/recent-changes', label: 'Recent Changes', icon: Clock }
	];

	function isActive(href: string): boolean {
		const pathname = page.url.pathname;
		if (href === '/wiki') return pathname === '/wiki';
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<nav class="sidebar" aria-label="Wiki navigation">
	<ul class="nav-list">
		{#each mainNav as item (item.href)}
			<li>
				<a
					href={item.href}
					class="nav-link"
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					<item.icon size={20} class="nav-icon" aria-hidden="true" />
					{item.label}
				</a>
			</li>
		{/each}

		{#if canReview}
			<li>
				<a
					href="/wiki/pending"
					class="nav-link"
					aria-current={isActive('/wiki/pending') ? 'page' : undefined}
				>
					<CheckCircle size={20} class="nav-icon" aria-hidden="true" />
					Pending Edits
				</a>
			</li>
		{/if}
	</ul>

	<div class="nav-divider"></div>

	<ul class="nav-list">
		<li>
			<a href={resolve('/(app)/dictionary')} class="nav-link">
				<BookText size={20} class="nav-icon" aria-hidden="true" />
				Back to Dictionary
			</a>
		</li>
	</ul>
</nav>

<style>
	.sidebar {
		width: var(--sidebar-width);
		height: 100%;
		background: var(--background);
		border-right: 1px solid var(--border);
		overflow-y: auto;
		padding: 0.5rem 0;
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 1.5rem;
		color: var(--foreground);
		text-decoration: none;
		font-size: 0.9375rem;
		font-weight: 500;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.nav-link:hover {
		background: var(--surface);
		color: var(--primary-soft);
		text-decoration: none;
	}

	.nav-link[aria-current='page'] {
		background: color-mix(in srgb, var(--primary) 8%, transparent);
		color: var(--primary-soft);
		font-weight: 600;
	}

	.nav-link :global(.nav-icon) {
		flex-shrink: 0;
		color: var(--muted-foreground);
		transition: color 0.15s;
	}

	.nav-link:hover :global(.nav-icon),
	.nav-link[aria-current='page'] :global(.nav-icon) {
		color: var(--primary-soft);
	}

	.nav-divider {
		height: 1px;
		background: var(--border);
		margin: 0.5rem 1rem;
	}
</style>

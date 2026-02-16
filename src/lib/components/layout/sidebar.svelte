<script lang="ts">
	import type { RouteId } from '$app/types';
	import { House, BookOpen, BookText, Play, Settings } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	let { currentPath }: { currentPath?: string } = $props();

	type NavItem = {
		route: RouteId;
		label: string;
		icon: typeof House;
	};

	const mainNav: NavItem[] = [
		{ route: '/', label: 'Home', icon: House },
		{ route: '/(app)/lessons', label: 'Lessons', icon: BookOpen },
		{ route: '/(app)/dictionary', label: 'Dictionary', icon: BookText },
		{ route: '/(app)/media', label: 'Media', icon: Play }
	];

	const secondaryNav: NavItem[] = [{ route: '/(app)/settings', label: 'Settings', icon: Settings }];

	function isActive(href: string): boolean {
		const pathname = currentPath ?? page.url.pathname;
		if (href === '/' || href === './') return pathname === '/';
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<nav class="sidebar" aria-label="Main navigation">
	<ul class="nav-list">
		{#each mainNav as item (item.route)}
			{@const href = resolve(item.route)}
			<li>
				<a {href} class="nav-link" aria-current={isActive(href) ? 'page' : undefined}>
					<item.icon size={20} class="nav-icon" aria-hidden="true" />
					{item.label}
				</a>
			</li>
		{/each}
	</ul>

	<div class="nav-divider"></div>

	<ul class="nav-list">
		{#each secondaryNav as item (item.route)}
			{@const href = resolve(item.route)}
			<li>
				<a {href} class="nav-link" aria-current={isActive(href) ? 'page' : undefined}>
					<item.icon size={20} class="nav-icon" aria-hidden="true" />
					{item.label}
				</a>
			</li>
		{/each}
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

<script lang="ts">
	import { page } from '$app/state';
	import type { SvelteComponent } from 'svelte';

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type AnyComponent = typeof SvelteComponent<any>;

	let {
		tabs
	}: {
		tabs: { label: string; href: string; badge?: number | null; icon?: AnyComponent }[];
	} = $props();

	const pathname = $derived(decodeURIComponent(page.url.pathname));
</script>

<nav class="tab-bar" aria-label="Page tabs">
	{#each tabs as tab (tab.label)}
		{@const active = pathname === tab.href}
		<a href={tab.href} class="tab-link" class:active aria-current={active ? 'page' : undefined}>
			{#if tab.icon}
				{@const Icon = tab.icon}
				<Icon size={14} />
			{/if}
			{tab.label}
			{#if tab.badge}
				<span class="badge">{tab.badge}</span>
			{/if}
		</a>
	{/each}
</nav>

<style>
	.tab-bar {
		display: flex;
		border-bottom: 1px solid var(--border);
		margin-bottom: 1rem;
	}

	.tab-link {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--muted-foreground);
		text-decoration: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition:
			color 0.15s,
			border-color 0.15s;
	}

	.tab-link:hover {
		color: var(--foreground);
	}

	.tab-link.active {
		color: var(--primary);
		font-weight: 600;
		border-bottom-color: var(--primary);
	}

	.badge {
		display: inline-block;
		padding: 0.0625rem 0.375rem;
		border-radius: 999px;
		font-size: 0.6875rem;
		font-weight: 600;
		background: var(--warning-bg);
		color: var(--warning);
		line-height: 1.4;
	}
</style>

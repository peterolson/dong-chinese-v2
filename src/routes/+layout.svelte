<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import AuthStatus from '$lib/components/auth-status.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="site-header">
	<a href={resolve('/')} class="site-name">Dong Chinese</a>
	<AuthStatus user={data.user} />
</header>

<main>
	{@render children()}
</main>

<style>
	.site-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border, #e0e0e0);
	}

	.site-name {
		font-weight: 700;
		font-size: 1.125rem;
		text-decoration: none;
		color: var(--color-text, #333);
	}

	main {
		padding: 1rem;
	}
</style>

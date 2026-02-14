<script lang="ts">
	import favicon from '$lib/assets/favicon.ico';
	import favicon96 from '$lib/assets/favicon-96.png';
	import favicon64 from '$lib/assets/favicon-64.png';
	import favicon32 from '$lib/assets/favicon-32.png';
	import favicon16 from '$lib/assets/favicon-16.png';
	import appleTouchIcon from '$lib/assets/apple-touch-icon.png';
	import { resolve } from '$app/paths';
	import AuthStatus from '$lib/components/auth-status.svelte';
	import type { LayoutData } from './$types';
	import './global.css';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<svelte:head>
	<title>懂中文 Dong Chinese</title>
	<link rel="shortcut icon" href={favicon} />
	<link rel="icon" sizes="16x16 32x32 64x64" href={favicon} />
	<link rel="icon" type="image/png" sizes="96x96" href={favicon96} />
	<link rel="icon" type="image/png" sizes="64x64" href={favicon64} />
	<link rel="icon" type="image/png" sizes="32x32" href={favicon32} />
	<link rel="icon" type="image/png" sizes="16x16" href={favicon16} />
	<link rel="apple-touch-icon" sizes="180x180" href={appleTouchIcon} />
</svelte:head>

<header class="site-header">
	<a href={resolve('/')} class="site-name">懂中文 Dong Chinese</a>
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

<script lang="ts">
	import favicon from '$lib/assets/favicon.ico';
	import favicon96 from '$lib/assets/favicon-96.png';
	import favicon64 from '$lib/assets/favicon-64.png';
	import favicon32 from '$lib/assets/favicon-32.png';
	import favicon16 from '$lib/assets/favicon-16.png';
	import appleTouchIcon from '$lib/assets/apple-touch-icon.png';
	import logoTransparent from '$lib/assets/logo-transparent.webp';
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
	<a href={resolve('/')} class="site-name">
		<img src={logoTransparent} alt="懂中文 Dong Chinese" class="site-logo" />
	</a>
	<AuthStatus user={data.user} />
</header>

<main>
	{@render children()}
</main>

<style>
	.site-header {
		background-color: var(--primary);
		color: var(--primary-foreground);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0px 1rem;
	}

	.site-logo {
		max-height: 56px;
	}
</style>

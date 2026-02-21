<script lang="ts">
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.ico';
	import favicon96 from '$lib/assets/favicon-96.png';
	import favicon64 from '$lib/assets/favicon-64.png';
	import favicon32 from '$lib/assets/favicon-32.png';
	import favicon16 from '$lib/assets/favicon-16.png';
	import appleTouchIcon from '$lib/assets/apple-touch-icon.png';
	import SiteHeader from '$lib/components/layout/site-header.svelte';
	import Sidebar from '$lib/components/layout/sidebar.svelte';
	import { applyThemeToDOM } from '$lib/settings-client';
	import type { LayoutData } from './$types';
	import './global.css';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	// Sync theme to DOM after client-side navigations (e.g. login redirect via use:enhance)
	$effect(() => {
		if (browser) {
			applyThemeToDOM(data.settings.theme ?? null);
		}
	});
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

<!-- CSS-only sidebar toggle (works without JS) -->
<input
	type="checkbox"
	id="sidebar-toggle"
	class="sidebar-checkbox"
	aria-hidden="true"
	tabindex="-1"
/>

<SiteHeader user={data.user} />

<div class="app-body">
	<!-- Backdrop: clicking it unchecks the checkbox (closes sidebar on mobile) -->
	<label for="sidebar-toggle" class="sidebar-backdrop" aria-hidden="true"></label>

	<div class="sidebar-wrapper">
		<Sidebar />
	</div>

	<main
		class="main-content"
		lang={data.settings.characterSet === 'traditional' ? 'zh-Hant' : 'zh-Hans'}
	>
		{@render children()}
	</main>
</div>

<style>
	:global(.sidebar-checkbox) {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.app-body {
		display: flex;
		min-height: calc(100svh - var(--header-height));
	}

	/* ── Mobile (default): sidebar is fixed overlay, hidden by default ── */
	.sidebar-wrapper {
		position: fixed;
		top: var(--header-height);
		left: 0;
		bottom: 0;
		z-index: 20;
		transform: translateX(-100%);
		transition: transform 0.25s ease;
	}

	.sidebar-backdrop {
		display: none;
		position: fixed;
		inset: 0;
		top: var(--header-height);
		background: rgb(0 0 0 / 0.4);
		z-index: 15;
		cursor: default;
	}

	/* Mobile: checked = open sidebar */
	:global(.sidebar-checkbox:checked) ~ .app-body .sidebar-wrapper {
		transform: translateX(0);
	}

	:global(.sidebar-checkbox:checked) ~ .app-body .sidebar-backdrop {
		display: block;
	}

	.main-content {
		flex: 1;
		min-width: 0;
		padding: var(--content-padding);
	}

	@media (max-width: 600px) {
		.main-content {
			padding: 1.25rem 1rem;
		}
	}

	/* ── Desktop: sidebar in-flow, visible by default, checkbox hides it ── */
	@media (min-width: 960px) {
		.sidebar-wrapper {
			position: sticky;
			top: var(--header-height);
			height: calc(100svh - var(--header-height));
			transform: translateX(0);
			flex-shrink: 0;
			transition:
				margin-left 0.25s ease,
				transform 0.25s ease;
		}

		/* Desktop: checked = HIDE sidebar (opposite of mobile) */
		:global(.sidebar-checkbox:checked) ~ .app-body .sidebar-wrapper {
			margin-left: calc(-1 * var(--sidebar-width));
			transform: translateX(-100%);
			visibility: hidden;
			transition:
				margin-left 0.25s ease,
				transform 0.25s ease,
				visibility 0s 0.25s;
		}

		/* Never show backdrop on desktop */
		:global(.sidebar-checkbox:checked) ~ .app-body .sidebar-backdrop {
			display: none;
		}
	}
</style>

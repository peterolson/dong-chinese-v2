<script lang="ts">
	import { browser } from '$app/environment';
	import WikiHeader from '$lib/components/wiki/wiki-header.svelte';
	import WikiSidebar from '$lib/components/wiki/wiki-sidebar.svelte';
	import { applyThemeToDOM } from '$lib/settings-client';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	$effect(() => {
		if (browser) {
			applyThemeToDOM(data.settings.theme ?? null);
		}
	});
</script>

<svelte:head>
	<title>Chinese Character Wiki</title>
</svelte:head>

<input
	type="checkbox"
	id="sidebar-toggle"
	class="sidebar-checkbox"
	aria-hidden="true"
	tabindex="-1"
/>

<WikiHeader user={data.user} />

<div class="app-body">
	<label for="sidebar-toggle" class="sidebar-backdrop" aria-hidden="true"></label>

	<div class="sidebar-wrapper">
		<WikiSidebar canReview={data.canReview} settings={data.settings} />
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

		:global(.sidebar-checkbox:checked) ~ .app-body .sidebar-wrapper {
			margin-left: calc(-1 * var(--sidebar-width));
			transform: translateX(-100%);
			visibility: hidden;
			transition:
				margin-left 0.25s ease,
				transform 0.25s ease,
				visibility 0s 0.25s;
		}

		:global(.sidebar-checkbox:checked) ~ .app-body .sidebar-backdrop {
			display: none;
		}
	}
</style>

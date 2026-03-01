<script lang="ts">
	import SiteHeader from '$lib/components/layout/site-header.svelte';
	import Sidebar from '$lib/components/layout/sidebar.svelte';
	import { closeSidebarOnNavigate } from '$lib/components/layout/close-sidebar-on-navigate';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	closeSidebarOnNavigate();
</script>

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

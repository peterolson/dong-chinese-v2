<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { getComponentTitle } from '$lib/components/dictionary/component-colors';
	import ComponentTypeExplanation from '$lib/components/dictionary/component-type-explanation.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let title = $derived(getComponentTitle(data.type));
	let backHref = $derived.by(() => {
		const from = page.url.searchParams.get('from');
		// Sanitize: only allow relative paths (no javascript:, //, or absolute URLs)
		if (from && from.startsWith('/') && !from.startsWith('//')) return from;
		return resolve('/(app)/dictionary');
	});
</script>

<svelte:head>
	<title>{title} Component — Dong Chinese</title>
</svelte:head>

<article class="explain-page">
	<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- backHref is already resolved or from query param -->
	<a href={backHref} class="back-link">&larr; Back to dictionary</a>

	<h1>{title} component</h1>

	<ComponentTypeExplanation
		type={data.type}
		characters={data.characters}
		characterSet={data.settings?.characterSet}
	/>
</article>

<style>
	.explain-page {
		max-width: 700px;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	h1 {
		margin-bottom: 1rem;
	}
</style>

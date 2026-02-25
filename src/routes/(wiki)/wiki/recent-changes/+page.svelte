<script lang="ts">
	import EditList from '$lib/components/wiki/edit-list.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Recent Changes — Chinese Character Wiki</title>
</svelte:head>

<article class="recent-changes">
	<h1>Recent Changes</h1>

	<EditList
		items={data.items}
		baseDataMap={data.charBaseDataMap}
		showCharacter={true}
		pageNum={data.pageNum}
		totalPages={data.totalPages}
		paginationUrl="/wiki/recent-changes"
	/>
</article>

<style>
	.recent-changes {
		max-width: 70ch;
	}

	h1 {
		margin-bottom: 1.5rem;
	}
</style>

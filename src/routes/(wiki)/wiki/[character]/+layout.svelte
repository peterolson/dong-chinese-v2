<script lang="ts">
	import { BookText, Pencil, Clock } from 'lucide-svelte';
	import TabBar from '$lib/components/ui/tab-bar.svelte';
	import { setCharLinkBase } from '$lib/components/dictionary/char-link-context';
	import type { LayoutData } from './$types';

	setCharLinkBase('/wiki');

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const char = $derived(data.character.character);

	const tabs = $derived([
		{
			label: 'Entry',
			href: `/wiki/${char}`,
			icon: BookText,
			badge: data.pendingCount > 0 ? data.pendingCount : null
		},
		{ label: 'Edit', href: `/wiki/${char}/edit`, icon: Pencil },
		{ label: 'History', href: `/wiki/${char}/history`, icon: Clock }
	]);
</script>

<svelte:head>
	<title>{char} — Chinese Character Wiki</title>
</svelte:head>

<div class="wiki-character">
	<TabBar {tabs} variant="secondary" />
	{@render children()}
</div>

<style>
	.wiki-character {
		max-width: 800px;
		margin-top: -1rem;
	}
</style>

<script lang="ts">
	import CharacterView from '$lib/components/dictionary/character-view.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.character.character} — Dong Chinese Dictionary</title>
</svelte:head>

{#if data.type === 'character'}
	<CharacterView
		character={data.character}
		componentUses={data.componentUses}
		characterSet={data.settings.characterSet ?? 'simplified'}
		phoneticScript={data.settings.phoneticScript}
	/>
{/if}

<script lang="ts">
	import CharacterView from '$lib/components/dictionary/character-view.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<CharacterView
	character={data.character}
	characterSet={data.settings.characterSet ?? 'simplified'}
/>

<script lang="ts">
	import { browser } from '$app/environment';
	import favicon from '$lib/assets/favicon.ico';
	import favicon96 from '$lib/assets/favicon-96.png';
	import favicon64 from '$lib/assets/favicon-64.png';
	import favicon32 from '$lib/assets/favicon-32.png';
	import favicon16 from '$lib/assets/favicon-16.png';
	import appleTouchIcon from '$lib/assets/apple-touch-icon.png';
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

{@render children()}

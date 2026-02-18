<script lang="ts">
	import { enhance } from '$app/forms';
	import { readSettings, writeSettings, applyThemeToDOM } from '$lib/settings-client';
	import SegmentedControl from '$lib/components/ui/segmented-control.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const currentTheme = $derived(form?.settings?.theme ?? data.settings.theme ?? null);
	const currentCharSet = $derived(
		form?.settings?.characterSet ?? data.settings.characterSet ?? null
	);

	let formEl: HTMLFormElement | undefined = $state();

	const themeOptions = [
		{ value: '', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];

	const charSetOptions = [
		{ value: 'simplified', label: 'Simplified' },
		{ value: 'traditional', label: 'Traditional' }
	];
</script>

<h1>Settings</h1>

<form
	bind:this={formEl}
	method="post"
	action="?/updateSettings"
	class="settings-list"
	use:enhance={() => {
		const formData = new FormData(formEl!);

		const theme = formData.get('theme')?.toString() ?? '';
		const themeValue = theme === 'light' || theme === 'dark' ? theme : null;
		applyThemeToDOM(themeValue);

		const charSet = formData.get('characterSet')?.toString() ?? '';
		const charSetValue = charSet === 'simplified' || charSet === 'traditional' ? charSet : null;

		const current = readSettings();
		writeSettings({ ...current, theme: themeValue, characterSet: charSetValue });

		return async ({ update }) => {
			await update({ reset: false });
		};
	}}
>
	<div class="setting-row">
		<span class="setting-label">Theme</span>
		<SegmentedControl
			name="theme"
			options={themeOptions}
			selected={currentTheme ?? ''}
			onchange={() => formEl?.requestSubmit()}
		/>
	</div>
	<div class="setting-row">
		<span class="setting-label">Character set</span>
		<SegmentedControl
			name="characterSet"
			options={charSetOptions}
			selected={currentCharSet ?? 'simplified'}
			onchange={() => formEl?.requestSubmit()}
		/>
	</div>
	<noscript>
		<button type="submit">Save</button>
	</noscript>
</form>

<style>
	h1 {
		margin-bottom: 1.5rem;
	}

	.settings-list {
		max-width: 36rem;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.875rem 0;
		border-bottom: 1px solid var(--border);
	}

	.setting-label {
		font-weight: 500;
		white-space: nowrap;
	}

	noscript {
		padding: 0.875rem 0;
	}

	noscript button {
		padding: 0.375rem 1rem;
		background: var(--primary);
		color: var(--primary-foreground);
		border: none;
		border-radius: var(--radius);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
	}
</style>

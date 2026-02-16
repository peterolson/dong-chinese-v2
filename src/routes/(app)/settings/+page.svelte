<script lang="ts">
	import { enhance } from '$app/forms';
	import { readSettings, writeSettings, applyThemeToDOM } from '$lib/settings-client';
	import SegmentedControl from '$lib/components/ui/segmented-control.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const currentTheme = $derived(form?.settings?.theme ?? data.settings.theme ?? null);

	let formEl: HTMLFormElement | undefined = $state();

	const themeOptions = [
		{ value: '', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];
</script>

<h1>Settings</h1>

<div class="settings-list">
	<form
		bind:this={formEl}
		method="post"
		action="?/updateSettings"
		class="setting-row"
		use:enhance={() => {
			const formData = new FormData(formEl!);
			const theme = formData.get('theme')?.toString() ?? '';
			const value = theme === 'light' || theme === 'dark' ? theme : null;

			applyThemeToDOM(value);
			const current = readSettings();
			writeSettings({ ...current, theme: value });

			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
	>
		<span class="setting-label">Theme</span>
		<SegmentedControl
			name="theme"
			options={themeOptions}
			selected={currentTheme ?? ''}
			onchange={() => formEl?.requestSubmit()}
		/>
		<noscript>
			<button type="submit">Save</button>
		</noscript>
	</form>
</div>

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

	noscript button {
		margin-left: 0.5rem;
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

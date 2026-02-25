<script lang="ts">
	import { resolve } from '$app/paths';
	import CharacterView from '$lib/components/dictionary/character-view.svelte';
	import type { CharacterData } from '$lib/types/dictionary';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showDraft = $state(data.showDraft);

	function buildDraftCharacter(
		base: CharacterData,
		pendingEdit: Record<string, unknown>
	): CharacterData {
		const changedFields = pendingEdit.changedFields as string[] | null;
		if (!changedFields) return base;
		const result = { ...base } as Record<string, unknown>;
		for (const field of changedFields) {
			if (field in pendingEdit) {
				result[field] = pendingEdit[field];
			}
		}
		return result as unknown as CharacterData;
	}

	const displayCharacter = $derived(
		showDraft && data.userPendingEdit
			? buildDraftCharacter(data.character, data.userPendingEdit)
			: data.character
	);
</script>

{#if data.userPendingEdit}
	<div class="draft-toggle">
		<noscript>
			{#if showDraft}
				<a href={resolve(`/wiki/${data.character.character}`)} class="toggle-link">Published</a>
				<span class="toggle-active">Draft</span>
			{:else}
				<span class="toggle-active">Published</span>
				<a href={resolve(`/wiki/${data.character.character}?view=draft`)} class="toggle-link"
					>Draft</a
				>
			{/if}
		</noscript>
		<div class="js-toggle">
			<button
				type="button"
				class="toggle-btn"
				class:active={!showDraft}
				onclick={() => (showDraft = false)}
			>
				Published
			</button>
			<button
				type="button"
				class="toggle-btn"
				class:active={showDraft}
				onclick={() => (showDraft = true)}
			>
				Draft
			</button>
		</div>
	</div>
{/if}

<CharacterView
	character={displayCharacter}
	characterSet={data.settings.characterSet ?? 'simplified'}
	phoneticScript={data.settings.phoneticScript}
/>

<style>
	.draft-toggle {
		margin-bottom: 1rem;
	}

	.js-toggle {
		display: none;
	}

	@media (scripting: enabled) {
		noscript {
			display: none;
		}

		.js-toggle {
			display: flex;
			gap: 0;
		}
	}

	.toggle-btn {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		border: 1px solid var(--border);
		background: var(--background);
		color: var(--muted-foreground);
		cursor: pointer;
	}

	.toggle-btn:first-child {
		border-radius: var(--radius) 0 0 var(--radius);
	}

	.toggle-btn:last-child {
		border-radius: 0 var(--radius) var(--radius) 0;
		border-left: none;
	}

	.toggle-btn.active {
		background: var(--secondary);
		color: var(--primary-foreground);
		border-color: var(--secondary);
	}

	.toggle-link {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--secondary-soft);
		text-decoration: underline;
	}

	.toggle-active {
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--foreground);
	}
</style>

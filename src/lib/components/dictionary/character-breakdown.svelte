<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteMap } from 'svelte/reactivity';
	import type {
		ComponentData,
		CharacterData,
		HistoricalPronunciation
	} from '$lib/types/dictionary';
	import { getComponentColor, getComponentTitle } from './component-colors';
	import CharacterGlyph from './character-glyph.svelte';
	import CjkLinkedText from './cjk-linked-text.svelte';
	import Alert from '$lib/components/ui/alert.svelte';
	import Modal from '$lib/components/ui/modal.svelte';
	import ComponentTypeExplanation from './component-type-explanation.svelte';
	import OldPronunciationAlert from './old-pronunciation-alert.svelte';

	interface Props {
		character: string;
		components: ComponentData[] | null;
		hint: string | null;
		originalMeaning: string | null;
		strokes: string[] | null;
		fragments: number[][] | null;
		historicalPronunciations: HistoricalPronunciation[] | null;
		characterSet?: 'simplified' | 'traditional';
	}

	let {
		character,
		components,
		hint,
		originalMeaning,
		strokes,
		fragments,
		historicalPronunciations,
		characterSet
	}: Props = $props();

	// Modal state
	let modalOpen = $state(false);
	let modalType = $state('');
	let modalCharacters: Record<string, CharacterData> = $state({});
	let modalLoading = $state(false);

	// Client-side cache for fetched explain data
	const explainCache = new SvelteMap<string, Record<string, CharacterData>>();

	async function openExplainModal(e: MouseEvent, type: string) {
		// Let modifier clicks through for new-tab behavior
		if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

		e.preventDefault();
		modalType = type;
		modalOpen = true;

		const cached = explainCache.get(type);
		if (cached) {
			modalCharacters = cached;
			return;
		}

		modalLoading = true;
		try {
			const res = await fetch(`/api/dictionary/explain/${encodeURIComponent(type)}`);
			if (res.ok) {
				const data: { characters: Record<string, CharacterData> } = await res.json();
				explainCache.set(type, data.characters);
				modalCharacters = data.characters;
			}
		} finally {
			modalLoading = false;
		}
	}
</script>

<section class="character-breakdown">
	{#if hint || originalMeaning}
		<div class="etymology">
			{#if originalMeaning}
				<p class="original-meaning">
					<span class="label">Original meaning:</span>
					{originalMeaning}
				</p>
			{/if}
			{#if hint}
				<p class="hint"><CjkLinkedText text={hint} /></p>
			{/if}
		</div>
	{/if}

	{#if components && components.length > 0}
		<h2>Components</h2>
		<div class="component-grid">
			{#each components as comp, i (i)}
				<div class="component-card">
					{#if strokes}
						<div class="component-glyph">
							<CharacterGlyph
								character={comp.character}
								{strokes}
								{components}
								allFragments={fragments}
								highlightIndex={i}
							/>
						</div>
					{/if}
					<div class="component-details">
						<div class="component-header">
							<a
								href={resolve('/(app)/dictionary/[entry]', { entry: comp.character })}
								class="component-char">{comp.character}</a
							>
							{#if comp.type && comp.type.length > 0}
								<span class="component-type">
									{#each comp.type as t (t)}
										<a
											href="{resolve('/(app)/dictionary/explain/[type]', {
												type: t
											})}?from={encodeURIComponent(page.url.pathname)}"
											class="component-type-link"
											style:color={getComponentColor(t)}
											onclick={(e) => openExplainModal(e, t)}
										>
											{getComponentTitle(t)}
										</a>
									{/each}
									component
								</span>
							{/if}
						</div>
						{#if comp.pinyin?.length || comp.gloss}
							<div class="component-meta">
								{#if comp.pinyin && comp.pinyin.length > 0}
									<span class="component-pinyin">{comp.pinyin.join(', ')}</span>
								{/if}
								{#if comp.gloss}
									<span class="component-gloss">{comp.gloss}</span>
								{/if}
							</div>
						{/if}
						{#if comp.hint}
							<p class="component-hint"><CjkLinkedText text={comp.hint} /></p>
						{/if}
						{#if comp.isFromOriginalMeaning && originalMeaning}
							<Alert variant="info">
								<a href={resolve('/(app)/dictionary/[entry]', { entry: comp.character })}
									>{comp.character}</a
								>
								hints at the original meaning of
								<a href={resolve('/(app)/dictionary/[entry]', { entry: character })}>{character}</a
								>, "{originalMeaning}", which is no longer the most common meaning of
								<a href={resolve('/(app)/dictionary/[entry]', { entry: character })}>{character}</a> in
								modern Mandarin.
							</Alert>
						{/if}
						{#if comp.isOldPronunciation}
							<OldPronunciationAlert
								{character}
								compCharacter={comp.character}
								charPronunciations={historicalPronunciations}
								compPronunciations={comp.historicalPronunciations}
							/>
						{/if}
						{#if comp.isGlyphChanged}
							<Alert variant="info">
								Due to historical stylistic changes, this component is less similar to
								<a href={resolve('/(app)/dictionary/[entry]', { entry: comp.character })}
									>{comp.character}</a
								> than it was in ancient scripts.
							</Alert>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

{#if modalType}
	<Modal bind:open={modalOpen} title="{getComponentTitle(modalType)} component">
		{#if modalLoading}
			<p>Loading...</p>
		{:else}
			<ComponentTypeExplanation type={modalType} characters={modalCharacters} {characterSet} />
		{/if}
	</Modal>
{/if}

<style>
	.character-breakdown {
		margin-bottom: 1.5rem;
	}

	.etymology {
		margin-bottom: 1rem;
	}

	.original-meaning {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.label {
		font-weight: 600;
	}

	.hint {
		color: var(--muted-foreground);
	}

	.character-breakdown h2 {
		font-size: 1rem;
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	.character-breakdown h2::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	.component-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.component-card {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.component-glyph {
		width: 92px;
		height: 92px;
		flex-shrink: 0;
	}

	.component-details {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.component-header {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.component-char {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.component-type {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.25rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.component-type-link {
		font-weight: 600;
		text-decoration: none;
	}

	.component-type-link:hover {
		text-decoration: underline;
	}

	.component-meta {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.component-pinyin {
		color: var(--foreground);
	}

	.component-gloss {
		color: var(--muted-foreground);
	}

	.component-hint {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
</style>

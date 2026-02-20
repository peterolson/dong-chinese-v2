<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { SvelteMap } from 'svelte/reactivity';
	import type { ComponentData, CharacterData } from '$lib/types/dictionary';
	import { getComponentColor, getComponentTitle } from './component-colors';
	import CharacterGlyph from './character-glyph.svelte';
	import Modal from '$lib/components/ui/modal.svelte';
	import ComponentTypeExplanation from './component-type-explanation.svelte';

	interface Props {
		components: ComponentData[] | null;
		hint: string | null;
		isVerified: boolean | null;
		strokes: string[] | null;
		fragments: number[][] | null;
		characterSet?: 'simplified' | 'traditional';
	}

	let { components, hint, isVerified, strokes, fragments, characterSet }: Props = $props();

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
	{#if hint}
		<p class="hint">{hint}</p>
	{/if}

	{#if components && components.length > 0}
		<ul class="component-list">
			{#each components as comp, i (i)}
				<li>
					{#if strokes}
						<span class="component-glyph">
							<CharacterGlyph
								character={comp.character}
								{strokes}
								{components}
								allFragments={fragments}
								highlightIndex={i}
							/>
						</span>
					{/if}
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
					{#if comp.hint}
						<span class="component-hint">{comp.hint}</span>
					{/if}
				</li>
			{/each}
		</ul>
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

	.hint {
		margin-bottom: 0.75rem;
		color: var(--muted-foreground);
	}

	.component-list {
		list-style: none;
		padding-left: 1.25rem;
	}

	.component-list li {
		padding: 0.25rem 0;
		position: relative;
	}

	.component-list li::before {
		content: '';
		position: absolute;
		left: -1rem;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--border);
	}

	.component-glyph {
		display: inline-block;
		width: 92px;
		height: 92px;
		vertical-align: middle;
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
		color: var(--muted-foreground);
		text-decoration: none;
	}

	.component-type-link:hover {
		text-decoration: underline;
	}

	.component-hint {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}
</style>

<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { ComponentData } from '$lib/types/dictionary';
	import CharacterGlyph from './character-glyph.svelte';
	import { getComponentColor, getComponentTitle } from './component-colors';

	interface Props {
		components: ComponentData[] | null;
		hint: string | null;
		customSources: string[] | null;
		isVerified: boolean | null;
		strokes: string[] | null;
		fragments: number[][] | null;
	}

	let { components, hint, customSources, isVerified, strokes, fragments }: Props = $props();
</script>

<section class="character-breakdown">
	<h2>
		Breakdown
		{#if isVerified}
			<span class="verified-badge" title="Verified">&#10003;</span>
		{/if}
	</h2>

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
	{:else}
		<p class="no-data">No component breakdown available.</p>
	{/if}

	{#if customSources && customSources.length > 0}
		<div class="custom-sources">
			<h3>Sources</h3>
			<ul class="source-list">
				{#each customSources as source, i (i)}
					<li>{source}</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>

<style>
	.character-breakdown {
		margin-bottom: 1.5rem;
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.verified-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		background: var(--success);
		color: white;
		font-size: 0.75rem;
		font-weight: bold;
	}

	.hint {
		margin-bottom: 0.75rem;
		color: var(--muted-foreground);
		font-style: italic;
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

	.no-data {
		color: var(--muted-foreground);
	}

	.custom-sources {
		margin-top: 1rem;
	}

	.custom-sources h3 {
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.source-list {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		padding-left: 1.25rem;
	}
</style>

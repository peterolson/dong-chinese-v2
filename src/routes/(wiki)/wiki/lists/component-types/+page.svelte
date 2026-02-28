<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		getComponentColor,
		getComponentTitle
	} from '$lib/components/dictionary/component-colors';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function badgeGradient(types: string[]): string {
		if (types.length === 1) return getComponentColor(types[0]);
		const step = 100 / types.length;
		const stops = types.map((t, i) => {
			const color = getComponentColor(t);
			const start = Math.round(step * i);
			const end = Math.round(step * (i + 1));
			return i === 0 ? `${color} ${end}%` : `${color} ${start}% ${end}%`;
		});
		return `linear-gradient(135deg, ${stops.join(', ')})`;
	}

	function badgeLabel(types: string[]): string {
		if (types.length === 1 && types[0] === 'none') return 'No components';
		return types.map((t) => getComponentTitle(t)).join('/');
	}
</script>

<svelte:head>
	<title>Component Types — Character Lists</title>
</svelte:head>

<article class="list-page">
	<nav class="list-nav" aria-label="List types">
		{#each data.allLists as list (list.slug)}
			{#if list.slug === data.currentSlug}
				<span class="list-pill active">{list.navLabel}</span>
			{:else}
				<a href={resolve(list.href)} class="list-pill">{list.navLabel}</a>
			{/if}
		{/each}
	</nav>

	<h2>Component Type Combinations</h2>
	<p class="list-description">
		Verified characters grouped by the combination of component types in their decomposition.
	</p>
	<p class="summary">
		{data.totalCharacters.toLocaleString()} verified characters in {data.combinations.length} groups
	</p>

	<div class="accordion">
		{#each data.combinations as combo (combo.key)}
			<details class="combo-group">
				<summary class="combo-summary">
					<span class="combo-badges">
						{#each combo.label as part, i (i)}
							<span class="badge-group">
								{#if part.count > 1}
									<span class="badge-count">{part.count}&times;</span>
								{/if}
								<span class="type-badge" title={badgeLabel(part.types)}>
									<span class="type-dot" style:background={badgeGradient(part.types)}></span>
									{badgeLabel(part.types)}
								</span>
							</span>
						{/each}
					</span>
					<span class="combo-right">
						<span class="combo-stats">
							{combo.characters.length.toLocaleString()} chars ({(
								(combo.characters.length / data.totalCharacters) *
								100
							).toFixed(1)}%)
						</span>
						<span class="chevron" aria-hidden="true"></span>
					</span>
				</summary>
				<div class="combo-body">
					<div class="char-grid">
						{#each combo.characters as char (char)}
							<a href={resolve(`/wiki/${char}`)} class="char-link">{char}</a>
						{/each}
					</div>
				</div>
			</details>
		{/each}
	</div>
</article>

<style>
	.list-page {
		max-width: 900px;
	}

	.list-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 1.25rem;
	}

	.list-pill {
		display: inline-block;
		padding: 0.3rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 0.8125rem;
		color: var(--foreground);
		text-decoration: none;
		background: var(--background);
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.list-pill:hover:not(.active) {
		background: var(--surface);
		border-color: var(--secondary-soft);
		text-decoration: none;
	}

	.list-pill.active {
		background: var(--secondary-soft);
		border-color: var(--secondary-soft);
		color: var(--primary-foreground);
	}

	h2 {
		font-size: 1.25rem;
		margin-bottom: 0.25rem;
	}

	.list-description {
		color: var(--muted-foreground);
		font-size: 0.8125rem;
		margin-bottom: 0.75rem;
	}

	.summary {
		color: var(--muted-foreground);
		font-size: 0.8125rem;
		margin-bottom: 1rem;
	}

	.accordion {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.combo-group {
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.combo-summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		background: var(--surface);
		border-radius: var(--radius);
		font-size: 0.8125rem;
		list-style: none;
	}

	.combo-summary::-webkit-details-marker {
		display: none;
	}

	.combo-group[open] .combo-summary {
		border-bottom: 1px solid var(--border);
		border-radius: var(--radius) var(--radius) 0 0;
	}

	.combo-summary:hover {
		opacity: 0.85;
	}

	.combo-badges {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex-wrap: wrap;
	}

	.badge-group {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.badge-count {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--muted-foreground);
	}

	.type-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8125rem;
		font-weight: 500;
		white-space: nowrap;
		color: var(--foreground);
	}

	.type-dot {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.combo-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.combo-stats {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.chevron {
		display: inline-block;
		width: 0.5rem;
		height: 0.5rem;
		border-right: 1.5px solid var(--muted-foreground);
		border-bottom: 1.5px solid var(--muted-foreground);
		transform: translateY(-25%) rotate(45deg);
		transition: transform 0.15s ease;
		flex-shrink: 0;
	}

	.combo-group[open] .chevron {
		transform: translateY(25%) rotate(-135deg);
	}

	.combo-body {
		padding: 0.75rem;
	}

	.char-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.char-link {
		font-size: 1.1rem;
		text-decoration: none;
		padding: 0.0625rem 0.1875rem;
	}

	.char-link:hover {
		text-decoration: underline;
	}
</style>

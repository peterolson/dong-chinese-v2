<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ComponentUseGroup } from '$lib/types/dictionary';
	import { getCharLinkBase } from './char-link-context';

	const TYPE_LABELS: Record<string, string> = {
		meaning: 'Meaning',
		sound: 'Sound',
		iconic: 'Iconic',
		simplified: 'Simplified',
		deleted: 'Deleted',
		remnant: 'Remnant',
		distinguishing: 'Distinguishing',
		unknown: 'Unknown'
	};

	const COLLAPSED_LIMIT = 20;

	interface Props {
		componentUses: ComponentUseGroup[];
	}

	let { componentUses }: Props = $props();

	const charLinkBase = getCharLinkBase();
</script>

<section class="component-uses">
	<h2>Component uses</h2>
	{#each componentUses as group, gi (group.type)}
		{@const label = TYPE_LABELS[group.type] ?? group.type}
		{@const total = group.characters.length}
		{@const needsCollapse = total > COLLAPSED_LIMIT}
		{@const checkboxId = `cu-${gi}`}
		<div class="type-group">
			<h3>
				{label}
				{#if group.verifiedCount === total}
					({total})
				{:else}
					({group.verifiedCount} of {total} verified)
				{/if}
			</h3>
			{#if needsCollapse}
				<input
					type="checkbox"
					id={checkboxId}
					class="expand-toggle"
					aria-label="Show all {total} characters"
				/>
			{/if}
			<div class="char-list">
				{#each group.characters as use, i (use.character)}
					<a
						href={resolve(`${charLinkBase}/${use.character}`)}
						class:unverified={!use.isVerified}
						class:overflow={needsCollapse && i >= COLLAPSED_LIMIT}>{use.character}</a
					>
				{/each}
				{#if needsCollapse}
					<label for={checkboxId} class="expand-label">
						<span class="show-more">show all {total}</span>
						<span class="show-less">show fewer</span>
					</label>
				{/if}
			</div>
		</div>
	{/each}
</section>

<style>
	.component-uses {
		margin-bottom: 1.5rem;
	}

	h2 {
		font-size: 1rem;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	h2::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	.type-group {
		margin-bottom: 0.75rem;
	}

	h3 {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--muted-foreground);
		margin-bottom: 0.25rem;
	}

	.expand-toggle {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.char-list {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.125rem 0.375rem;
		font-size: 1rem;
	}

	.char-list a {
		text-decoration: none;
	}

	.char-list a.unverified {
		color: var(--destructive, #dc2626);
	}

	.char-list a.overflow {
		display: none;
	}

	.expand-toggle:checked ~ .char-list a.overflow {
		display: inline;
	}

	.expand-label {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		cursor: pointer;
	}

	.expand-label::before {
		content: '▶ ';
		font-size: 0.5rem;
		vertical-align: middle;
	}

	.expand-toggle:checked ~ .char-list .expand-label::before {
		content: '▼ ';
	}

	.expand-label:hover {
		text-decoration: underline;
	}

	.show-less {
		display: none;
	}

	.expand-toggle:checked ~ .char-list .show-more {
		display: none;
	}

	.expand-toggle:checked ~ .char-list .show-less {
		display: inline;
	}
</style>

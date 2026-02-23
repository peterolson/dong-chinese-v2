<script lang="ts">
	import { Trash2 } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button.svelte';

	let {
		label,
		items = [],
		onadd,
		onremove,
		children
	}: {
		label: string;
		items: unknown[];
		onadd: () => void;
		onremove: (index: number) => void;
		children: Snippet<[{ item: unknown; index: number }]>;
	} = $props();
</script>

<fieldset class="list-editor">
	<legend>{label}</legend>

	{#if items.length === 0}
		<p class="empty">No items.</p>
	{/if}

	<ol class="item-list">
		{#each items as item, index (index)}
			<li class="item">
				<div class="item-content">
					{@render children({ item, index })}
				</div>
				<Button
					variant="ghost"
					size="icon"
					type="button"
					aria-label="Remove item {index + 1}"
					onclick={() => onremove(index)}
				>
					<Trash2 size={14} />
				</Button>
			</li>
		{/each}
	</ol>

	<Button variant="dashed" size="sm" type="button" onclick={onadd} style="margin-top: 0.5rem">
		+ Add {label.toLowerCase().replace(/s$/, '')}
	</Button>
</fieldset>

<style>
	.list-editor {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem;
	}

	legend {
		font-weight: 600;
		font-size: 0.875rem;
		padding: 0 0.25rem;
	}

	.empty {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin-bottom: 0.5rem;
	}

	.item-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.item {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
	}

	.item:last-child {
		border-bottom: none;
	}

	.item-content {
		flex: 1;
		min-width: 0;
	}
</style>

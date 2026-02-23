<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/button.svelte';

	let {
		name,
		label,
		entries = [],
		footer
	}: {
		name: string;
		label: string;
		entries: { key: string; value: string }[];
		footer?: Snippet;
	} = $props();

	function addEntry() {
		entries = [...entries, { key: '', value: '' }];
	}

	function removeEntry(index: number) {
		entries = entries.filter((_, i) => i !== index);
	}
</script>

<fieldset class="kv-editor">
	<legend>{label}</legend>

	<!-- No-JS fallback: JSON textarea -->
	<noscript>
		<textarea {name} rows="4" class="noscript-textarea"
			>{JSON.stringify(Object.fromEntries(entries.map((e) => [e.key, e.value])), null, 2)}</textarea
		>
		<p class="noscript-hint">Enter as JSON object</p>
	</noscript>

	<div class="js-only">
		{#if entries.length === 0}
			<p class="empty">No entries.</p>
		{/if}

		<div class="entries">
			{#each entries as entry, i (i)}
				<div class="entry-row">
					<input
						type="text"
						name="{name}_key[]"
						bind:value={entry.key}
						placeholder="Key"
						class="entry-input key-input"
					/>
					<input
						type="text"
						name="{name}_value[]"
						bind:value={entry.value}
						placeholder="Value"
						class="entry-input value-input"
					/>
					<Button
						variant="ghost"
						size="icon"
						type="button"
						aria-label="Remove entry"
						onclick={() => removeEntry(i)}
					>
						&times;
					</Button>
				</div>
			{/each}
		</div>

		<Button variant="dashed" size="sm" type="button" onclick={addEntry}>+ Add entry</Button>

		{#if footer}
			{@render footer()}
		{/if}
	</div>
</fieldset>

<style>
	.kv-editor {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem;
	}

	legend {
		font-weight: 600;
		font-size: 0.875rem;
		padding: 0 0.25rem;
	}

	.noscript-textarea {
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}

	.noscript-hint {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin-top: 0.25rem;
	}

	.js-only {
		display: contents;
	}

	.empty {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin-bottom: 0.5rem;
	}

	.entries {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin-bottom: 0.5rem;
	}

	.entry-row {
		display: flex;
		gap: 0.375rem;
		align-items: center;
	}

	.entry-input {
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
		font-size: 0.875rem;
	}

	.entry-input:focus {
		outline: 2px solid var(--primary-soft);
		outline-offset: -1px;
	}

	.key-input {
		flex: 1;
	}

	.value-input {
		flex: 2;
	}
</style>

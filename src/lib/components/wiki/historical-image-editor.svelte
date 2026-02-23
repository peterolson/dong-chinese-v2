<script lang="ts">
	import type { HistoricalImage } from '$lib/types/dictionary';

	const IMAGE_TYPES = ['Oracle', 'Bronze', 'Seal', 'Clerical'] as const;

	let {
		index,
		image
	}: {
		index: number;
		image: HistoricalImage;
	} = $props();

	const prefix = $derived(`historicalImages[${index}]`);
</script>

<div class="image-editor">
	<div class="field-row">
		<label class="field">
			<span class="field-label">Type</span>
			<select name="{prefix}.type" bind:value={image.type} class="field-select">
				{#each IMAGE_TYPES as type (type)}
					<option value={type}>{type}</option>
				{/each}
			</select>
		</label>
		<label class="field grow">
			<span class="field-label">Era</span>
			<input
				type="text"
				name="{prefix}.era"
				bind:value={image.era}
				class="field-input"
				placeholder="e.g. Shang dynasty"
			/>
		</label>
	</div>
	<div class="field-row">
		<label class="field grow">
			<span class="field-label">URL</span>
			<input
				type="url"
				name="{prefix}.url"
				bind:value={image.url}
				class="field-input"
				placeholder="https://..."
			/>
		</label>
		<label class="field grow">
			<span class="field-label">Source</span>
			<input
				type="text"
				name="{prefix}.source"
				bind:value={image.source}
				class="field-input"
				placeholder="Source attribution"
			/>
		</label>
	</div>
</div>

<style>
	.image-editor {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-row {
		display: flex;
		gap: 0.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.grow {
		flex: 1;
	}

	.field-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--muted-foreground);
	}

	.field-input,
	.field-select {
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
		font-size: 0.875rem;
	}

	.field-input:focus,
	.field-select:focus {
		outline: 2px solid var(--primary-soft);
		outline-offset: -1px;
	}
</style>

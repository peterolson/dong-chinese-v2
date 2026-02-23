<script lang="ts">
	import type { HistoricalPronunciation } from '$lib/types/dictionary';

	const SOURCES = ['baxter-sagart', 'zhengzhang', 'tang'] as const;

	let {
		index,
		pronunciation
	}: {
		index: number;
		pronunciation: HistoricalPronunciation;
	} = $props();

	const prefix = $derived(`historicalPronunciations[${index}]`);

	// zhengzhang has no middle Chinese or gloss; tang has no old Chinese or gloss
	const noMiddle = $derived(pronunciation.source === 'zhengzhang');
	const noOld = $derived(pronunciation.source === 'tang');
	const noGloss = $derived(
		pronunciation.source === 'zhengzhang' || pronunciation.source === 'tang'
	);
</script>

<div class="pron-row">
	<label class="field source">
		<span class="field-label">Source</span>
		<select name="{prefix}.source" bind:value={pronunciation.source} class="field-select">
			{#each SOURCES as source (source)}
				<option value={source}>{source}</option>
			{/each}
		</select>
	</label>
	<label class="field">
		<span class="field-label">Middle Chinese</span>
		<input
			type="text"
			name="{prefix}.middleChinese"
			bind:value={pronunciation.middleChinese}
			class="field-input"
			disabled={noMiddle}
		/>
	</label>
	<label class="field">
		<span class="field-label">Old Chinese</span>
		<input
			type="text"
			name="{prefix}.oldChinese"
			bind:value={pronunciation.oldChinese}
			class="field-input"
			disabled={noOld}
		/>
	</label>
	<label class="field grow">
		<span class="field-label">Gloss</span>
		<input
			type="text"
			name="{prefix}.gloss"
			bind:value={pronunciation.gloss}
			class="field-input"
			disabled={noGloss}
		/>
	</label>
</div>

<style>
	.pron-row {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.grow {
		flex: 1;
	}

	.source {
		flex: 0 0 auto;
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
		outline: 2px solid var(--secondary-soft);
		outline-offset: -1px;
	}

	.field-input:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>

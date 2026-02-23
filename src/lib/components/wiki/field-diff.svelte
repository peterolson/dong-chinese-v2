<script lang="ts">
	/**
	 * Shows changed fields between a character data snapshot and the base data.
	 * Excludes audit columns, codepoint, and frequency fields (non-editable).
	 */

	const EDITABLE_FIELDS = [
		'gloss',
		'hint',
		'originalMeaning',
		'isVerified',
		'pinyin',
		'simplifiedVariants',
		'traditionalVariants',
		'components',
		'strokeCountSimp',
		'strokeCountTrad',
		'strokeDataSimp',
		'strokeDataTrad',
		'fragmentsSimp',
		'fragmentsTrad',
		'historicalImages',
		'historicalPronunciations',
		'customSources'
	] as const;

	/* eslint-disable @typescript-eslint/no-explicit-any */
	let {
		editData,
		baseData
	}: {
		editData: Record<string, any>;
		baseData: Record<string, any> | null;
	} = $props();

	interface FieldChange {
		field: string;
		from: string;
		to: string;
	}

	function formatValue(val: unknown): string {
		if (val === null || val === undefined) return '(empty)';
		if (typeof val === 'boolean') return val ? 'true' : 'false';
		if (typeof val === 'string') return val || '(empty)';
		if (Array.isArray(val)) return JSON.stringify(val);
		if (typeof val === 'object') return JSON.stringify(val, null, 2);
		return String(val);
	}

	const changes: FieldChange[] = $derived.by(() => {
		const result: FieldChange[] = [];
		for (const field of EDITABLE_FIELDS) {
			const editVal = editData[field];
			const baseVal = baseData?.[field] ?? null;
			const editStr = formatValue(editVal);
			const baseStr = formatValue(baseVal);
			if (editStr !== baseStr && editVal !== null && editVal !== undefined) {
				result.push({ field, from: baseStr, to: editStr });
			}
		}
		return result;
	});
</script>

{#if changes.length === 0}
	<p class="no-changes">No field changes detected.</p>
{:else}
	<dl class="diff-list">
		{#each changes as change (change.field)}
			<div class="diff-entry">
				<dt>{change.field}</dt>
				<dd>
					<span class="diff-from">{change.from}</span>
					<span class="diff-arrow">&rarr;</span>
					<span class="diff-to">{change.to}</span>
				</dd>
			</div>
		{/each}
	</dl>
{/if}

<style>
	.no-changes {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.diff-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.diff-entry {
		font-size: 0.8125rem;
	}

	dt {
		font-weight: 600;
		color: var(--muted-foreground);
		font-size: 0.75rem;
	}

	dd {
		margin: 0;
		word-break: break-word;
	}

	.diff-from {
		color: var(--error);
		text-decoration: line-through;
	}

	.diff-arrow {
		margin: 0 0.25rem;
		color: var(--muted-foreground);
	}

	.diff-to {
		color: var(--success);
	}
</style>

<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';

	let {
		name,
		label,
		values = [],
		oninput
	}: {
		name: string;
		label: string;
		values?: string[];
		oninput?: (values: string[]) => void;
	} = $props();

	let inputValue = $state('');

	function addTag() {
		const trimmed = inputValue.trim();
		if (trimmed && !values.includes(trimmed)) {
			values = [...values, trimmed];
			inputValue = '';
			oninput?.(values);
		}
	}

	function removeTag(index: number) {
		values = values.filter((_, i) => i !== index);
		oninput?.(values);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			addTag();
		}
	}
</script>

<fieldset class="tag-input">
	<legend>{label}</legend>

	<!-- No-JS fallback: comma-separated text input -->
	<noscript>
		<input type="text" {name} value={values.join(', ')} class="noscript-input" />
		<p class="noscript-hint">Separate values with commas</p>
	</noscript>

	<!-- Hidden inputs for form submission -->
	<div class="js-only">
		{#each values as value, i (i)}
			<input type="hidden" name="{name}[]" {value} />
		{/each}

		<div class="tags">
			{#each values as value, i (i)}
				<span class="tag">
					{value}
					<button
						type="button"
						class="tag-remove"
						aria-label="Remove {value}"
						onclick={() => removeTag(i)}
					>
						&times;
					</button>
				</span>
			{/each}
		</div>

		<div class="input-row">
			<input
				type="text"
				bind:value={inputValue}
				onkeydown={handleKeydown}
				placeholder="Type and press Enter..."
				class="tag-text-input"
			/>
			<Button variant="outline" size="sm" type="button" onclick={addTag}>Add</Button>
		</div>
	</div>
</fieldset>

<style>
	.tag-input {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem;
		min-width: 0;
	}

	legend {
		font-weight: 600;
		font-size: 0.875rem;
		padding: 0 0.25rem;
	}

	.noscript-input {
		width: 100%;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
	}

	.noscript-hint {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin-top: 0.25rem;
	}

	.js-only {
		display: none;
	}

	@media (scripting: enabled) {
		.js-only {
			display: contents;
		}
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 0.5rem;
	}

	.tags:empty {
		display: none;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.875rem;
	}

	.tag-remove {
		background: none;
		border: none;
		color: var(--muted-foreground);
		font-size: 1.125rem;
		line-height: 1;
		padding: 0 0.125rem;
		cursor: pointer;
	}

	.tag-remove:hover {
		color: var(--error);
	}

	.input-row {
		display: flex;
		gap: 0.5rem;
	}

	.tag-text-input {
		flex: 1;
		min-width: 0;
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
		font-size: 0.875rem;
	}

	.tag-text-input:focus {
		outline: 2px solid var(--primary-soft);
		outline-offset: -1px;
	}
</style>

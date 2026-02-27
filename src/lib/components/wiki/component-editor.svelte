<script lang="ts">
	import type { ComponentData } from '$lib/types/dictionary';
	import CharacterGlyph from '$lib/components/dictionary/character-glyph.svelte';

	type EditableComponent = ComponentData & { fragmentSimp?: string; fragmentTrad?: string };

	const COMPONENT_TYPES = [
		'meaning',
		'sound',
		'iconic',
		'remnant',
		'simplified',
		'deleted',
		'distinguishing',
		'unknown'
	] as const;

	let {
		index,
		character,
		component,
		components,
		strokesSimp = null,
		strokesTrad = null,
		fragmentsSimp = null,
		fragmentsTrad = null
	}: {
		index: number;
		character: string;
		component: EditableComponent;
		components: EditableComponent[];
		strokesSimp?: string[] | null;
		strokesTrad?: string[] | null;
		fragmentsSimp?: number[][] | null;
		fragmentsTrad?: number[][] | null;
	} = $props();

	const hasSimpStrokes = $derived((strokesSimp?.length ?? 0) > 0);
	const hasTradStrokes = $derived((strokesTrad?.length ?? 0) > 0);
	const prefix = $derived(`components[${index}]`);
	const charInputId = $derived(`comp-char-${index}`);
</script>

<div class="component-editor">
	<div class="top-row">
		<div class="field">
			<label class="field-label" for={charInputId}>Character</label>
			<div class="char-field">
				<input
					id={charInputId}
					type="text"
					name="{prefix}.character"
					bind:value={component.character}
					class="field-input char-input"
					maxlength="2"
				/>
				<button
					type="button"
					class="characterless-btn"
					title="Mark as characterless component"
					aria-label="Mark as characterless component"
					onclick={() => (component.character = '◎')}>◎</button
				>
			</div>
		</div>
		<label class="field grow">
			<span class="field-label">Hint</span>
			<textarea
				name="{prefix}.hint"
				bind:value={component.hint}
				class="field-textarea"
				placeholder="Optional hint"
			></textarea>
		</label>
	</div>

	<div class="type-checkboxes">
		<span class="field-label">Type</span>
		<div class="checkbox-group">
			{#each COMPONENT_TYPES as type (type)}
				<label class="checkbox-label">
					<input
						type="checkbox"
						name="{prefix}.type[]"
						value={type}
						checked={component.type?.includes(type) ?? false}
						onchange={(e: Event) => {
							const target = e.target as HTMLInputElement;
							if (target.checked) {
								component.type = [...(component.type ?? []), type];
							} else {
								component.type = (component.type ?? []).filter((t) => t !== type);
							}
						}}
					/>
					{type}
				</label>
			{/each}
		</div>
	</div>

	<div class="bool-checkboxes">
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="{prefix}.isOldPronunciation"
				bind:checked={component.isOldPronunciation}
			/>
			Old pronunciation
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="{prefix}.isFromOriginalMeaning"
				bind:checked={component.isFromOriginalMeaning}
			/>
			From original meaning
		</label>
		<label class="checkbox-label">
			<input
				type="checkbox"
				name="{prefix}.isGlyphChanged"
				bind:checked={component.isGlyphChanged}
			/>
			Glyph changed
		</label>
	</div>

	{#if hasSimpStrokes || hasTradStrokes}
		<div class="fragment-row">
			{#if hasSimpStrokes}
				<div class="fragment-col">
					<div class="fragment-preview">
						<CharacterGlyph
							{character}
							strokes={strokesSimp}
							{components}
							allFragments={fragmentsSimp}
							highlightIndex={index}
						/>
					</div>
					<label class="field">
						<span class="field-label">{hasTradStrokes ? 'Simp strokes' : 'Strokes'}</span>
						<input
							type="text"
							bind:value={component.fragmentSimp}
							class="field-input fragment-input"
							placeholder="1-3,5"
						/>
					</label>
				</div>
			{/if}
			{#if hasTradStrokes}
				<div class="fragment-col">
					<div class="fragment-preview">
						<CharacterGlyph
							{character}
							strokes={strokesTrad}
							{components}
							allFragments={fragmentsTrad}
							highlightIndex={index}
						/>
					</div>
					<label class="field">
						<span class="field-label">{hasSimpStrokes ? 'Trad strokes' : 'Strokes'}</span>
						<input
							type="text"
							bind:value={component.fragmentTrad}
							class="field-input fragment-input"
							placeholder="1-3,5"
						/>
					</label>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.component-editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.top-row {
		display: flex;
		gap: 0.5rem;
		align-items: stretch;
	}

	.grow {
		flex: 1;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.top-row .field-input,
	.top-row .field-textarea {
		flex: 1;
	}

	.field-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--muted-foreground);
	}

	.field-input,
	.field-textarea {
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
		font-size: 0.875rem;
		font-family: inherit;
	}

	.field-input:focus,
	.field-textarea:focus {
		outline: 2px solid var(--secondary-soft);
		outline-offset: -1px;
	}

	.field-textarea {
		resize: vertical;
	}

	.char-field {
		display: flex;
		gap: 0.25rem;
		align-items: stretch;
		flex: 1;
	}

	.char-input {
		flex: 0 0 4rem;
		width: 4rem;
		font-size: 1.25rem;
		text-align: center;
	}

	.characterless-btn {
		padding: 0 0.375rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--muted-foreground);
		font-size: 1rem;
		cursor: pointer;
		line-height: 1;
	}

	.characterless-btn:hover {
		background: var(--border);
		color: var(--foreground);
	}

	.type-checkboxes {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.checkbox-group {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8125rem;
		cursor: pointer;
	}

	.bool-checkboxes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
	}

	.fragment-row {
		display: flex;
		gap: 0.5rem;
	}

	.fragment-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.fragment-col .field {
		align-self: stretch;
	}

	.fragment-preview {
		width: 4rem;
		height: 4rem;
	}

	.fragment-input {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
	}
</style>

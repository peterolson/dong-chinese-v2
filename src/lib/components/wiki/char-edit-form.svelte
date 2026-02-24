<script lang="ts">
	import type {
		CharacterData,
		ComponentData,
		HistoricalPronunciation,
		StrokeVariantData
	} from '$lib/types/dictionary';
	import TagInput from './tag-input.svelte';
	import ListEditor from './list-editor.svelte';
	import ComponentEditor from './component-editor.svelte';
	import HistoricalPronunciationEditor from './historical-pronunciation-editor.svelte';
	import CharacterGlyph from '$lib/components/dictionary/character-glyph.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { formatFragmentRange, parseFragmentRange } from './fragment-range';
	import { commonSources } from '$lib/data/common-sources';

	interface EditableSource {
		name: string;
		url: string;
	}

	function parseSource(raw: string): EditableSource {
		const pipeIdx = raw.indexOf('|');
		if (pipeIdx === -1) return { name: raw, url: '' };
		return { name: raw.substring(0, pipeIdx), url: raw.substring(pipeIdx + 1) };
	}

	function serializeSource(s: EditableSource): string {
		const name = s.name.trim();
		const url = s.url.trim();
		return url ? `${name}|${url}` : name;
	}

	let {
		character: initialCharacter,
		canReview = false
	}: {
		character: CharacterData;
		canReview?: boolean;
	} = $props();

	// Snapshot initial values for form state (intentionally non-reactive — the form
	// is a local working copy that does not react to prop changes)
	// svelte-ignore state_referenced_locally
	const init = $state.snapshot(initialCharacter);

	let gloss = $state(init.gloss ?? '');
	let hint = $state(init.hint ?? '');
	let originalMeaning = $state(init.originalMeaning ?? '');
	let isVerified = $state(init.isVerified ?? false);
	let pinyin = $state<string[]>(init.pinyin ?? []);
	let simplifiedVariants = $state<string[]>(init.simplifiedVariants ?? []);
	let traditionalVariants = $state<string[]>(init.traditionalVariants ?? []);

	type FormComponent = ComponentData & { fragmentSimp: string; fragmentTrad: string };
	let components = $state<FormComponent[]>(
		init.components?.map((c, i) => ({
			...c,
			fragmentSimp: formatFragmentRange(init.fragmentsSimp?.[i] ?? []),
			fragmentTrad: formatFragmentRange(init.fragmentsTrad?.[i] ?? [])
		})) ?? []
	);
	let strokeDataSimp = $state(JSON.stringify(init.strokeDataSimp, null, 2) ?? '');
	let strokeDataTrad = $state(JSON.stringify(init.strokeDataTrad, null, 2) ?? '');

	function strokeCountFromJson(json: string, fallback: number): number {
		try {
			const data = JSON.parse(json) as StrokeVariantData | null;
			return data?.strokes?.length ?? fallback;
		} catch {
			return fallback;
		}
	}
	const strokeCountSimp = $derived(strokeCountFromJson(strokeDataSimp, init.strokeCountSimp ?? 0));
	const strokeCountTrad = $derived(strokeCountFromJson(strokeDataTrad, init.strokeCountTrad ?? 0));

	function parseStrokes(json: string): string[] | null {
		try {
			const data = JSON.parse(json) as StrokeVariantData | null;
			return data?.strokes ?? null;
		} catch {
			return null;
		}
	}
	const strokesSimp = $derived(parseStrokes(strokeDataSimp));
	const strokesTrad = $derived(parseStrokes(strokeDataTrad));
	const fragmentsSimp = $derived(
		components.map((c) => parseFragmentRange(c.fragmentSimp, strokeCountSimp))
	);
	const fragmentsTrad = $derived(
		components.map((c, i) =>
			c.fragmentTrad.trim()
				? parseFragmentRange(c.fragmentTrad, strokeCountTrad)
				: (fragmentsSimp[i] ?? [])
		)
	);

	let historicalPronunciations = $state<HistoricalPronunciation[]>(
		init.historicalPronunciations?.map((p) => ({ ...p })) ?? []
	);
	let sources = $state<EditableSource[]>(
		Array.isArray(init.customSources) ? init.customSources.map(parseSource) : []
	);

	let editComment = $state('');
	const hasSources = $derived(sources.some((s) => s.name.trim()));

	function isSourceAdded(name: string): boolean {
		return sources.some((s) => s.name.trim().startsWith(name));
	}

	function addCommonSource(common: (typeof commonSources)[number]) {
		if (isSourceAdded(common.name)) return;
		sources = [
			...sources,
			{
				name: common.name,
				url: common.urlTemplate?.replace('{char}', init.character) ?? ''
			}
		];
	}

	function addCustomSource() {
		sources = [...sources, { name: '', url: '' }];
	}

	function removeSource(index: number) {
		sources = sources.filter((_, i) => i !== index);
	}
	$effect(() => {
		if (!hasSources) isVerified = false;
	});

	function addComponent() {
		components = [...components, { character: '', type: [], fragmentSimp: '', fragmentTrad: '' }];
	}

	function removeComponent(index: number) {
		components = components.filter((_, i) => i !== index);
	}

	function addHistoricalPronunciation() {
		historicalPronunciations = [...historicalPronunciations, { source: 'baxter-sagart' }];
	}

	function removeHistoricalPronunciation(index: number) {
		historicalPronunciations = historicalPronunciations.filter((_, i) => i !== index);
	}
</script>

<form method="post" action="?/submitEdit" class="edit-form">
	<!-- Hidden data serialized as JSON — only active when JS is enabled (noscript inputs are used otherwise) -->
	<div class="js-hidden-fields">
		<input type="hidden" name="pinyin" value={JSON.stringify(pinyin)} />
		<input type="hidden" name="simplifiedVariants" value={JSON.stringify(simplifiedVariants)} />
		<input type="hidden" name="traditionalVariants" value={JSON.stringify(traditionalVariants)} />
		<input
			type="hidden"
			name="components"
			value={JSON.stringify(components.map(({ fragmentSimp, fragmentTrad, ...rest }) => rest))}
		/>
		<input
			type="hidden"
			name="historicalPronunciations"
			value={JSON.stringify(historicalPronunciations)}
		/>
		<input
			type="hidden"
			name="customSources"
			value={JSON.stringify(sources.filter((s) => s.name.trim()).map(serializeSource))}
		/>
		<input type="hidden" name="strokeCountSimp" value={strokeCountSimp} />
		<input type="hidden" name="strokeCountTrad" value={strokeCountTrad} />
		<input type="hidden" name="strokeDataSimp" value={strokeDataSimp} />
		<input type="hidden" name="strokeDataTrad" value={strokeDataTrad} />
		<input type="hidden" name="fragmentsSimp" value={JSON.stringify(fragmentsSimp)} />
		<input type="hidden" name="fragmentsTrad" value={JSON.stringify(fragmentsTrad)} />
	</div>

	<fieldset class="form-section">
		<legend>Basic Details</legend>
		<div class="row-2">
			<label class="field">
				<span class="field-label">Gloss</span>
				<input type="text" name="gloss" bind:value={gloss} class="field-input" />
			</label>
			<label class="field">
				<span class="field-label">Original Meaning</span>
				<input
					type="text"
					name="originalMeaning"
					bind:value={originalMeaning}
					class="field-input"
				/>
			</label>
		</div>
		<label class="field">
			<span class="field-label">Hint</span>
			<textarea name="hint" bind:value={hint} rows="2" class="field-textarea"></textarea>
		</label>
		<div class="row-3">
			<TagInput name="pinyin" label="Pinyin" values={pinyin} oninput={(v) => (pinyin = v)} />
			<TagInput
				name="simplifiedVariants"
				label="Simplified Variants"
				values={simplifiedVariants}
				oninput={(v) => (simplifiedVariants = v)}
			/>
			<TagInput
				name="traditionalVariants"
				label="Traditional Variants"
				values={traditionalVariants}
				oninput={(v) => (traditionalVariants = v)}
			/>
		</div>
	</fieldset>

	<ListEditor label="Components" items={components} onadd={addComponent} onremove={removeComponent}>
		{#snippet children({ item, index })}
			<ComponentEditor
				{index}
				character={init.character}
				component={item as FormComponent}
				{components}
				{strokesSimp}
				{strokesTrad}
				{fragmentsSimp}
				{fragmentsTrad}
			/>
		{/snippet}
	</ListEditor>

	<fieldset class="form-section">
		<legend>Stroke Data</legend>
		<div class="row-2">
			<div class="stroke-col">
				<div class="glyph-preview">
					<CharacterGlyph
						character={init.character}
						strokes={strokesSimp}
						{components}
						allFragments={fragmentsSimp}
					/>
				</div>
				<label class="field">
					<span class="field-label">Stroke Data (Simp) — JSON</span>
					<textarea bind:value={strokeDataSimp} rows="3" class="field-textarea mono"></textarea>
					<span class="field-hint">{strokeCountSimp} strokes</span>
				</label>
			</div>
			<div class="stroke-col">
				<div class="glyph-preview">
					<CharacterGlyph
						character={init.character}
						strokes={strokesTrad}
						{components}
						allFragments={fragmentsTrad}
					/>
				</div>
				<label class="field">
					<span class="field-label">Stroke Data (Trad) — JSON</span>
					<textarea bind:value={strokeDataTrad} rows="3" class="field-textarea mono"></textarea>
					<span class="field-hint">{strokeCountTrad} strokes</span>
				</label>
			</div>
		</div>
	</fieldset>

	<ListEditor
		label="Historical Pronunciations"
		items={historicalPronunciations}
		onadd={addHistoricalPronunciation}
		onremove={removeHistoricalPronunciation}
	>
		{#snippet children({ item, index })}
			<HistoricalPronunciationEditor {index} pronunciation={item as HistoricalPronunciation} />
		{/snippet}
	</ListEditor>

	<fieldset class="form-section">
		<legend>Sources</legend>
		{#if sources.length === 0}
			<p class="empty-hint">No sources.</p>
		{/if}
		{#each sources as source, i (i)}
			<div class="source-entry">
				<input
					type="text"
					bind:value={source.name}
					placeholder="Name"
					class="field-input source-name"
				/>
				<input
					type="text"
					bind:value={source.url}
					placeholder="URL (optional)"
					class="field-input source-url"
				/>
				<Button
					variant="ghost"
					size="icon"
					type="button"
					aria-label="Remove source"
					onclick={() => removeSource(i)}>&times;</Button
				>
			</div>
		{/each}
		<div class="quick-add">
			<span class="quick-add-label">Quick add:</span>
			{#each commonSources as common (common.name)}
				<Button
					variant="outline"
					size="sm"
					type="button"
					disabled={isSourceAdded(common.name)}
					onclick={() => addCommonSource(common)}
				>
					{common.urlTemplate ? common.name : common.name.replace(/p\.$/, '').trim()}
				</Button>
			{/each}
		</div>
		<Button variant="dashed" size="sm" type="button" onclick={addCustomSource}>+ Add source</Button>
		<label class="checkbox-field">
			<input type="checkbox" name="isVerified" bind:checked={isVerified} disabled={!hasSources} />
			<span>Verified</span>
		</label>
	</fieldset>

	<section class="form-section submit-section">
		<div class="submit-row">
			<label class="field submit-comment">
				<span class="field-label">Edit Comment (required)</span>
				<input
					type="text"
					name="editComment"
					bind:value={editComment}
					required
					placeholder="Describe what you changed and why..."
					class="field-input"
				/>
			</label>
			<Button variant="primary" size="sm" type="submit">
				{canReview ? 'Submit & Approve' : 'Submit Edit'}
			</Button>
		</div>
		<noscript>
			<p class="noscript-note">
				Note: The form works without JavaScript but the tag/list editors are simplified.
			</p>
		</noscript>
	</section>
</form>

<style>
	.edit-form {
		max-width: 800px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.75rem;
	}

	.form-section legend {
		font-weight: 600;
		font-size: 0.875rem;
		padding: 0 0.25rem;
	}

	.row-2 {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.row-3 {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.5rem;
	}

	@media (max-width: 600px) {
		.row-2,
		.row-3 {
			grid-template-columns: 1fr;
		}
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
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

	.field-textarea.mono {
		font-family: var(--font-mono);
		font-size: 0.75rem;
	}

	.field-hint {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
	}

	.stroke-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.stroke-col .field {
		align-self: stretch;
	}

	.glyph-preview {
		width: 6rem;
		height: 6rem;
	}

	.checkbox-field {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.empty-hint {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.source-entry {
		display: flex;
		gap: 0.375rem;
		align-items: center;
	}

	.source-name {
		flex: 2;
	}

	.source-url {
		flex: 3;
	}

	.quick-add {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.quick-add-label {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	@media (max-width: 600px) {
		.source-entry {
			flex-wrap: wrap;
		}

		.source-name,
		.source-url {
			flex: 1 1 100%;
		}
	}

	.submit-section {
		padding-top: 0.75rem;
		border-top: 2px solid var(--border);
	}

	.submit-row {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
	}

	.submit-comment {
		flex: 1;
	}

	.js-hidden-fields {
		display: none;
	}

	@media (scripting: enabled) {
		.js-hidden-fields {
			display: contents;
		}
	}

	.noscript-note {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}
</style>

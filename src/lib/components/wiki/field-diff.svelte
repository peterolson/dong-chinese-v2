<script lang="ts">
	/**
	 * Shows changed fields between a character data snapshot and the base data.
	 * Renders per-field semantic diffs instead of raw JSON.
	 */
	import CharacterGlyph from '$lib/components/dictionary/character-glyph.svelte';
	import {
		getComponentColor,
		getComponentTitle
	} from '$lib/components/dictionary/component-colors';
	import { formatFragmentRange } from './fragment-range';
	import type {
		ComponentData,
		StrokeVariantData,
		HistoricalPronunciation,
		HistoricalImage
	} from '$lib/types/dictionary';
	import { EDITABLE_FIELDS } from '$lib/data/editable-fields';
	import { deepEqual } from '$lib/data/deep-equal';

	const FIELD_LABELS: Record<string, string> = {
		gloss: 'Gloss',
		hint: 'Hint',
		originalMeaning: 'Original meaning',
		isVerified: 'Verified',
		pinyin: 'Pinyin',
		simplifiedVariants: 'Simplified variants',
		traditionalVariants: 'Traditional variants',
		components: 'Components',
		strokeDataSimp: 'Strokes (simplified)',
		strokeDataTrad: 'Strokes (traditional)',
		fragmentsSimp: 'Stroke fragments (simplified)',
		fragmentsTrad: 'Stroke fragments (traditional)',
		historicalImages: 'Historical images',
		historicalPronunciations: 'Historical pronunciations',
		customSources: 'Sources',
		strokeCountSimp: 'Stroke count (simplified)',
		strokeCountTrad: 'Stroke count (traditional)'
	};

	const SIMPLE_TEXT_FIELDS = new Set(['gloss', 'hint', 'originalMeaning']);
	const SIMPLE_ARRAY_FIELDS = new Set(['pinyin', 'simplifiedVariants', 'traditionalVariants']);

	type FieldName = (typeof EDITABLE_FIELDS)[number];

	/* eslint-disable @typescript-eslint/no-explicit-any */
	let {
		editData,
		baseData,
		character,
		changedFields = null
	}: {
		editData: Record<string, any>;
		baseData: Record<string, any> | null;
		character: string;
		/** When provided, only show diffs for these fields (from char_manual.changedFields) */
		changedFields?: string[] | null;
	} = $props();

	// --- Comparison helpers ---

	function diffStringArrays(
		from: string[] | null,
		to: string[] | null
	): { added: string[]; removed: string[]; kept: string[] } {
		const fromSet = new Set(from ?? []);
		const toSet = new Set(to ?? []);
		return {
			added: [...toSet].filter((x) => !fromSet.has(x)),
			removed: [...fromSet].filter((x) => !toSet.has(x)),
			kept: [...toSet].filter((x) => fromSet.has(x))
		};
	}

	interface ObjectDiff<T> {
		added: T[];
		removed: T[];
		modified: { from: T; to: T }[];
	}

	function matchByKey<T extends Record<string, any>>(
		from: T[] | null,
		to: T[] | null,
		key: string
	): ObjectDiff<T> {
		const fromArr = from ?? [];
		const toArr = to ?? [];
		const fromMap = new Map(fromArr.map((item) => [item[key], item]));
		const toMap = new Map(toArr.map((item) => [item[key], item]));

		const added: T[] = [];
		const removed: T[] = [];
		const modified: { from: T; to: T }[] = [];

		for (const [k, item] of toMap) {
			const oldItem = fromMap.get(k);
			if (!oldItem) {
				added.push(item);
			} else if (!deepEqual(oldItem, item)) {
				modified.push({ from: oldItem, to: item });
			}
		}
		for (const [k, item] of fromMap) {
			if (!toMap.has(k)) {
				removed.push(item);
			}
		}
		return { added, removed, modified };
	}

	function changedSubFields(
		from: Record<string, any>,
		to: Record<string, any>,
		fields: string[]
	): string[] {
		return fields.filter((f) => !deepEqual(from[f], to[f]));
	}

	const COMPONENT_SUB_FIELDS = [
		'hint',
		'type',
		'isOldPronunciation',
		'isFromOriginalMeaning',
		'isGlyphChanged'
	];

	/** Check if a component diff has any visible changes after sub-field filtering */
	function hasVisibleComponentChanges(diff: ObjectDiff<ComponentData>): boolean {
		if (diff.added.length > 0 || diff.removed.length > 0) return true;
		return diff.modified.some(
			(mod) => changedSubFields(mod.from, mod.to, COMPONENT_SUB_FIELDS).length > 0
		);
	}

	function formatSubFieldValue(val: unknown): string {
		if (val === null || val === undefined) return '(empty)';
		if (typeof val === 'string') return val || '(empty)';
		if (Array.isArray(val)) return val.join(', ');
		return String(val);
	}

	// --- Source parsing ---

	function parseSource(source: string): { name: string; url: string | null } {
		const parts = source.split('|');
		if (parts.length >= 2) {
			const url = parts[1];
			// Only allow http(s) and relative URLs to prevent javascript: XSS
			if (/^https?:\/\//.test(url) || (url.startsWith('/') && !url.startsWith('//'))) {
				return { name: parts[0], url };
			}
			return { name: parts[0], url: null };
		}
		return { name: source, url: null };
	}

	// --- Change detection ---

	interface FieldChange {
		field: FieldName;
		editVal: any;
		baseVal: any;
	}

	const changedFieldSet = $derived(changedFields ? new Set(changedFields) : null);

	const changes: FieldChange[] = $derived.by(() => {
		const result: FieldChange[] = [];
		for (const field of EDITABLE_FIELDS) {
			// When changedFields is provided, skip fields that weren't intentionally changed
			if (changedFieldSet && !changedFieldSet.has(field)) continue;

			const editVal = editData[field] ?? null;
			const baseVal = baseData?.[field] ?? null;

			// Skip if edit doesn't touch this field
			if (editVal === null && editVal === baseVal) continue;
			if (editVal === null) continue;

			// Skip if values are the same
			if (deepEqual(editVal, baseVal)) continue;

			// Skip fragments if stroke data was also intentionally changed (glyph view makes it obvious).
			// Only suppress when the stroke field is in changedFields — otherwise the stroke data
			// difference is just an artifact of the baseline having stale/null values.
			if (field === 'fragmentsSimp' || field === 'fragmentsTrad') {
				const strokeField = field === 'fragmentsSimp' ? 'strokeDataSimp' : 'strokeDataTrad';
				if (changedFieldSet?.has(strokeField)) {
					const strokeEditVal = editData[strokeField] ?? null;
					const strokeBaseVal = baseData?.[strokeField] ?? null;
					if (!deepEqual(strokeEditVal, strokeBaseVal) && strokeEditVal !== null) continue;
				}
			}

			// Skip components if no visible sub-field changes (e.g. only default boolean diffs)
			if (field === 'components') {
				const compDiff = matchByKey<ComponentData>(baseVal, editVal, 'character');
				if (!hasVisibleComponentChanges(compDiff)) continue;
			}

			result.push({ field, editVal, baseVal });
		}
		return result;
	});

	// --- Stroke count helpers ---

	function getStrokeCount(
		field: 'strokeDataSimp' | 'strokeDataTrad',
		data: Record<string, any> | null
	): number | null {
		if (!data) return null;
		const countField = field === 'strokeDataSimp' ? 'strokeCountSimp' : 'strokeCountTrad';
		if (data[countField] != null) return data[countField];
		const strokeData = data[field] as StrokeVariantData | null;
		return strokeData?.strokes?.length ?? null;
	}
</script>

{#if changes.length === 0}
	<p class="no-changes">No field changes detected.</p>
{:else}
	<dl class="diff-list">
		{#each changes as change (change.field)}
			<div class="diff-entry">
				<dt>{FIELD_LABELS[change.field] ?? change.field}</dt>
				<dd>
					{#if change.field === 'isVerified'}
						<!-- Boolean -->
						<span class="diff-from">{change.baseVal ? 'Yes' : 'No'}</span>
						<span class="diff-arrow">&rarr;</span>
						<span class="diff-to">{change.editVal ? 'Yes' : 'No'}</span>
					{:else if SIMPLE_TEXT_FIELDS.has(change.field)}
						<!-- Simple text -->
						{#if change.baseVal}
							<span class="diff-from">{change.baseVal}</span>
							<span class="diff-arrow">&rarr;</span>
						{/if}
						<span class="diff-to">{change.editVal || '(empty)'}</span>
					{:else if SIMPLE_ARRAY_FIELDS.has(change.field)}
						<!-- Simple arrays: show +/- items -->
						{@const diff = diffStringArrays(change.baseVal, change.editVal)}
						<span class="array-diff">
							{#each diff.kept as item (item)}
								<span class="array-item">{item}</span>
							{/each}
							{#each diff.added as item (item)}
								<span class="array-item added">+ {item}</span>
							{/each}
							{#each diff.removed as item (item)}
								<span class="array-item removed">- {item}</span>
							{/each}
						</span>
					{:else if change.field === 'customSources'}
						<!-- Sources: parse pipe format -->
						{@const diff = diffStringArrays(change.baseVal, change.editVal)}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- external URLs from custom sources -->
						<ul class="source-diff">
							{#each diff.kept as src (src)}
								{@const parsed = parseSource(src)}
								<li class="source-item">
									{#if parsed.url}
										<a href={parsed.url} target="_blank" rel="noopener noreferrer">{parsed.name}</a>
									{:else}
										{parsed.name}
									{/if}
								</li>
							{/each}
							{#each diff.added as src (src)}
								{@const parsed = parseSource(src)}
								<li class="source-item added">
									<span class="badge-added">+</span>
									{#if parsed.url}
										<a href={parsed.url} target="_blank" rel="noopener noreferrer">{parsed.name}</a>
									{:else}
										{parsed.name}
									{/if}
								</li>
							{/each}
							{#each diff.removed as src (src)}
								{@const parsed = parseSource(src)}
								<li class="source-item removed">
									<span class="badge-removed">-</span>
									{#if parsed.url}
										<a href={parsed.url} target="_blank" rel="noopener noreferrer">{parsed.name}</a>
									{:else}
										{parsed.name}
									{/if}
								</li>
							{/each}
						</ul>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{:else if change.field === 'components'}
						<!-- Components: match by character, show sub-field diffs -->
						{@const diff = matchByKey<ComponentData>(change.baseVal, change.editVal, 'character')}
						<ul class="component-diff">
							{#each diff.modified as mod (mod.to.character)}
								{@const changed = changedSubFields(mod.from, mod.to, COMPONENT_SUB_FIELDS)}
								{#if changed.length > 0}
									<li class="component-item modified">
										<span class="comp-char">{mod.to.character}</span>
										{#if mod.to.type}
											{#each mod.to.type as t (t)}
												<span class="comp-type-tag" style:color={getComponentColor(t)}
													>{getComponentTitle(t)}</span
												>
											{/each}
										{/if}
										<ul class="sub-changes">
											{#each changed as subField (subField)}
												<li>
													<span class="sub-field">{subField}:</span>
													<span class="diff-from"
														>{formatSubFieldValue(mod.from[subField as keyof ComponentData])}</span
													>
													<span class="diff-arrow">&rarr;</span>
													<span class="diff-to"
														>{formatSubFieldValue(mod.to[subField as keyof ComponentData])}</span
													>
												</li>
											{/each}
										</ul>
									</li>
								{/if}
							{/each}
							{#each diff.added as comp (comp.character)}
								<li class="component-item added">
									<span class="badge-added">+</span>
									<span class="comp-char">{comp.character}</span>
									{#if comp.type}
										{#each comp.type as t (t)}
											<span class="comp-type-tag" style:color={getComponentColor(t)}
												>{getComponentTitle(t)}</span
											>
										{/each}
									{/if}
									{#if comp.hint}
										<span class="comp-hint">{comp.hint}</span>
									{/if}
								</li>
							{/each}
							{#each diff.removed as comp (comp.character)}
								<li class="component-item removed">
									<span class="badge-removed">-</span>
									<span class="comp-char">{comp.character}</span>
									{#if comp.type}
										{#each comp.type as t (t)}
											<span class="comp-type-tag" style:color={getComponentColor(t)}
												>{getComponentTitle(t)}</span
											>
										{/each}
									{/if}
								</li>
							{/each}
						</ul>
					{:else if change.field === 'strokeDataSimp' || change.field === 'strokeDataTrad'}
						<!-- Stroke data: side-by-side CharacterGlyph with component colors -->
						{@const oldData = change.baseVal as StrokeVariantData | null}
						{@const newData = change.editVal as StrokeVariantData | null}
						{@const oldCount = getStrokeCount(change.field, baseData)}
						{@const newCount = getStrokeCount(change.field, editData)}
						{@const fragField =
							change.field === 'strokeDataSimp' ? 'fragmentsSimp' : 'fragmentsTrad'}
						<div class="glyph-diff">
							{#if oldData}
								<div class="glyph-panel">
									<div class="glyph-box">
										<CharacterGlyph
											{character}
											strokes={oldData.strokes}
											components={baseData?.components ?? null}
											allFragments={baseData?.[fragField] ?? null}
										/>
									</div>
									<span class="glyph-caption diff-from"
										>{oldCount ?? oldData.strokes.length} strokes</span
									>
								</div>
							{/if}
							{#if oldData && newData}
								<span class="diff-arrow glyph-arrow">&rarr;</span>
							{/if}
							{#if newData}
								<div class="glyph-panel">
									<div class="glyph-box">
										<CharacterGlyph
											{character}
											strokes={newData.strokes}
											components={editData.components ?? null}
											allFragments={editData[fragField] ?? null}
										/>
									</div>
									<span class="glyph-caption diff-to"
										>{newCount ?? newData.strokes.length} strokes</span
									>
								</div>
							{/if}
						</div>
						{#if oldData && newData && oldData.source !== newData.source}
							<p class="source-change">
								Source: <span class="diff-from">{oldData.source}</span>
								<span class="diff-arrow">&rarr;</span>
								<span class="diff-to">{newData.source}</span>
							</p>
						{/if}
					{:else if change.field === 'fragmentsSimp' || change.field === 'fragmentsTrad'}
						<!-- Fragments: color-coded glyphs + per-component ranges -->
						{@const oldFrags = (change.baseVal as number[][] | null) ?? []}
						{@const newFrags = (change.editVal as number[][] | null) ?? []}
						{@const maxLen = Math.max(oldFrags.length, newFrags.length)}
						{@const strokeField =
							change.field === 'fragmentsSimp' ? 'strokeDataSimp' : 'strokeDataTrad'}
						{@const strokeData = (editData[strokeField] ??
							baseData?.[strokeField]) as StrokeVariantData | null}
						{#if strokeData}
							<div class="glyph-diff">
								<div class="glyph-panel">
									<div class="glyph-box">
										<CharacterGlyph
											{character}
											strokes={strokeData.strokes}
											components={baseData?.components ?? editData.components ?? null}
											allFragments={change.baseVal}
										/>
									</div>
								</div>
								<span class="diff-arrow glyph-arrow">&rarr;</span>
								<div class="glyph-panel">
									<div class="glyph-box">
										<CharacterGlyph
											{character}
											strokes={strokeData.strokes}
											components={editData.components ?? baseData?.components ?? null}
											allFragments={change.editVal}
										/>
									</div>
								</div>
							</div>
						{/if}
						<ul class="fragment-diff">
							{#each Array(maxLen) as _, i (i)}
								{@const oldRange = i < oldFrags.length ? formatFragmentRange(oldFrags[i]) : ''}
								{@const newRange = i < newFrags.length ? formatFragmentRange(newFrags[i]) : ''}
								{#if oldRange !== newRange}
									<li>
										Component {i + 1}:
										{#if oldRange}
											<span class="diff-from">{oldRange}</span>
											<span class="diff-arrow">&rarr;</span>
										{/if}
										<span class="diff-to">{newRange || '(removed)'}</span>
									</li>
								{/if}
							{/each}
						</ul>
					{:else if change.field === 'historicalPronunciations'}
						<!-- Historical pronunciations: match by source -->
						{@const diff = matchByKey<HistoricalPronunciation>(
							change.baseVal,
							change.editVal,
							'source'
						)}
						<ul class="pron-diff">
							{#each diff.modified as mod (mod.to.source)}
								{@const changed = changedSubFields(mod.from, mod.to, [
									'pinyin',
									'middleChinese',
									'oldChinese',
									'gloss',
									'phoneticSeries',
									'rhymeGroup',
									'notes'
								])}
								<li class="pron-item modified">
									<span class="pron-source">{mod.to.source}</span>
									<ul class="sub-changes">
										{#each changed as subField (subField)}
											<li>
												<span class="sub-field">{subField}:</span>
												<span class="diff-from"
													>{formatSubFieldValue(
														mod.from[subField as keyof HistoricalPronunciation]
													)}</span
												>
												<span class="diff-arrow">&rarr;</span>
												<span class="diff-to"
													>{formatSubFieldValue(
														mod.to[subField as keyof HistoricalPronunciation]
													)}</span
												>
											</li>
										{/each}
									</ul>
								</li>
							{/each}
							{#each diff.added as pron (pron.source)}
								<li class="pron-item added">
									<span class="badge-added">+</span>
									<span class="pron-source">{pron.source}</span>
									{#if pron.oldChinese}
										<span class="pron-detail">OC: {pron.oldChinese}</span>
									{/if}
									{#if pron.middleChinese}
										<span class="pron-detail">MC: {pron.middleChinese}</span>
									{/if}
								</li>
							{/each}
							{#each diff.removed as pron (pron.source)}
								<li class="pron-item removed">
									<span class="badge-removed">-</span>
									<span class="pron-source">{pron.source}</span>
								</li>
							{/each}
						</ul>
					{:else if change.field === 'historicalImages'}
						<!-- Historical images: match by type -->
						{@const diff = matchByKey<HistoricalImage>(change.baseVal, change.editVal, 'type')}
						<ul class="image-diff">
							{#each diff.modified as mod (mod.to.type)}
								{@const changed = changedSubFields(mod.from, mod.to, ['url', 'era', 'source'])}
								<li class="image-item modified">
									<span class="image-type">{mod.to.type}</span>
									{#if mod.to.era}
										<span class="image-era">({mod.to.era})</span>
									{/if}
									<ul class="sub-changes">
										{#each changed as subField (subField)}
											<li>
												<span class="sub-field">{subField}:</span>
												<span class="diff-from"
													>{formatSubFieldValue(mod.from[subField as keyof HistoricalImage])}</span
												>
												<span class="diff-arrow">&rarr;</span>
												<span class="diff-to"
													>{formatSubFieldValue(mod.to[subField as keyof HistoricalImage])}</span
												>
											</li>
										{/each}
									</ul>
								</li>
							{/each}
							{#each diff.added as img (img.type)}
								<li class="image-item added">
									<span class="badge-added">+</span>
									<span class="image-type">{img.type}</span>
									{#if img.era}
										<span class="image-era">({img.era})</span>
									{/if}
								</li>
							{/each}
							{#each diff.removed as img (img.type)}
								<li class="image-item removed">
									<span class="badge-removed">-</span>
									<span class="image-type">{img.type}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<!-- Fallback: simple text diff -->
						{@const fromStr =
							change.baseVal == null
								? '(empty)'
								: typeof change.baseVal === 'string'
									? change.baseVal || '(empty)'
									: String(change.baseVal)}
						{@const toStr =
							change.editVal == null
								? '(empty)'
								: typeof change.editVal === 'string'
									? change.editVal || '(empty)'
									: String(change.editVal)}
						{#if fromStr !== '(empty)'}
							<span class="diff-from">{fromStr}</span>
							<span class="diff-arrow">&rarr;</span>
						{/if}
						<span class="diff-to">{toStr}</span>
					{/if}
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
		gap: 0.625rem;
	}

	.diff-entry {
		font-size: 0.8125rem;
	}

	dt {
		font-weight: 600;
		color: var(--muted-foreground);
		font-size: 0.75rem;
		margin-bottom: 0.125rem;
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

	/* Array diffs */
	.array-diff {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.array-item {
		padding: 0.0625rem 0.375rem;
		border-radius: var(--radius);
		background: var(--surface);
		font-size: 0.8125rem;
	}

	.array-item.added {
		color: var(--success);
		background: var(--success-bg);
	}

	.array-item.removed {
		color: var(--error);
		background: var(--error-bg);
		text-decoration: line-through;
	}

	/* Source diffs */
	.source-diff {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.source-item {
		font-size: 0.8125rem;
	}

	.source-item a {
		color: var(--muted-foreground);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.source-item.added {
		color: var(--success);
	}

	.source-item.added a {
		color: var(--success);
	}

	.source-item.removed {
		color: var(--error);
		text-decoration: line-through;
	}

	.source-item.removed a {
		color: var(--error);
	}

	/* Badges */
	.badge-added,
	.badge-removed {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 50%;
		font-size: 0.75rem;
		font-weight: 700;
		line-height: 1;
		margin-right: 0.25rem;
	}

	.badge-added {
		background: var(--success-bg);
		color: var(--success);
	}

	.badge-removed {
		background: var(--error-bg);
		color: var(--error);
	}

	/* Component diffs */
	.component-diff {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.component-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.component-item.added {
		color: var(--success);
	}

	.component-item.removed {
		color: var(--error);
	}

	.comp-char {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.comp-type-tag {
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.comp-hint {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.sub-changes {
		list-style: none;
		padding: 0 0 0 1.5rem;
		margin: 0.125rem 0 0;
		width: 100%;
		font-size: 0.8125rem;
	}

	.sub-field {
		font-weight: 500;
		color: var(--muted-foreground);
		margin-right: 0.25rem;
	}

	/* Glyph diffs */
	.glyph-diff {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.glyph-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.glyph-box {
		width: 4rem;
		height: 4rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 0.25rem;
	}

	.glyph-caption {
		font-size: 0.6875rem;
		text-decoration: none;
	}

	.glyph-arrow {
		font-size: 1.25rem;
	}

	.source-change {
		margin-top: 0.25rem;
		font-size: 0.75rem;
	}

	/* Fragment diffs */
	.fragment-diff {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.8125rem;
	}

	/* Pronunciation diffs */
	.pron-diff {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.pron-item {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
	}

	.pron-item.added {
		color: var(--success);
	}

	.pron-item.removed {
		color: var(--error);
	}

	.pron-source {
		font-weight: 600;
		font-size: 0.8125rem;
	}

	.pron-detail {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	/* Image diffs */
	.image-diff {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.image-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.image-item.added {
		color: var(--success);
	}

	.image-item.removed {
		color: var(--error);
	}

	.image-type {
		font-weight: 600;
	}

	.image-era {
		color: var(--muted-foreground);
	}
</style>

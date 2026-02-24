<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CharacterData } from '$lib/types/dictionary';
	import type { PhoneticScript } from '$lib/orthography';
	import { formatPinyinList } from '$lib/orthography';
	import { getCharLinkBase } from './char-link-context';
	import StrokeAnimation from './stroke-animation.svelte';
	import CharacterBreakdown from './character-breakdown.svelte';
	import CharacterFrequency from './character-frequency.svelte';
	import CharacterGlyph from './character-glyph.svelte';
	import HistoricalImages from './historical-images.svelte';
	import HistoricalPronunciations from './historical-pronunciations.svelte';
	import SpeakButton from '$lib/components/ui/speak-button.svelte';
	import SourceList from './source-list.svelte';
	import { detectSources } from '$lib/data/source-info';

	interface Props {
		character: CharacterData;
		characterSet?: 'simplified' | 'traditional';
		phoneticScript?: PhoneticScript | null;
	}

	let { character, characterSet = 'simplified', phoneticScript = null }: Props = $props();

	let strokeVariantData = $derived(
		characterSet === 'traditional'
			? (character.strokeDataTrad ?? character.strokeDataSimp)
			: (character.strokeDataSimp ?? character.strokeDataTrad)
	);

	let strokeCount = $derived(
		characterSet === 'traditional'
			? (character.strokeCountTrad ?? character.strokeCountSimp)
			: (character.strokeCountSimp ?? character.strokeCountTrad)
	);

	let fragments = $derived(
		characterSet === 'traditional'
			? (character.fragmentsTrad ?? character.fragmentsSimp)
			: (character.fragmentsSimp ?? character.fragmentsTrad)
	);

	let simplifiedVariants = $derived(
		character.simplifiedVariants?.filter((v) => v !== character.character) ?? []
	);

	let traditionalVariants = $derived(
		character.traditionalVariants?.filter((v) => v !== character.character) ?? []
	);

	let sourceGroups = $derived(
		detectSources(character, {
			hasCustomSources: (character.customSources?.length ?? 0) > 0
		})
	);

	const charLinkBase = getCharLinkBase();

	let audioAttribution = $derived(
		character.pinyin && character.pinyin.length > 0 ? ('allset' as const) : null
	);
</script>

<article class="character-view">
	<header class="character-header">
		<div class="char-display">
			<CharacterGlyph
				character={character.character}
				strokes={strokeVariantData?.strokes ?? null}
				components={character.components}
				allFragments={fragments}
			/>
		</div>

		{#if strokeVariantData}
			<div class="char-animation">
				{#key character.character + '-' + characterSet}
					<StrokeAnimation strokeData={strokeVariantData} />
				{/key}
			</div>
		{/if}

		<div class="char-info">
			<SpeakButton text={character.character} label="Listen to {character.character}" />
			<div class="char-text">
				{#if character.pinyin && character.pinyin.length > 0}
					<div class="pinyin-readings">
						{#each character.pinyin as p (p)}
							<span class="pinyin-reading">{formatPinyinList([p], phoneticScript)}</span>
						{/each}
					</div>
				{/if}
				{#if character.gloss}
					<p class="gloss">{character.gloss}</p>
				{/if}
			</div>
		</div>
	</header>

	<div class="character-body">
		<CharacterBreakdown
			character={character.character}
			components={character.components}
			hint={character.hint}
			originalMeaning={character.originalMeaning}
			strokes={strokeVariantData?.strokes ?? null}
			historicalPronunciations={character.historicalPronunciations}
			{fragments}
			{characterSet}
			{phoneticScript}
		/>

		{#if character.historicalImages && character.historicalImages.length > 0}
			<HistoricalImages
				images={character.historicalImages}
				strokes={strokeVariantData?.strokes ?? null}
				character={character.character}
			/>
		{/if}

		{#if character.historicalPronunciations && character.historicalPronunciations.length > 0}
			<HistoricalPronunciations pronunciations={character.historicalPronunciations} />
		{/if}

		<CharacterFrequency
			junDaRank={character.junDaRank}
			junDaPerMillion={character.junDaPerMillion}
			subtlexRank={character.subtlexRank}
			subtlexPerMillion={character.subtlexPerMillion}
			subtlexContextDiversity={character.subtlexContextDiversity}
		/>

		{#if strokeCount != null || simplifiedVariants.length > 0 || traditionalVariants.length > 0 || character.shuowenExplanation || character.codepoint}
			<section class="details">
				<h2>Details</h2>
				<dl>
					{#if strokeCount != null}
						<div class="details-row">
							<dt>Strokes</dt>
							<dd>{strokeCount}</dd>
						</div>
					{/if}
					{#if simplifiedVariants.length > 0}
						<div class="details-row">
							<dt>Simplified</dt>
							<dd>
								{#each simplifiedVariants as v (v)}
									<a href={resolve(`${charLinkBase}/${v}`)}>{v}</a>
								{/each}
							</dd>
						</div>
					{/if}
					{#if traditionalVariants.length > 0}
						<div class="details-row">
							<dt>Traditional</dt>
							<dd>
								{#each traditionalVariants as v (v)}
									<a href={resolve(`${charLinkBase}/${v}`)}>{v}</a>
								{/each}
							</dd>
						</div>
					{/if}
					{#if character.shuowenExplanation}
						<div class="details-row">
							<dt>說文解字</dt>
							<dd>
								<span class="shuowen-text">{character.shuowenExplanation}</span>
								{#if character.shuowenPronunciation}
									<span class="shuowen-pron">
										{character.shuowenPronunciation}
										{#if character.shuowenPinyin}({character.shuowenPinyin}){/if}
									</span>
								{/if}
							</dd>
						</div>
					{/if}
					{#if character.codepoint}
						<div class="details-row">
							<dt>Unicode</dt>
							<dd>{character.codepoint}</dd>
						</div>
					{/if}
				</dl>
			</section>
		{/if}

		<SourceList {sourceGroups} customSources={character.customSources} {audioAttribution} />
	</div>
</article>

<style>
	.character-view {
		max-width: 900px;
	}

	.character-header {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem;
		align-items: center;
		margin-bottom: 1rem;
	}

	.char-display {
		flex-shrink: 0;
		width: 92px;
		font-size: 5rem;
	}

	.char-animation {
		width: 92px;
		height: 92px;
		flex-shrink: 0;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.char-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 200px;
	}

	.char-text {
		min-width: 0;
	}

	.gloss {
		font-size: 1.25rem;
		margin-bottom: 0.25rem;
	}

	.pinyin-readings {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pinyin-reading {
		font-size: 1.125rem;
	}

	.details {
		margin-bottom: 1.5rem;
	}

	.details h2 {
		font-size: 1rem;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	.details h2::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	.details dl {
		font-size: 0.875rem;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 1rem;
	}

	.details-row {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
	}

	.details dt {
		color: var(--muted-foreground);
	}

	.details dd {
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.details dd a {
		font-size: 1.125rem;
		line-height: 1;
	}

	.shuowen-text {
		line-height: 1.8;
	}

	.shuowen-pron {
		color: var(--muted-foreground);
	}
</style>

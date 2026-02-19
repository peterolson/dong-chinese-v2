<script lang="ts">
	import type { CharacterData } from '$lib/types/dictionary';
	import StrokeAnimation from './stroke-animation.svelte';
	import CharacterBreakdown from './character-breakdown.svelte';
	import CharacterFrequency from './character-frequency.svelte';
	import CharacterGlyph from './character-glyph.svelte';
	import HistoricalImages from './historical-images.svelte';
	import HistoricalPronunciations from './historical-pronunciations.svelte';

	interface Props {
		character: CharacterData;
		characterSet?: 'simplified' | 'traditional';
	}

	let { character, characterSet = 'simplified' }: Props = $props();

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
			{#if strokeCount != null}
				<span class="stroke-count">{strokeCount} strokes</span>
			{/if}
		</div>

		{#if strokeVariantData}
			<div class="char-animation">
				<StrokeAnimation strokeData={strokeVariantData} />
			</div>
		{/if}

		<div class="char-info">
			{#if character.gloss}
				<p class="gloss">{character.gloss}</p>
			{/if}
			{#if character.originalMeaning}
				<p class="original-meaning">
					<span class="label">Original meaning:</span>
					{character.originalMeaning}
				</p>
			{/if}
			{#if character.pinyinFrequencies && character.pinyinFrequencies.length > 0}
				<div class="pinyin-readings">
					{#each character.pinyinFrequencies as pf (pf.pinyin)}
						<span class="pinyin-reading">
							{pf.pinyin}
							<span class="pinyin-count">({pf.count.toLocaleString()})</span>
						</span>
					{/each}
				</div>
			{/if}
			{#if (character.simplifiedVariants && character.simplifiedVariants.length > 0) || (character.traditionalVariants && character.traditionalVariants.length > 0)}
				<div class="variants">
					{#if character.simplifiedVariants && character.simplifiedVariants.length > 0}
						<span class="variant-group">
							<span class="label">Simplified:</span>
							{#each character.simplifiedVariants as v (v)}
								<a href="/dictionary/{v}" class="variant-link">{v}</a>
							{/each}
						</span>
					{/if}
					{#if character.traditionalVariants && character.traditionalVariants.length > 0}
						<span class="variant-group">
							<span class="label">Traditional:</span>
							{#each character.traditionalVariants as v (v)}
								<a href="/dictionary/{v}" class="variant-link">{v}</a>
							{/each}
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<div class="character-body">
		<CharacterBreakdown
			components={character.components}
			hint={character.hint}
			customSources={character.customSources}
			isVerified={character.isVerified}
			strokes={strokeVariantData?.strokes ?? null}
			{fragments}
		/>

		<CharacterFrequency
			junDaRank={character.junDaRank}
			junDaFrequency={character.junDaFrequency}
			junDaPerMillion={character.junDaPerMillion}
			subtlexRank={character.subtlexRank}
			subtlexCount={character.subtlexCount}
			subtlexPerMillion={character.subtlexPerMillion}
			subtlexContextDiversity={character.subtlexContextDiversity}
		/>

		{#if character.shuowenExplanation}
			<section class="shuowen">
				<h2>說文解字 (Shuowen Jiezi)</h2>
				<p class="shuowen-text">{character.shuowenExplanation}</p>
				{#if character.shuowenPronunciation}
					<p class="shuowen-pron">
						<span class="label">Pronunciation:</span>
						{character.shuowenPronunciation}
						{#if character.shuowenPinyin}
							({character.shuowenPinyin})
						{/if}
					</p>
				{/if}
			</section>
		{/if}

		{#if character.historicalImages && character.historicalImages.length > 0}
			<HistoricalImages images={character.historicalImages} />
		{/if}

		{#if character.historicalPronunciations && character.historicalPronunciations.length > 0}
			<HistoricalPronunciations pronunciations={character.historicalPronunciations} />
		{/if}
	</div>
</article>

<style>
	.character-view {
		max-width: 900px;
	}

	.character-header {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid var(--border);
	}

	.char-display {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
		width: 92px;
		font-size: 5rem;
	}

	.stroke-count {
		font-size: 0.75rem;
		color: var(--muted-foreground);
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
		flex: 1;
		min-width: 0;
	}

	.gloss {
		font-size: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.original-meaning {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin-bottom: 0.5rem;
	}

	.label {
		font-weight: 600;
	}

	.pinyin-readings {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.pinyin-reading {
		font-size: 1.125rem;
	}

	.pinyin-count {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	.variants {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		font-size: 0.875rem;
	}

	.variant-link {
		font-size: 1.125rem;
		margin-left: 0.25rem;
	}

	@media (max-width: 600px) {
		.character-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}
	}

	.shuowen {
		margin-bottom: 1.5rem;
	}

	.shuowen h2 {
		margin-bottom: 0.75rem;
	}

	.shuowen-text {
		font-size: 1.125rem;
		line-height: 1.8;
		margin-bottom: 0.5rem;
	}

	.shuowen-pron {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}
</style>

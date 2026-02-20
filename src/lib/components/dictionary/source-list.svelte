<script lang="ts">
	import { sourceData, type SourceGroup } from '$lib/data/source-info';

	interface Props {
		sourceGroups: SourceGroup[];
		customSources: string[] | null;
		audioAttribution: 'allset' | 'audio-cmn' | 'both' | null;
	}

	let { sourceGroups, customSources, audioAttribution }: Props = $props();
</script>

{#if sourceGroups.length > 0 || (customSources && customSources.length > 0)}
	<section class="sources">
		<h2>Sources</h2>
		<dl>
			{#each sourceGroups as group (group.label)}
				<div class="source-group">
					<dt>{group.label}</dt>
					<dd>
						{#each group.keys as key (key)}
							{@const entry = sourceData[key]}
							{#if entry}
								<a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.title}</a>
							{:else}
								<span>{key}</span>
							{/if}
						{/each}
						{#if group.label === 'Character origin' && customSources}
							{#each customSources as source, i (i)}
								{@const parts = source.split('|')}
								{#if parts.length >= 2}
									<a href={parts[1]} target="_blank" rel="noopener noreferrer">{parts[0]}</a>
								{:else}
									<span>{source}</span>
								{/if}
							{/each}
						{/if}
					</dd>
				</div>
			{/each}
		</dl>

		{#if audioAttribution === 'allset' || audioAttribution === 'both'}
			<p class="audio-attribution">
				{#if audioAttribution === 'both'}
					Single-syllable audio courtesy of the <a
						href="https://resources.allsetlearning.com/chinese/pronunciation/"
						target="_blank"
						rel="noopener noreferrer">AllSet Learning Chinese Pronunciation Wiki</a
					>, used with permission.
				{:else}
					Audio courtesy of the <a
						href="https://resources.allsetlearning.com/chinese/pronunciation/"
						target="_blank"
						rel="noopener noreferrer">AllSet Learning Chinese Pronunciation Wiki</a
					>, used with permission.
				{/if}
			</p>
		{/if}

		{#if audioAttribution === 'audio-cmn' || audioAttribution === 'both'}
			<p class="audio-attribution">
				{#if audioAttribution === 'both'}
					HSK word audio courtesy of <a
						href="https://commons.wikimedia.org/wiki/Category:Audio-cmn"
						target="_blank"
						rel="noopener noreferrer">Audio-cmn</a
					>. (CC BY-SA 3.0)
				{:else}
					Audio courtesy of <a
						href="https://commons.wikimedia.org/wiki/Category:Audio-cmn"
						target="_blank"
						rel="noopener noreferrer">Audio-cmn</a
					>. (CC BY-SA 3.0)
				{/if}
			</p>
		{/if}
	</section>
{/if}

<style>
	.sources {
		margin-top: 1.5rem;
	}

	.sources h2 {
		font-size: 1rem;
		margin-bottom: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	.sources h2::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	dl {
		font-size: 0.875rem;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 1rem;
	}

	.source-group {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
	}

	dt {
		color: var(--muted-foreground);
	}

	dd {
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.sources a {
		color: var(--muted-foreground);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.sources a:hover {
		color: var(--foreground);
	}

	.audio-attribution {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin-top: 0.75rem;
	}

	@media (max-width: 400px) {
		dl {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.source-group {
			display: flex;
			flex-direction: column;
			gap: 0;
		}

		dd {
			text-align: right;
		}
	}
</style>

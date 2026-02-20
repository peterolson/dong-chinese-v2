<script lang="ts">
	import type { HistoricalImage } from '$lib/types/dictionary';

	interface Props {
		images: HistoricalImage[];
		strokes: string[] | null;
		character: string;
	}

	let { images, strokes, character }: Props = $props();

	const typeLabels: Record<string, string> = {
		Oracle: 'Oracle Bone Script',
		Bronze: 'Bronze Script',
		Seal: 'Seal Script',
		Clerical: 'Clerical Script',
		Other: 'Other'
	};

	interface AnnotatedImage extends HistoricalImage {
		extra: boolean;
	}

	/** Mark each image as representative or extra using legacy heuristic */
	let annotatedImages = $derived.by((): AnnotatedImage[] => {
		if (images.length <= 5) {
			return images.map((img) => ({ ...img, extra: false }));
		}

		const repIndices = new Set<number>();
		const seenTypes = new Map<string, number>();

		for (let i = 0; i < images.length; i++) {
			const img = images[i];
			if (!seenTypes.has(img.type)) {
				seenTypes.set(img.type, i);
				repIndices.add(i);
			} else if (img.era?.includes('Shuowen') || img.type === 'Clerical') {
				const prevIdx = seenTypes.get(img.type)!;
				repIndices.delete(prevIdx);
				seenTypes.set(img.type, i);
				repIndices.add(i);
			}
		}

		return images.map((img, i) => ({ ...img, extra: !repIndices.has(i) }));
	});

	let hasExtras = $derived(annotatedImages.some((img) => img.extra));
</script>

<section class="character-evolution">
	<h2>Character Evolution</h2>

	{#if hasExtras}
		<input type="checkbox" id="evo-toggle" class="evo-toggle" aria-hidden="true" tabindex="-1" />
	{/if}

	<div class="image-row">
		{#each annotatedImages as img, i (i)}
			<figure class="image-figure" class:extra={img.extra}>
				<img src={img.url} alt="{img.type} form" loading="lazy" />
				<figcaption>
					<span class="caption-label">{typeLabels[img.type] ?? img.type}</span>
					{#if img.era}<span class="caption-era">{img.era}</span>{/if}
				</figcaption>
			</figure>
		{/each}

		{#if strokes}
			<figure class="image-figure">
				<svg viewBox="0 0 1024 1024" class="regular-script" aria-label="{character} Regular Script">
					<g transform="translate(0, 900) scale(1, -1)">
						{#each strokes as stroke, j (j)}
							<path d={stroke} fill="var(--foreground)" />
						{/each}
					</g>
				</svg>
				<figcaption>
					<span class="caption-label">Regular Script</span>
					<span class="caption-era">Modern</span>
				</figcaption>
			</figure>
		{/if}

		{#if hasExtras}
			<label for="evo-toggle" class="toggle-cell">
				<span class="toggle-more">▼ More</span>
				<span class="toggle-less">▲ Less</span>
			</label>
		{/if}
	</div>
</section>

<style>
	.character-evolution {
		margin-bottom: 1.5rem;
	}

	h2 {
		font-size: 1rem;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	h2::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	/* Hidden checkbox for CSS-only toggle */
	.evo-toggle {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.image-row {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
		gap: 0.75rem;
	}

	.image-figure {
		text-align: center;
	}

	.image-figure img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: contain;
		display: block;
	}

	figcaption {
		display: flex;
		flex-direction: column;
	}

	.caption-label {
		font-size: 0.875rem;
	}

	.caption-era {
		font-size: 0.75rem;
		color: var(--muted-foreground);
	}

	/* Collapsed: hide extras */
	.extra {
		display: none;
	}

	/* Expanded: show extras */
	.evo-toggle:checked ~ .image-row .extra {
		display: block;
	}

	/* Toggle button */
	.toggle-cell {
		display: inline-flex;
		align-items: center;
		align-self: center;
		justify-self: start;
		cursor: pointer;
		padding: 0.375rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.toggle-cell:hover {
		color: var(--foreground);
		border-color: var(--foreground);
	}

	.toggle-less {
		display: none;
	}

	.evo-toggle:checked ~ .image-row .toggle-more {
		display: none;
	}

	.evo-toggle:checked ~ .image-row .toggle-less {
		display: inline;
	}

	.regular-script {
		width: 100%;
		aspect-ratio: 1;
		display: block;
	}

	/* Dark mode invert for historical raster images (not the SVG which uses currentColor) */
	:global([data-theme='dark']) .character-evolution img {
		filter: invert(1);
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light']):not([data-theme='dark'])) .character-evolution img {
			filter: invert(1);
		}
	}
</style>

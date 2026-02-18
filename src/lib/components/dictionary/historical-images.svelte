<script lang="ts">
	import type { HistoricalImage } from '$lib/types/dictionary';

	interface Props {
		images: HistoricalImage[];
	}

	let { images }: Props = $props();

	// Group images by type
	let groupedImages = $derived(
		images.reduce<Record<string, HistoricalImage[]>>((groups, img) => {
			const type = img.type || 'other';
			if (!groups[type]) groups[type] = [];
			groups[type].push(img);
			return groups;
		}, {})
	);

	const typeLabels: Record<string, string> = {
		oracle: 'Oracle Bone (甲骨文)',
		bronze: 'Bronze (金文)',
		seal: 'Seal Script (篆文)',
		clerical: 'Clerical (隸書)',
		other: 'Other'
	};

	// Display order
	const typeOrder = ['Oracle', 'Bronze', 'Seal', 'Clerical', 'Other'];
	let sortedTypes = $derived(
		typeOrder.filter((t) => groupedImages[t] && groupedImages[t].length > 0)
	);
</script>

<section class="historical-images">
	<h2>Historical Forms</h2>

	{#each sortedTypes as type (type)}
		<div class="image-group">
			<h3>{typeLabels[type] ?? type}</h3>
			<div class="image-row">
				{#each groupedImages[type] as img, i (i)}
					<figure class="image-figure">
						<img src={img.url} alt="{type} form" loading="lazy" />
						{#if img.source}
							<figcaption>{img.era}</figcaption>
						{/if}
					</figure>
				{/each}
			</div>
		</div>
	{/each}
</section>

<style>
	.historical-images {
		margin-bottom: 1.5rem;
	}

	h2 {
		margin-bottom: 0.75rem;
	}

	.image-group {
		margin-bottom: 1rem;
	}

	.image-group h3 {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin-bottom: 0.5rem;
	}

	.image-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.image-figure {
		text-align: center;
	}

	.image-figure img {
		width: 64px;
		height: 64px;
		object-fit: contain;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		padding: 4px;
	}

	figcaption {
		font-size: 0.625rem;
		color: var(--muted-foreground);
		max-width: 64px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>

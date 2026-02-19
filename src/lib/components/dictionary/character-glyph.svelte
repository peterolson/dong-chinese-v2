<script lang="ts">
	import type { ComponentData } from '$lib/types/dictionary';
	import { getAdjustedComponentColor } from './component-colors';

	interface Props {
		character: string;
		strokes: string[] | null;
		/** Component data — used to compute per-stroke colors automatically */
		components?: ComponentData[] | null;
		/** Fragment indices per component — maps components to their strokes */
		allFragments?: number[][] | null;
		/** If set, show ghost strokes + highlight this component's fragment (breakdown mode) */
		highlightIndex?: number;
		/** Stripe angle in degrees for multi-type components (default: 45) */
		stripeAngle?: number;
		/** Per-stripe width in SVG units (default: 100) */
		stripeWidth?: number;
	}

	let {
		character,
		strokes,
		components = null,
		allFragments = null,
		highlightIndex,
		stripeAngle = 45,
		stripeWidth = 100
	}: Props = $props();

	const uid = `g${Math.random().toString(36).slice(2, 8)}`;

	/** Per-component color arrays with same-type offset tracking */
	let componentColorSets = $derived.by(() => {
		if (!components || !allFragments) return null;
		const counts: Record<string, number> = {};
		return components.map((comp) => {
			const types = comp.type && comp.type.length > 0 ? comp.type : ['unknown'];
			return types.map((type) => {
				const offset = counts[type] ?? 0;
				counts[type] = offset + 1;
				return getAdjustedComponentColor(type, offset);
			});
		});
	});

	/** Header mode: per-stroke color assignments (last component wins) */
	let strokeFills = $derived.by(() => {
		if (!componentColorSets || !allFragments || !strokes || highlightIndex != null) return null;
		const fills: (string[] | null)[] = new Array(strokes.length).fill(null);
		for (let i = 0; i < allFragments.length; i++) {
			const colors = componentColorSets[i];
			if (!colors) continue;
			for (const idx of allFragments[i]) {
				fills[idx] = colors;
			}
		}
		return fills;
	});

	/** Breakdown mode: fragment set + colors for the highlighted component */
	let highlightFragmentSet = $derived(
		highlightIndex != null && allFragments ? new Set(allFragments[highlightIndex]) : null
	);
	let highlightColors = $derived(
		highlightIndex != null && componentColorSets
			? (componentColorSets[highlightIndex] ?? ['var(--foreground)'])
			: null
	);

	/** Collect all unique multi-type stripe patterns needed in this SVG */
	let patterns = $derived.by(() => {
		const map = new Map<string, string[]>();
		if (strokeFills) {
			for (const colors of strokeFills) {
				if (colors && colors.length > 1) map.set(colors.join('|'), colors);
			}
		} else if (highlightColors && highlightColors.length > 1) {
			map.set(highlightColors.join('|'), highlightColors);
		}
		return Array.from(map.entries()).map(([key, colors], i) => ({
			id: `${uid}-p${i}`,
			key,
			colors
		}));
	});

	function fillFor(colors: string[]): string {
		if (colors.length === 1) return colors[0];
		const key = colors.join('|');
		const p = patterns.find((pat) => pat.key === key);
		return p ? `url(#${p.id})` : colors[0];
	}
</script>

{#if strokes}
	<svg viewBox="0 0 1024 1024" class="character-glyph" aria-label={character} role="img">
		{#if patterns.length > 0}
			<defs>
				{#each patterns as pattern (pattern.id)}
					<pattern
						id={pattern.id}
						width={stripeWidth * pattern.colors.length}
						height={stripeWidth * pattern.colors.length}
						patternUnits="userSpaceOnUse"
						patternTransform="rotate({stripeAngle})"
					>
						{#each pattern.colors as c, i (i)}
							<rect
								x={i * stripeWidth}
								y="0"
								width={stripeWidth}
								height={stripeWidth * pattern.colors.length}
								style:fill={c}
							/>
						{/each}
					</pattern>
				{/each}
			</defs>
		{/if}
		<g transform="translate(0, 900) scale(1, -1)">
			{#if strokeFills}
				<!-- Header mode: all strokes colored by component -->
				{#each strokes as stroke, i (i)}
					{@const colors = strokeFills[i]}
					{#if colors}
						<path d={stroke} style:fill={fillFor(colors)} />
					{:else}
						<path d={stroke} fill="var(--foreground)" />
					{/if}
				{/each}
			{:else if highlightFragmentSet && highlightColors}
				<!-- Breakdown mode: ghost + highlight -->
				{#each strokes as stroke, i (i)}
					<path d={stroke} fill="var(--foreground)" opacity="0.15" />
				{/each}
				{#each strokes as stroke, i (i)}
					{#if highlightFragmentSet.has(i)}
						<path d={stroke} style:fill={fillFor(highlightColors)} />
					{/if}
				{/each}
			{:else}
				<!-- Plain: all strokes in foreground -->
				{#each strokes as stroke, i (i)}
					<path d={stroke} fill="var(--foreground)" />
				{/each}
			{/if}
		</g>
		<text
			x="512"
			y="512"
			text-anchor="middle"
			dominant-baseline="central"
			font-size="800"
			fill="transparent">{character}</text
		>
	</svg>
{:else}
	<span class="character-glyph-text">{character}</span>
{/if}

<style>
	.character-glyph {
		width: 100%;
		height: 100%;
		display: block;
	}

	.character-glyph-text {
		font-size: inherit;
		line-height: 1;
	}
</style>

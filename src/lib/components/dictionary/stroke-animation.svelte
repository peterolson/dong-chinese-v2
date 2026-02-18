<script lang="ts">
	import type { StrokeData } from '$lib/types/dictionary';

	interface Props {
		strokeData: StrokeData;
		variant?: 'simplified' | 'traditional';
	}

	let { strokeData, variant = 'simplified' }: Props = $props();

	let currentData = $derived(
		strokeData[variant] ?? strokeData.simplified ?? strokeData.traditional
	);
	let totalStrokes = $derived(currentData?.strokes.length ?? 0);

	// ── Tuning constants ──
	const DRAW_MS = 600; // time to draw each stroke along its median
	const PAUSE_MS = 300; // pause after a stroke finishes before the next begins
	const HOLD_MS = 1500; // all strokes stay visible after the last finishes
	const GAP_MS = 800; // blank time before the cycle restarts
	const EASING = 'ease-in-out'; // CSS timing function for the draw ('ease-in-out', 'linear', or a cubic-bezier)

	const STEP = DRAW_MS + PAUSE_MS; // time between consecutive stroke starts
	// cycle = gap → draw 0 → draw 1 → … → draw N-1 → hold → [clear at boundary]
	let cycle = $derived(GAP_MS + Math.max(totalStrokes - 1, 0) * STEP + DRAW_MS + HOLD_MS);

	function medianToPath(points: number[][]): string {
		if (points.length === 0) return '';
		return 'M' + points.map(([x, y]) => `${x},${y}`).join('L');
	}

	// Per-stroke keyframes animate stroke-dashoffset on the mask's median path.
	// Each stroke draws at its staggered time; all clear simultaneously at the
	// 100%→0% cycle boundary (every keyframe starts with stroke-dashoffset: 1).
	let animCSS = $derived(
		currentData
			? currentData.strokes
					.map((_, i) => {
						const startPct = ((GAP_MS + i * STEP) / cycle) * 100;
						const endPct = ((GAP_MS + i * STEP + DRAW_MS) / cycle) * 100;
						return (
							`.stroke-anim .m${i}{` +
							`stroke-dasharray:1;stroke-dashoffset:1;` +
							`animation:sa${i} ${cycle}ms ${EASING} infinite}` +
							`@keyframes sa${i}{` +
							`0%,${startPct.toFixed(2)}%{stroke-dashoffset:1}` +
							`${endPct.toFixed(2)}%,99.9%{stroke-dashoffset:0}` +
							`100%{stroke-dashoffset:1}}`
						);
					})
					.join('') +
					`@media(prefers-reduced-motion:reduce){` +
					currentData.strokes.map((_, i) => `.stroke-anim .m${i}`).join(',') +
					`{animation:none;stroke-dashoffset:0}}`
			: ''
	);
</script>

{#if currentData}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<style>${animCSS}</style>`}
	<svg viewBox="0 0 1024 1024" class="stroke-anim" aria-hidden="true">
		<defs>
			{#each currentData.medians as median, i (i)}
				<mask id="sm{i}">
					<path
						d={medianToPath(median)}
						pathLength="1"
						stroke="white"
						stroke-width="200"
						stroke-linecap="round"
						stroke-linejoin="round"
						fill="none"
						class="m{i}"
					/>
				</mask>
			{/each}
		</defs>

		<line x1="512" y1="0" x2="512" y2="1024" class="guide" />
		<line x1="0" y1="512" x2="1024" y2="512" class="guide" />
		<line x1="0" y1="0" x2="1024" y2="1024" class="guide guide-diagonal" />
		<line x1="1024" y1="0" x2="0" y2="1024" class="guide guide-diagonal" />

		<!-- Ghost strokes (always visible, faint) -->
		<g transform="translate(0, 900) scale(1, -1)">
			{#each currentData.strokes as stroke, i (i)}
				<path d={stroke} class="stroke-ghost" />
			{/each}
		</g>

		<!-- Animated strokes (revealed via mask drawing along median) -->
		<g transform="translate(0, 900) scale(1, -1)">
			{#each currentData.strokes as stroke, i (i)}
				<path d={stroke} class="stroke" mask="url(#sm{i})" />
			{/each}
		</g>
	</svg>
{/if}

<style>
	.stroke-anim {
		width: 100%;
		height: 100%;
		display: block;
	}

	.guide {
		stroke: var(--border);
		stroke-width: 2;
		stroke-dasharray: 8 8;
	}

	.guide-diagonal {
		stroke-width: 1;
	}

	.stroke-ghost {
		fill: var(--foreground);
		opacity: 0.08;
	}

	.stroke {
		fill: var(--foreground);
	}
</style>

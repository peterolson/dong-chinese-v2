<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import StrokeAnimation from './stroke-animation.svelte';
	import { xueStrokesSimp, xueMedians } from './stories.data';
	import type { StrokeVariantData } from '$lib/types/dictionary';

	const { Story } = defineMeta({
		title: 'Dictionary/Stroke Animation',
		tags: ['autodocs']
	});

	const xueStrokeData: StrokeVariantData = {
		strokes: xueStrokesSimp,
		medians: xueMedians,
		source: 'animcjk'
	};

	// Simple 一 (single stroke)
	const yiStrokeData: StrokeVariantData = {
		strokes: [
			'M 90 494 Q 125 489 159 487 Q 487 474 762 481 Q 838 482 843 491 Q 848 502 822 516 Q 737 558 637 539 Q 439 508 125 501 Q 100 501 90 494 Z'
		],
		medians: [
			[
				[95, 496],
				[125, 494],
				[763, 494],
				[835, 494]
			]
		],
		source: 'animcjk'
	};
</script>

<Story
	name="Multi-Stroke (学)"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const svg = canvasElement.querySelector('svg.stroke-anim');
		await expect(svg).toBeInTheDocument();
	}}
>
	<div style="width: 120px; height: 120px;">
		<StrokeAnimation strokeData={xueStrokeData} />
	</div>
</Story>

<Story name="Single Stroke (一)">
	<div style="width: 120px; height: 120px;">
		<StrokeAnimation strokeData={yiStrokeData} />
	</div>
</Story>

<Story name="Large Size">
	<div style="width: 240px; height: 240px;">
		<StrokeAnimation strokeData={xueStrokeData} />
	</div>
</Story>

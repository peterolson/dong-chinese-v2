<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import CharacterGlyph from './character-glyph.svelte';
	import { xueStrokesSimp, xueFragments, xueCharacterData } from './stories.data';

	const { Story } = defineMeta({
		title: 'Dictionary/Character Glyph',
		tags: ['autodocs']
	});
</script>

<Story
	name="Plain Strokes"
	play={async ({ canvasElement }) => {
		const svg = canvasElement.querySelector('svg.character-glyph');
		await expect(svg).toBeInTheDocument();
	}}
>
	<div style="width: 120px; height: 120px;">
		<CharacterGlyph character="学" strokes={xueStrokesSimp} />
	</div>
</Story>

<Story
	name="Colored by Component"
	play={async ({ canvasElement }) => {
		const svg = canvasElement.querySelector('svg.character-glyph');
		await expect(svg).toBeInTheDocument();
	}}
>
	<div style="width: 120px; height: 120px;">
		<CharacterGlyph
			character="学"
			strokes={xueStrokesSimp}
			components={xueCharacterData.components}
			allFragments={xueFragments}
		/>
	</div>
</Story>

<Story name="Highlight Index 0">
	<div style="width: 120px; height: 120px;">
		<CharacterGlyph
			character="学"
			strokes={xueStrokesSimp}
			components={xueCharacterData.components}
			allFragments={xueFragments}
			highlightIndex={0}
		/>
	</div>
</Story>

<Story name="Highlight Index 1">
	<div style="width: 120px; height: 120px;">
		<CharacterGlyph
			character="学"
			strokes={xueStrokesSimp}
			components={xueCharacterData.components}
			allFragments={xueFragments}
			highlightIndex={1}
		/>
	</div>
</Story>

<Story
	name="Text Fallback"
	play={async ({ canvasElement }) => {
		const span = canvasElement.querySelector('.character-glyph-text');
		await expect(span).toBeInTheDocument();
		await expect(span?.textContent).toBe('学');
	}}
>
	<div style="width: 120px; height: 120px; font-size: 5rem;">
		<CharacterGlyph character="学" strokes={null} />
	</div>
</Story>

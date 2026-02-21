<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import CharacterBreakdown from './character-breakdown.svelte';
	import { xueStrokesSimp, xueFragments, xueCharacterData, maCharacterData } from './stories.data';

	const { Story } = defineMeta({
		title: 'Dictionary/Character Breakdown',
		tags: ['autodocs']
	});
</script>

<Story
	name="With Components"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Components')).toBeInTheDocument();
	}}
>
	<CharacterBreakdown
		character="学"
		components={xueCharacterData.components}
		hint={xueCharacterData.hint}
		originalMeaning={null}
		strokes={xueStrokesSimp}
		fragments={xueFragments}
		historicalPronunciations={xueCharacterData.historicalPronunciations}
	/>
</Story>

<Story
	name="With Original Meaning"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText(/Original meaning/)).toBeInTheDocument();
	}}
>
	<CharacterBreakdown
		character="妈"
		components={maCharacterData.components}
		hint={maCharacterData.hint}
		originalMeaning="horse rider"
		strokes={null}
		fragments={null}
		historicalPronunciations={maCharacterData.historicalPronunciations}
	/>
</Story>

<Story
	name="No Components"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.queryByText('Components')).not.toBeInTheDocument();
	}}
>
	<CharacterBreakdown
		character="一"
		components={null}
		hint={null}
		originalMeaning={null}
		strokes={null}
		fragments={null}
		historicalPronunciations={null}
	/>
</Story>

<Story name="Hint Only">
	<CharacterBreakdown
		character="一"
		components={null}
		hint="A single horizontal stroke representing the number one."
		originalMeaning={null}
		strokes={null}
		fragments={null}
		historicalPronunciations={null}
	/>
</Story>

<Story name="Components Without Strokes">
	<CharacterBreakdown
		character="妈"
		components={maCharacterData.components}
		hint={maCharacterData.hint}
		originalMeaning={null}
		strokes={null}
		fragments={null}
		historicalPronunciations={null}
	/>
</Story>

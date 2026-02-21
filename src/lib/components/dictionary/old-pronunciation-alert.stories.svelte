<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import OldPronunciationAlert from './old-pronunciation-alert.svelte';
	import type { HistoricalPronunciation } from '$lib/types/dictionary';

	const { Story } = defineMeta({
		title: 'Dictionary/Old Pronunciation Alert',
		tags: ['autodocs']
	});

	const charProns: HistoricalPronunciation[] = [
		{ source: 'baxter-sagart', oldChinese: '*C.qʰˤ<r>ok', middleChinese: 'hæwk', gloss: 'study' }
	];

	const compProns: HistoricalPronunciation[] = [
		{ source: 'baxter-sagart', oldChinese: '*ŋˤrawk', middleChinese: 'ŋɣæwk', gloss: 'mix' }
	];
</script>

<Story
	name="With Comparison"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText(/don't sound similar/)).toBeInTheDocument();
		await expect(canvas.getByText(/Chinese/)).toBeInTheDocument();
	}}
>
	<OldPronunciationAlert
		character="学"
		compCharacter="爻"
		charPronunciations={charProns}
		compPronunciations={compProns}
	/>
</Story>

<Story
	name="Without Pronunciations"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText(/don't sound similar/)).toBeInTheDocument();
		await expect(canvas.getByText(/older Chinese/)).toBeInTheDocument();
	}}
>
	<OldPronunciationAlert
		character="他"
		compCharacter="也"
		charPronunciations={null}
		compPronunciations={null}
	/>
</Story>

<Story name="Middle Chinese Match">
	<OldPronunciationAlert
		character="问"
		compCharacter="门"
		charPronunciations={[{ source: 'baxter-sagart', middleChinese: 'mjunH', gloss: 'ask' }]}
		compPronunciations={[{ source: 'baxter-sagart', middleChinese: 'mwon', gloss: 'gate' }]}
	/>
</Story>

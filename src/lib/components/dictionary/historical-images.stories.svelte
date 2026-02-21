<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import HistoricalImages from './historical-images.svelte';
	import { sampleHistoricalImages, manyHistoricalImages, xueStrokesSimp } from './stories.data';

	const { Story } = defineMeta({
		title: 'Dictionary/Historical Images',
		tags: ['autodocs']
	});
</script>

<Story
	name="Few Images"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Character Evolution')).toBeInTheDocument();
		await expect(canvas.getByText('Oracle Bone Script')).toBeInTheDocument();
		await expect(canvas.getByText('Bronze Script')).toBeInTheDocument();
		await expect(canvas.getByText('Seal Script')).toBeInTheDocument();
	}}
>
	<HistoricalImages images={sampleHistoricalImages} strokes={xueStrokesSimp} character="学" />
</Story>

<Story
	name="Many Images (Collapsible)"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Character Evolution')).toBeInTheDocument();
	}}
>
	<HistoricalImages images={manyHistoricalImages} strokes={xueStrokesSimp} character="学" />
</Story>

<Story name="No Strokes">
	<HistoricalImages images={sampleHistoricalImages} strokes={null} character="学" />
</Story>

<Story name="Single Image">
	<HistoricalImages
		images={[
			{
				type: 'Seal',
				era: 'Shuowen Jiezi',
				url: 'https://xiaoxue.iis.sinica.edu.tw/images/seal/A00001.jpg'
			}
		]}
		strokes={null}
		character="学"
	/>
</Story>

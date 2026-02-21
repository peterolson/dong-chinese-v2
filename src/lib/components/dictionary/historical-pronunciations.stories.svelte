<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import HistoricalPronunciations from './historical-pronunciations.svelte';
	import { samplePronunciations } from './stories.data';

	const { Story } = defineMeta({
		title: 'Dictionary/Historical Pronunciations',
		tags: ['autodocs']
	});
</script>

<Story
	name="All Sources"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Historical Pronunciations')).toBeInTheDocument();
		await expect(canvas.getByText('Middle Chinese')).toBeInTheDocument();
		await expect(canvas.getByText('Old Chinese')).toBeInTheDocument();
		await expect(canvas.getByText('Gloss')).toBeInTheDocument();
		await expect(canvas.getByText('Baxter-Sagart')).toBeInTheDocument();
		await expect(canvas.getByText('Zhengzhang')).toBeInTheDocument();
		await expect(canvas.getByText('Unicode')).toBeInTheDocument();
	}}
>
	<HistoricalPronunciations pronunciations={samplePronunciations} />
</Story>

<Story
	name="Baxter-Sagart Only"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Baxter-Sagart')).toBeInTheDocument();
		await expect(canvas.queryByText('Zhengzhang')).not.toBeInTheDocument();
	}}
>
	<HistoricalPronunciations
		pronunciations={[
			{
				source: 'baxter-sagart',
				oldChinese: '*tsəʔ',
				middleChinese: 'dzɨH',
				gloss: 'written character'
			}
		]}
	/>
</Story>

<Story name="Zhengzhang Only">
	<HistoricalPronunciations pronunciations={[{ source: 'zhengzhang', oldChinese: '*zɯːs' }]} />
</Story>

<Story name="Tang Only">
	<HistoricalPronunciations pronunciations={[{ source: 'tang', middleChinese: 'dzɨH' }]} />
</Story>

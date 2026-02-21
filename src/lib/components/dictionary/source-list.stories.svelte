<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import SourceList from './source-list.svelte';
	import type { SourceGroup } from '$lib/data/source-info';

	const { Story } = defineMeta({
		title: 'Dictionary/Source List',
		tags: ['autodocs']
	});

	const fullGroups: SourceGroup[] = [
		{ label: 'Character origin', keys: [] },
		{ label: 'Readings & variants', keys: ['unicode'] },
		{ label: 'Stroke data', keys: ['animcjk'] },
		{ label: 'Historical pronunciations', keys: ['baxter-sagart', 'zhengzhang'] },
		{ label: 'Etymology', keys: ['shuowen'] },
		{ label: 'Frequency data', keys: ['jun-da', 'subtlex-ch'] }
	];
</script>

<Story
	name="Full Sources"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Sources')).toBeInTheDocument();
		await expect(canvas.getByText('Readings & variants')).toBeInTheDocument();
		await expect(canvas.getByText('Stroke data')).toBeInTheDocument();
		await expect(canvas.getByText('Historical pronunciations')).toBeInTheDocument();
		await expect(canvas.getByText('Etymology')).toBeInTheDocument();
		await expect(canvas.getByText('Frequency data')).toBeInTheDocument();
	}}
>
	<SourceList
		sourceGroups={fullGroups}
		customSources={['Dong Chinese|https://dong-chinese.com']}
		audioAttribution={null}
	/>
</Story>

<Story
	name="With Audio Attribution"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText(/AllSet Learning/)).toBeInTheDocument();
	}}
>
	<SourceList
		sourceGroups={[{ label: 'Readings & variants', keys: ['unicode'] }]}
		customSources={null}
		audioAttribution="allset"
	/>
</Story>

<Story name="Audio CMN Attribution">
	<SourceList
		sourceGroups={[{ label: 'Readings & variants', keys: ['unicode'] }]}
		customSources={null}
		audioAttribution="audio-cmn"
	/>
</Story>

<Story name="Both Audio Attributions">
	<SourceList
		sourceGroups={[{ label: 'Readings & variants', keys: ['unicode'] }]}
		customSources={null}
		audioAttribution="both"
	/>
</Story>

<Story
	name="Empty"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.queryByText('Sources')).not.toBeInTheDocument();
	}}
>
	<SourceList sourceGroups={[]} customSources={null} audioAttribution={null} />
</Story>

<Story name="Custom Sources Only">
	<SourceList
		sourceGroups={[{ label: 'Character origin', keys: [] }]}
		customSources={['Dong Chinese|https://dong-chinese.com', 'Other source']}
		audioAttribution={null}
	/>
</Story>

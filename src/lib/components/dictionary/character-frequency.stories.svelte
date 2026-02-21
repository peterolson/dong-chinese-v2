<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import CharacterFrequency from './character-frequency.svelte';

	const { Story } = defineMeta({
		title: 'Dictionary/Character Frequency',
		tags: ['autodocs']
	});
</script>

<Story
	name="Both Sources"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Frequency')).toBeInTheDocument();
		await expect(canvas.getByText('Written text')).toBeInTheDocument();
		await expect(canvas.getByText('Movie subtitles')).toBeInTheDocument();
	}}
>
	<CharacterFrequency
		junDaRank={125}
		junDaPerMillion={839.68}
		subtlexRank={130}
		subtlexPerMillion={826.59}
		subtlexContextDiversity={5842}
	/>
</Story>

<Story
	name="Jun Da Only"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Written text')).toBeInTheDocument();
		await expect(canvas.queryByText('Movie subtitles')).not.toBeInTheDocument();
	}}
>
	<CharacterFrequency
		junDaRank={2}
		junDaPerMillion={15830.93}
		subtlexRank={null}
		subtlexPerMillion={null}
		subtlexContextDiversity={null}
	/>
</Story>

<Story
	name="SUBTLEX Only"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.queryByText('Written text')).not.toBeInTheDocument();
		await expect(canvas.getByText('Movie subtitles')).toBeInTheDocument();
	}}
>
	<CharacterFrequency
		junDaRank={null}
		junDaPerMillion={null}
		subtlexRank={5}
		subtlexPerMillion={3129.29}
		subtlexContextDiversity={6100}
	/>
</Story>

<Story
	name="No Data"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.queryByText('Frequency')).not.toBeInTheDocument();
	}}
>
	<CharacterFrequency
		junDaRank={null}
		junDaPerMillion={null}
		subtlexRank={null}
		subtlexPerMillion={null}
		subtlexContextDiversity={null}
	/>
</Story>

<Story name="Low Frequency">
	<CharacterFrequency
		junDaRank={6200}
		junDaPerMillion={0.523}
		subtlexRank={8100}
		subtlexPerMillion={0.087}
		subtlexContextDiversity={42}
	/>
</Story>

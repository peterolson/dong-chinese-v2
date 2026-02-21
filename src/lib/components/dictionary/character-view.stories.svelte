<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import CharacterView from './character-view.svelte';
	import {
		xueCharacterData,
		minimalCharacterData,
		maCharacterData,
		traditionalCharacterData
	} from './stories.data';

	const { Story } = defineMeta({
		title: 'Dictionary/Character View',
		tags: ['autodocs']
	});
</script>

<Story
	name="Full Character (学)"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('to study; to learn')).toBeInTheDocument();
		await expect(canvas.getByText('xué')).toBeInTheDocument();
		await expect(canvas.getByText('Components')).toBeInTheDocument();
		await expect(canvas.getByText('Frequency')).toBeInTheDocument();
		await expect(canvas.getByText('Sources')).toBeInTheDocument();
		await expect(canvas.getByText('Details')).toBeInTheDocument();
		await expect(canvas.getByText('說文解字')).toBeInTheDocument();
	}}
>
	<CharacterView character={xueCharacterData} />
</Story>

<Story
	name="Minimal Character (一)"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('one')).toBeInTheDocument();
		await expect(canvas.getByText('yī')).toBeInTheDocument();
		await expect(canvas.queryByText('Components')).not.toBeInTheDocument();
	}}
>
	<CharacterView character={minimalCharacterData} />
</Story>

<Story name="With Custom Sources (妈)">
	<CharacterView character={maCharacterData} />
</Story>

<Story
	name="Traditional Character Set"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('to study; to learn')).toBeInTheDocument();
		await expect(canvas.getByText('學')).toBeInTheDocument();
	}}
>
	<CharacterView character={traditionalCharacterData} characterSet="traditional" />
</Story>

<Story
	name="Simplified Variants"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Simplified')).toBeInTheDocument();
		await expect(canvas.getByText('学')).toBeInTheDocument();
	}}
>
	<CharacterView character={traditionalCharacterData} />
</Story>

<Story
	name="No Pinyin No Gloss"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.queryByText(/\.$/)).not.toBeInTheDocument();
	}}
>
	<CharacterView
		character={{
			...minimalCharacterData,
			pinyin: null,
			gloss: null,
			pinyinFrequencies: null
		}}
	/>
</Story>

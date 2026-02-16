<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import SegmentedControl from './segmented-control.svelte';

	const { Story } = defineMeta({
		title: 'Components/SegmentedControl',
		tags: ['autodocs']
	});

	const themeOptions = [
		{ value: '', label: 'System' },
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];
</script>

<Story
	name="Default"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const radios = canvas.getAllByRole('radio');
		await expect(radios).toHaveLength(3);
		await expect(radios[0]).toBeChecked();
	}}
>
	<SegmentedControl name="theme" options={themeOptions} selected="" />
</Story>

<Story
	name="SecondSelected"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const radios = canvas.getAllByRole('radio');
		await expect(radios[1]).toBeChecked();
	}}
>
	<SegmentedControl name="theme" options={themeOptions} selected="light" />
</Story>

<Story
	name="ThirdSelected"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const radios = canvas.getAllByRole('radio');
		await expect(radios[2]).toBeChecked();
	}}
>
	<SegmentedControl name="theme" options={themeOptions} selected="dark" />
</Story>

<Story
	name="TwoOptions"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const radios = canvas.getAllByRole('radio');
		await expect(radios).toHaveLength(2);
	}}
>
	<SegmentedControl
		name="mode"
		options={[
			{ value: 'simplified', label: 'Simplified' },
			{ value: 'traditional', label: 'Traditional' }
		]}
		selected="simplified"
	/>
</Story>

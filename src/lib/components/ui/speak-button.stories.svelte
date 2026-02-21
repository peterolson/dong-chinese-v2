<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import SpeakButton from './speak-button.svelte';

	const { Story } = defineMeta({
		title: 'Components/Speak Button',
		tags: ['autodocs']
	});
</script>

<Story
	name="Default"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button');
		await expect(button).toBeInTheDocument();
		await expect(button).toHaveAttribute('aria-label', 'Listen');
	}}
>
	<SpeakButton text="你好" />
</Story>

<Story
	name="Custom Label"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button');
		await expect(button).toHaveAttribute('aria-label', 'Listen to 学');
	}}
>
	<SpeakButton text="学" label="Listen to 学" />
</Story>

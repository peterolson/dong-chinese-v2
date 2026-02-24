<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within, userEvent } from 'storybook/test';
	import TagInput from './tag-input.svelte';

	const { Story } = defineMeta({
		title: 'Wiki/TagInput',
		tags: ['autodocs']
	});
</script>

<Story
	name="Empty"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Pinyin')).toBeInTheDocument();
		await expect(canvas.getByPlaceholderText('Type and press Enter...')).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: 'Add' })).toBeInTheDocument();
	}}
>
	<TagInput name="pinyin" label="Pinyin" />
</Story>

<Story
	name="WithValues"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('rén')).toBeInTheDocument();
		await expect(canvas.getByText('rěn')).toBeInTheDocument();
		// Each tag should have a remove button
		const removeButtons = canvas.getAllByRole('button', { name: /Remove/ });
		await expect(removeButtons.length).toBe(2);
	}}
>
	<TagInput name="pinyin" label="Pinyin" values={['rén', 'rěn']} />
</Story>

<Story
	name="AddTag"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const input = canvas.getByPlaceholderText('Type and press Enter...');
		await userEvent.type(input, 'shuǐ');
		await userEvent.click(canvas.getByRole('button', { name: 'Add' }));
		await expect(canvas.getByText('shuǐ')).toBeInTheDocument();
	}}
>
	<TagInput name="pinyin" label="Pinyin" />
</Story>

<Story
	name="RemoveTag"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('existing')).toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: 'Remove existing' }));
		await expect(canvas.queryByText('existing')).not.toBeInTheDocument();
	}}
>
	<TagInput name="tags" label="Tags" values={['existing']} />
</Story>

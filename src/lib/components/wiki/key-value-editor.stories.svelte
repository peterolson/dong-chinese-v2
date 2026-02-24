<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within, userEvent } from 'storybook/test';
	import KeyValueEditor from './key-value-editor.svelte';

	const { Story } = defineMeta({
		title: 'Wiki/KeyValueEditor',
		tags: ['autodocs']
	});
</script>

<Story
	name="Empty"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Custom Fields')).toBeInTheDocument();
		await expect(canvas.getByText('No entries.')).toBeInTheDocument();
		await expect(canvas.getByRole('button', { name: '+ Add entry' })).toBeInTheDocument();
	}}
>
	<KeyValueEditor name="custom" label="Custom Fields" />
</Story>

<Story
	name="WithEntries"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const keyInputs = canvas.getAllByPlaceholderText('Key');
		const valueInputs = canvas.getAllByPlaceholderText('Value');
		await expect(keyInputs.length).toBe(2);
		await expect(valueInputs.length).toBe(2);
		// Remove buttons present
		const removeButtons = canvas.getAllByRole('button', { name: 'Remove entry' });
		await expect(removeButtons.length).toBe(2);
	}}
>
	<KeyValueEditor
		name="metadata"
		label="Metadata"
		entries={[
			{ key: 'source', value: 'Shuowen Jiezi' },
			{ key: 'era', value: 'Han Dynasty' }
		]}
	/>
</Story>

<Story
	name="AddEntry"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('No entries.')).toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: '+ Add entry' }));
		// After adding, should have key/value inputs
		await expect(canvas.getByPlaceholderText('Key')).toBeInTheDocument();
		await expect(canvas.getByPlaceholderText('Value')).toBeInTheDocument();
	}}
>
	<KeyValueEditor name="custom" label="Custom Fields" />
</Story>

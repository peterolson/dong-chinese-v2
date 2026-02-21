<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect } from 'storybook/test';
	import Modal from './modal.svelte';

	const { Story } = defineMeta({
		title: 'Components/Modal',
		tags: ['autodocs']
	});
</script>

<Story
	name="Open"
	play={async ({ canvasElement }) => {
		const dialog = canvasElement.ownerDocument.querySelector('dialog');
		await expect(dialog).toBeInTheDocument();
	}}
>
	<Modal open={true} title="Example Modal">
		<p>This is modal content. It can contain any HTML or Svelte components.</p>
		<p>The modal supports scrolling for long content and closes on backdrop click or Escape.</p>
	</Modal>
</Story>

<Story name="Closed">
	<Modal open={false} title="Hidden Modal">
		<p>This content should not be visible.</p>
	</Modal>
</Story>

<Story name="Long Content">
	<Modal open={true} title="Scrollable Content">
		{#each Array.from({ length: 20 }, (_, i) => i) as i (i)}
			<p>
				Paragraph {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
				tempor incididunt ut labore et dolore magna aliqua.
			</p>
		{/each}
	</Modal>
</Story>

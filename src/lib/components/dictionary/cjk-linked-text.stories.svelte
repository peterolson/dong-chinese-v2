<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import CjkLinkedText from './cjk-linked-text.svelte';

	const { Story } = defineMeta({
		title: 'Dictionary/CJK Linked Text',
		tags: ['autodocs']
	});
</script>

<Story
	name="Mixed Text"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const links = canvasElement.querySelectorAll('a.cjk-link');
		await expect(links.length).toBeGreaterThan(0);
		await expect(canvas.getByText('女')).toBeInTheDocument();
		await expect(canvas.getByText('马')).toBeInTheDocument();
	}}
>
	<CjkLinkedText text="女 (woman) + 马 (horse) as a sound component." />
</Story>

<Story
	name="CJK Only"
	play={async ({ canvasElement }) => {
		const links = canvasElement.querySelectorAll('a.cjk-link');
		await expect(links.length).toBe(1);
	}}
>
	<CjkLinkedText text="你好世界" />
</Story>

<Story
	name="No CJK"
	play={async ({ canvasElement }) => {
		const links = canvasElement.querySelectorAll('a.cjk-link');
		await expect(links.length).toBe(0);
	}}
>
	<CjkLinkedText text="No Chinese characters here." />
</Story>

<Story name="Multiple CJK Segments">
	<CjkLinkedText text="Depicts two hands (𦥑) teaching a child (子) under a roof (宀)." />
</Story>

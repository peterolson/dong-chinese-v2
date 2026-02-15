<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import ProgressButton from './progress-button.svelte';

	const { Story } = defineMeta({
		title: 'Components/ProgressButton',
		component: ProgressButton,
		tags: ['autodocs']
	});
</script>

<Story
	name="Idle"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', { name: /email sign-in link/i });
		await expect(button).toBeInTheDocument();
		await expect(button).not.toBeDisabled();
	}}
>
	<ProgressButton loading={false}>Email sign-in link</ProgressButton>
</Story>

<Story
	name="Loading"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button');
		await expect(button).toBeDisabled();
	}}
>
	<ProgressButton loading={true}>Email sign-in link</ProgressButton>
</Story>

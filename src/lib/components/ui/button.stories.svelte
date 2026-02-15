<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import Button from './button.svelte';

	const { Story } = defineMeta({
		title: 'Components/Button',
		tags: ['autodocs']
	});
</script>

<Story
	name="Primary"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', { name: /primary/i });
		await expect(button).toBeInTheDocument();
		await expect(button).not.toBeDisabled();
	}}
>
	<Button variant="primary">Primary</Button>
</Story>

<Story
	name="Secondary"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', { name: /secondary/i });
		await expect(button).toBeInTheDocument();
	}}
>
	<Button variant="secondary">Secondary</Button>
</Story>

<Story
	name="Tertiary"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', { name: /tertiary/i });
		await expect(button).toBeInTheDocument();
	}}
>
	<Button variant="tertiary">Tertiary</Button>
</Story>

<Story
	name="Outline"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button', { name: /outline/i });
		await expect(button).toBeInTheDocument();
	}}
>
	<Button variant="outline">Outline</Button>
</Story>

<Story
	name="Disabled"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole('button');
		await expect(button).toBeDisabled();
	}}
>
	<Button variant="primary" disabled>Disabled</Button>
</Story>

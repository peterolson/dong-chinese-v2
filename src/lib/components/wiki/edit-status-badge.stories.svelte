<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import EditStatusBadge from './edit-status-badge.svelte';

	const { Story } = defineMeta({
		title: 'Wiki/EditStatusBadge',
		tags: ['autodocs']
	});
</script>

<Story
	name="Pending"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const badge = canvas.getByText('pending');
		await expect(badge).toBeInTheDocument();
		await expect(badge).toHaveAttribute('data-status', 'pending');
	}}
>
	<EditStatusBadge status="pending" />
</Story>

<Story
	name="Approved"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const badge = canvas.getByText('approved');
		await expect(badge).toBeInTheDocument();
		await expect(badge).toHaveAttribute('data-status', 'approved');
	}}
>
	<EditStatusBadge status="approved" />
</Story>

<Story
	name="Rejected"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const badge = canvas.getByText('rejected');
		await expect(badge).toBeInTheDocument();
		await expect(badge).toHaveAttribute('data-status', 'rejected');
	}}
>
	<EditStatusBadge status="rejected" />
</Story>

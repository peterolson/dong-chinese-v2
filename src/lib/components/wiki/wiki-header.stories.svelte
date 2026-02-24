<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import WikiHeader from './wiki-header.svelte';

	const { Story } = defineMeta({
		title: 'Wiki/WikiHeader',
		tags: ['autodocs']
	});
</script>

<Story
	name="LoggedOut"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Chinese Character Wiki')).toBeInTheDocument();
		await expect(canvas.getByText('Log in')).toBeInTheDocument();
	}}
>
	<WikiHeader user={null} />
</Story>

<Story
	name="LoggedIn"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Chinese Character Wiki')).toBeInTheDocument();
		await expect(canvas.getByText('Alice')).toBeInTheDocument();
		await expect(canvas.getByText('Sign out')).toBeInTheDocument();
	}}
>
	<WikiHeader
		user={{
			id: '1',
			name: 'Alice',
			email: 'alice@test.com',
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			image: null,
			username: null
		}}
	/>
</Story>

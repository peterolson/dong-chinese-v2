<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, within } from 'storybook/test';
	import FieldDiff from './field-diff.svelte';

	const { Story } = defineMeta({
		title: 'Wiki/FieldDiff',
		tags: ['autodocs']
	});
</script>

<Story
	name="NoChanges"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('No field changes detected.')).toBeInTheDocument();
	}}
>
	<FieldDiff
		character="人"
		editData={{ gloss: 'person', hint: 'a person standing' }}
		baseData={{ gloss: 'person', hint: 'a person standing' }}
	/>
</Story>

<Story
	name="TextFieldChange"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Gloss')).toBeInTheDocument();
		await expect(canvas.getByText('person')).toBeInTheDocument();
		await expect(canvas.getByText('human; person')).toBeInTheDocument();
	}}
>
	<FieldDiff character="人" editData={{ gloss: 'human; person' }} baseData={{ gloss: 'person' }} />
</Story>

<Story
	name="BooleanChange"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Verified')).toBeInTheDocument();
		await expect(canvas.getByText('No')).toBeInTheDocument();
		await expect(canvas.getByText('Yes')).toBeInTheDocument();
	}}
>
	<FieldDiff character="人" editData={{ isVerified: true }} baseData={{ isVerified: false }} />
</Story>

<Story
	name="ArrayChange"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Pinyin')).toBeInTheDocument();
		await expect(canvas.getByText('+ rěn')).toBeInTheDocument();
	}}
>
	<FieldDiff character="人" editData={{ pinyin: ['rén', 'rěn'] }} baseData={{ pinyin: ['rén'] }} />
</Story>

<Story
	name="CustomSourcesChange"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Sources')).toBeInTheDocument();
		// New source should be marked as added
		const addedBadge = canvas.getByText('+');
		await expect(addedBadge).toBeInTheDocument();
	}}
>
	<FieldDiff
		character="人"
		editData={{ customSources: ['Shuowen|https://example.com', 'New Source|https://new.com'] }}
		baseData={{ customSources: ['Shuowen|https://example.com'] }}
	/>
</Story>

<Story
	name="UnsafeUrlRenderedAsText"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Sources')).toBeInTheDocument();
		// Unsafe URL should render name as text, not as a link
		await expect(canvas.getByText('Evil Source')).toBeInTheDocument();
		const links = canvasElement.querySelectorAll('a[href^="javascript:"]');
		await expect(links.length).toBe(0);
	}}
>
	<FieldDiff
		character="人"
		editData={{ customSources: ['Evil Source|javascript:alert(1)'] }}
		baseData={{ customSources: null }}
	/>
</Story>

<Story
	name="ComponentChange"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Components')).toBeInTheDocument();
		// Added component should show with badge
		const addedBadge = canvas.getByText('+');
		await expect(addedBadge).toBeInTheDocument();
		await expect(canvas.getByText('乞')).toBeInTheDocument();
		await expect(canvas.getByText('Sound')).toBeInTheDocument();
	}}
>
	<FieldDiff
		character="吃"
		editData={{
			components: [
				{ character: '口', type: ['meaning'], hint: 'mouth' },
				{ character: '乞', type: ['sound'], hint: 'beg' }
			]
		}}
		baseData={{
			components: [{ character: '口', type: ['meaning'], hint: 'mouth' }]
		}}
	/>
</Story>

<Story
	name="NewFieldFromNull"
	play={async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByText('Hint')).toBeInTheDocument();
		await expect(canvas.getByText('a person standing')).toBeInTheDocument();
	}}
>
	<FieldDiff character="人" editData={{ hint: 'a person standing' }} baseData={{ hint: null }} />
</Story>

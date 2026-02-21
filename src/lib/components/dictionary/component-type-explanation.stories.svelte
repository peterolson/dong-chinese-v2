<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ComponentTypeExplanation from './component-type-explanation.svelte';
	import { getComponentTitle } from './component-colors';
	import { explainStoryData } from './component-type-explanation.stories.data';

	const { Story } = defineMeta({
		title: 'Dictionary/Component Type Explanations'
	});

	const allTypes = [
		'meaning',
		'sound',
		'iconic',
		'unknown',
		'simplified',
		'deleted',
		'remnant',
		'distinguishing'
	] as const;
</script>

<Story name="All Types">
	<div class="story-page">
		{#each allTypes as type (type)}
			<section class="type-section">
				<h2 class="type-heading" style:border-color={`var(--comp-${type})`}>
					{getComponentTitle(type)} component
				</h2>
				<ComponentTypeExplanation {type} characters={explainStoryData[type] ?? {}} />
			</section>
		{/each}
	</div>
</Story>

<Story name="All Types (Traditional)">
	<div class="story-page">
		{#each allTypes as type (type)}
			<section class="type-section">
				<h2 class="type-heading" style:border-color={`var(--comp-${type})`}>
					{getComponentTitle(type)} component
				</h2>
				<ComponentTypeExplanation
					{type}
					characters={explainStoryData[type] ?? {}}
					characterSet="traditional"
				/>
			</section>
		{/each}
	</div>
</Story>

<style>
	.story-page {
		max-width: 700px;
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.type-section {
		border-bottom: 1px solid var(--border);
		padding-bottom: 2rem;
	}

	.type-section:last-child {
		border-bottom: none;
	}

	.type-heading {
		border-left: 4px solid;
		padding-left: 0.75rem;
		margin-bottom: 1rem;
	}
</style>

<script lang="ts">
	import { resolve } from '$app/paths';
	import CharacterView from '$lib/components/dictionary/character-view.svelte';
	import EditStatusBadge from '$lib/components/wiki/edit-status-badge.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>{data.snapshot.character} — Edit Snapshot — Chinese Character Wiki</title>
</svelte:head>

<div class="snapshot-page">
	<a href={resolve(`/wiki/${data.snapshot.character}/history`)} class="back-link">
		&larr; Back to history
	</a>

	<div class="edit-meta">
		<EditStatusBadge status={data.editMeta.status} />
		<span class="meta-text">
			by {data.editMeta.editorName} &middot; {formatDate(data.editMeta.createdAt)}
		</span>
		{#if data.editMeta.reviewerName}
			<span class="meta-text">
				&middot; Reviewed by {data.editMeta.reviewerName}
				{#if data.editMeta.reviewedAt}
					on {formatDate(data.editMeta.reviewedAt)}
				{/if}
			</span>
		{/if}
	</div>

	{#if data.editMeta.editComment}
		<p class="edit-comment">{data.editMeta.editComment}</p>
	{/if}

	{#if data.editMeta.reviewComment}
		<p class="review-comment">Review: {data.editMeta.reviewComment}</p>
	{/if}

	{#if data.editMeta.changedFields}
		<p class="changed-fields">
			Changed fields: {data.editMeta.changedFields.join(', ')}
		</p>
	{/if}

	<div class="character-view-wrapper">
		<CharacterView
			character={data.snapshot}
			characterSet={data.settings.characterSet ?? 'simplified'}
			phoneticScript={data.settings.phoneticScript}
		/>
	</div>
</div>

<style>
	.snapshot-page {
		max-width: 800px;
	}

	.back-link {
		display: inline-block;
		font-size: 0.875rem;
		color: var(--secondary-soft);
		margin-bottom: 1rem;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.edit-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}

	.meta-text {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.edit-comment {
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.review-comment {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		font-style: italic;
		margin-bottom: 0.5rem;
	}

	.changed-fields {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin-bottom: 1rem;
	}

	.character-view-wrapper {
		border-top: 1px solid var(--border);
		padding-top: 1rem;
	}
</style>

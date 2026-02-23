<script lang="ts">
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
	<title>Recent Changes — Chinese Character Wiki</title>
</svelte:head>

<article class="recent-changes">
	<h1>Recent Changes</h1>

	{#if data.items.length === 0}
		<p class="empty">No edits have been made yet.</p>
	{:else}
		<ul class="edit-list">
			{#each data.items as item (item.id)}
				<li class="edit-item">
					<div class="edit-header">
						<a href="/wiki/{item.character}" class="edit-char">{item.character}</a>
						<EditStatusBadge status={item.status} />
						<span class="edit-meta">
							by {item.editorName} &middot; {formatDate(item.createdAt)}
						</span>
					</div>
					{#if item.editComment}
						<p class="edit-comment">{item.editComment}</p>
					{/if}
					{#if item.reviewerName}
						<p class="review-info">
							Reviewed by {item.reviewerName}
							{#if item.reviewedAt}
								&middot; {formatDate(item.reviewedAt)}
							{/if}
							{#if item.reviewComment}
								— {item.reviewComment}
							{/if}
						</p>
					{/if}
				</li>
			{/each}
		</ul>

		{#if data.totalPages > 1}
			<nav class="pagination" aria-label="Page navigation">
				{#if data.pageNum > 1}
					<a href="/wiki/recent-changes?page={data.pageNum - 1}" class="page-link">Previous</a>
				{:else}
					<span class="page-link disabled">Previous</span>
				{/if}
				<span class="page-info">Page {data.pageNum} of {data.totalPages}</span>
				{#if data.pageNum < data.totalPages}
					<a href="/wiki/recent-changes?page={data.pageNum + 1}" class="page-link">Next</a>
				{:else}
					<span class="page-link disabled">Next</span>
				{/if}
			</nav>
		{/if}
	{/if}
</article>

<style>
	.recent-changes {
		max-width: 70ch;
	}

	h1 {
		margin-bottom: 1.5rem;
	}

	.empty {
		color: var(--muted-foreground);
	}

	.edit-list {
		list-style: none;
		padding: 0;
	}

	.edit-item {
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
	}

	.edit-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.edit-char {
		font-size: 1.375rem;
		text-decoration: none;
	}

	.edit-char:hover {
		text-decoration: underline;
	}

	.edit-meta {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.edit-comment {
		margin-top: 0.25rem;
		font-size: 0.875rem;
	}

	.review-info {
		margin-top: 0.25rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.pagination {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.page-link {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.875rem;
		color: var(--secondary-soft);
		text-decoration: none;
	}

	.page-link:hover:not(.disabled) {
		background: var(--surface);
		text-decoration: none;
	}

	.page-link.disabled {
		color: var(--muted-foreground);
		opacity: 0.5;
		cursor: default;
	}

	.page-info {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}
</style>

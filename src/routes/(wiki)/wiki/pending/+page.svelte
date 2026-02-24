<script lang="ts">
	import { resolve } from '$app/paths';
	import EditStatusBadge from '$lib/components/wiki/edit-status-badge.svelte';
	import FieldDiff from '$lib/components/wiki/field-diff.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedId = $state<string | null>(null);

	function toggleExpand(id: string) {
		expandedId = expandedId === id ? null : id;
	}

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
	<title>Pending Edits — Chinese Character Wiki</title>
</svelte:head>

<article class="pending-page">
	<h1>Pending Edits</h1>

	{#if data.items.length === 0}
		<p class="empty">No edits pending review.</p>
	{:else}
		<p class="count">{data.items.length} edit{data.items.length === 1 ? '' : 's'} pending review</p>

		<ul class="edit-list">
			{#each data.items as item (item.id)}
				<li class="edit-item">
					<div class="edit-header">
						<a href={resolve(`/wiki/${item.character}`)} class="edit-char">{item.character}</a>
						<EditStatusBadge status="pending" />
						<span class="edit-meta">
							by {item.editorName} &middot; {formatDate(item.createdAt)}
						</span>
					</div>

					{#if item.editComment}
						<p class="edit-comment">{item.editComment}</p>
					{/if}

					<div class="edit-actions">
						<button type="button" class="expand-button" onclick={() => toggleExpand(item.id)}>
							{expandedId === item.id ? 'Hide changes' : 'Show changes'}
						</button>
					</div>

					{#if expandedId === item.id}
						<div class="diff-panel">
							<FieldDiff editData={item} baseData={null} character={item.character} />
						</div>
					{/if}

					<div class="review-actions">
						<form method="post" action="?/approve" class="inline-form">
							<input type="hidden" name="editId" value={item.id} />
							<button type="submit" class="approve-button">Approve</button>
						</form>
						<form method="post" action="?/reject" class="inline-form">
							<input type="hidden" name="editId" value={item.id} />
							<input
								type="text"
								name="rejectComment"
								placeholder="Reason for rejection..."
								required
								class="reject-input"
							/>
							<button type="submit" class="reject-button">Reject</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</article>

<style>
	.pending-page {
		max-width: 70ch;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	.empty {
		color: var(--muted-foreground);
		margin-top: 1rem;
	}

	.count {
		color: var(--muted-foreground);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.edit-list {
		list-style: none;
		padding: 0;
	}

	.edit-item {
		padding: 1rem 0;
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

	.edit-actions {
		margin-top: 0.5rem;
	}

	.expand-button {
		background: none;
		border: none;
		color: var(--secondary-soft);
		font-size: 0.8125rem;
		cursor: pointer;
		padding: 0;
		text-decoration: underline;
	}

	.expand-button:hover {
		opacity: 0.8;
	}

	.diff-panel {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.review-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-top: 0.75rem;
		flex-wrap: wrap;
	}

	.inline-form {
		display: flex;
		gap: 0.375rem;
		align-items: center;
	}

	.approve-button {
		padding: 0.375rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid var(--success);
		border-radius: var(--radius);
		background: var(--success-bg);
		color: var(--success);
		cursor: pointer;
	}

	.approve-button:hover {
		opacity: 0.9;
	}

	.reject-input {
		padding: 0.375rem 0.5rem;
		font-size: 0.875rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
	}

	.reject-input:focus {
		outline: 2px solid var(--secondary-soft);
		outline-offset: -1px;
	}

	.reject-button {
		padding: 0.375rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid var(--error);
		border-radius: var(--radius);
		background: var(--error-bg);
		color: var(--error);
		cursor: pointer;
	}

	.reject-button:hover {
		opacity: 0.9;
	}
</style>

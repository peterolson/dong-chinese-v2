<script lang="ts">
	import { resolve } from '$app/paths';
	import EditStatusBadge from './edit-status-badge.svelte';
	import FieldDiff from './field-diff.svelte';
	import type { Snippet } from 'svelte';

	const FIELD_LABELS: Record<string, string> = {
		gloss: 'gloss',
		hint: 'hint',
		originalMeaning: 'original meaning',
		isVerified: 'verified',
		pinyin: 'pinyin',
		simplifiedVariants: 'simplified',
		traditionalVariants: 'traditional',
		components: 'components',
		strokeDataSimp: 'strokes (simp)',
		strokeDataTrad: 'strokes (trad)',
		fragmentsSimp: 'fragments (simp)',
		fragmentsTrad: 'fragments (trad)',
		historicalImages: 'images',
		historicalPronunciations: 'pronunciations',
		customSources: 'sources',
		strokeCountSimp: 'stroke count (simp)',
		strokeCountTrad: 'stroke count (trad)'
	};

	interface EditItem {
		id: string;
		character: string;
		status: string;
		editComment: string;
		editorName: string;
		reviewerName: string | null;
		reviewComment: string | null;
		createdAt: string;
		reviewedAt: string | null;
		changedFields: string[] | null;
		[key: string]: unknown;
	}

	let {
		items,
		baseDataMap,
		showCharacter = true,
		pageNum = 1,
		totalPages = 1,
		paginationUrl = null,
		actions
	}: {
		items: EditItem[];
		baseDataMap: Record<string, Record<string, unknown>>;
		showCharacter?: boolean;
		pageNum?: number;
		totalPages?: number;
		paginationUrl?: string | null;
		actions?: Snippet<[EditItem]>;
	} = $props();

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function changedFieldLabels(fields: string[] | null): string {
		if (!fields || fields.length === 0) return '';
		return fields.map((f) => FIELD_LABELS[f] ?? f).join(', ');
	}
</script>

{#if items.length === 0}
	<p class="empty">No edits found.</p>
{:else}
	<ul class="edit-list">
		{#each items as item (item.id)}
			{@const baseData = baseDataMap[item.character] ?? null}
			<li class="edit-item">
				<div class="edit-header">
					{#if showCharacter}
						<a href={resolve(`/wiki/${item.character}`)} class="edit-char">{item.character}</a>
					{/if}
					{#if !item.reviewerName || item.status === 'pending'}
						<EditStatusBadge status={item.status} />
					{/if}
					{#if item.changedFields && item.changedFields.length > 0}
						<span class="changed-fields">{changedFieldLabels(item.changedFields)}</span>
					{/if}
					<span class="edit-meta">
						by {item.editorName} &middot; {formatDate(item.createdAt)}
					</span>
					{#if item.editComment}
						<span class="edit-comment">&ldquo;{item.editComment}&rdquo;</span>
					{/if}
				</div>

				{#if item.reviewerName && item.status !== 'pending'}
					<div class="review-info">
						<EditStatusBadge status={item.status} />
						by {item.reviewerName}
						{#if item.reviewedAt}
							&middot; {formatDate(item.reviewedAt)}
						{/if}
						{#if item.reviewComment}
							— {item.reviewComment}
						{/if}
					</div>
				{/if}

				<details class="diff-details">
					<summary class="diff-toggle">Show changes</summary>
					<div class="diff-panel">
						<FieldDiff
							editData={item}
							{baseData}
							character={item.character}
							changedFields={item.changedFields}
						/>
					</div>
				</details>

				{#if actions}
					{@render actions(item)}
				{/if}
			</li>
		{/each}
	</ul>

	{#if totalPages > 1 && paginationUrl}
		<nav class="pagination" aria-label="Page navigation">
			{#if pageNum > 1}
				<a href={resolve(`${paginationUrl}?page=${pageNum - 1}`)} class="page-link">Previous</a>
			{:else}
				<span class="page-link disabled">Previous</span>
			{/if}
			<span class="page-info">Page {pageNum} of {totalPages}</span>
			{#if pageNum < totalPages}
				<a href={resolve(`${paginationUrl}?page=${pageNum + 1}`)} class="page-link">Next</a>
			{:else}
				<span class="page-link disabled">Next</span>
			{/if}
		</nav>
	{/if}
{/if}

<style>
	.empty {
		color: var(--muted-foreground);
	}

	.edit-list {
		list-style: none;
		padding: 0;
	}

	.edit-item {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border);
	}

	.edit-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.edit-char {
		font-size: 1.375rem;
		text-decoration: none;
	}

	.edit-char:hover {
		text-decoration: underline;
	}

	.changed-fields {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.edit-meta {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.edit-comment {
		font-size: 0.8125rem;
		font-style: italic;
		color: var(--muted-foreground);
	}

	.review-info {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
		margin-top: 0.125rem;
	}

	.diff-details {
		margin-top: 0.25rem;
	}

	.diff-toggle {
		font-size: 0.8125rem;
		color: var(--secondary-soft);
		cursor: pointer;
	}

	.diff-toggle:hover {
		opacity: 0.8;
	}

	.diff-panel {
		margin-top: 0.5rem;
		padding: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
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

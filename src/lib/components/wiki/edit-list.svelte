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
		baselineMap,
		showCharacter = true,
		pageNum = 1,
		totalPages = 1,
		paginationUrl = null,
		actions,
		secondaryActions
	}: {
		items: EditItem[];
		baselineMap: Record<string, Record<string, unknown>>;
		showCharacter?: boolean;
		pageNum?: number;
		totalPages?: number;
		paginationUrl?: string | null;
		actions?: Snippet<[EditItem]>;
		secondaryActions?: Snippet<[EditItem]>;
	} = $props();

	function formatDate(iso: string): string {
		const d = new Date(iso);
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${d.getFullYear()}/${m}/${day}`;
	}

	function formatDateFull(iso: string): string {
		return new Date(iso).toLocaleString('en-US', {
			year: 'numeric',
			month: 'long',
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
			{@const baseData = baselineMap[item.id] ?? null}
			{@const reviewed = item.status !== 'pending'}
			{@const differentReviewer =
				reviewed && item.reviewerName && item.reviewerName !== item.editorName}
			<li class="edit-item">
				<div class="edit-header">
					{#if showCharacter}
						<a href={resolve(`/wiki/${item.character}`)} class="edit-char">{item.character}</a>
					{/if}
					{#if !reviewed}
						<EditStatusBadge status="pending" />
					{/if}
					<span class="edit-meta"
						><time datetime={item.createdAt} title={formatDateFull(item.createdAt)}
							>{formatDate(item.createdAt)}</time
						>
						&middot; {item.editorName}</span
					>
					<span class="edit-comment-inline">{item.editComment ?? ''}</span>
					{#if reviewed}
						<span class="review-info" data-status={item.status}>
							<span
								class="reviewer"
								title="{item.status}{differentReviewer
									? ` by ${item.reviewerName}`
									: ''}{item.reviewedAt ? ` · ${formatDateFull(item.reviewedAt)}` : ''}"
								><span class="reviewer-icon"
									>{item.status === 'approved' ? '\u2713' : '\u2717'}</span
								>{#if differentReviewer}{item.reviewerName}{/if}</span
							>
							{#if item.reviewComment}
								<span class="review-comment">&ldquo;{item.reviewComment}&rdquo;</span>
							{/if}
						</span>
					{/if}
					<details class="diff-details">
						<summary class="diff-toggle">Show changes</summary>
					</details>
					{#if actions}
						<div class="header-actions">
							{@render actions(item)}
						</div>
					{/if}
				</div>

				{#if secondaryActions}
					<div class="secondary-actions">
						{@render secondaryActions(item)}
					</div>
				{/if}

				<div class="diff-panel-wrapper">
					<div class="diff-panel">
						{#if item.editComment}
							<p class="diff-comment">&ldquo;{item.editComment}&rdquo;</p>
						{/if}
						{#if item.changedFields && item.changedFields.length > 0}
							<p class="changed-fields">Changed: {changedFieldLabels(item.changedFields)}</p>
						{/if}
						<FieldDiff
							editData={item}
							{baseData}
							character={item.character}
							changedFields={item.changedFields}
						/>
					</div>
				</div>
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
		padding: 0.375rem 0;
		border-bottom: 1px solid var(--border);
	}

	.edit-header {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.edit-char {
		font-size: 1.125rem;
		text-decoration: none;
	}

	.edit-char:hover {
		text-decoration: underline;
	}

	.edit-meta {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		white-space: nowrap;
	}

	.review-info {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-end;
		flex-shrink: 0;
		gap: 0.0625rem;
	}

	.reviewer {
		font-size: 0.75rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.review-info[data-status='approved'] .reviewer {
		color: var(--success);
	}

	.review-info[data-status='rejected'] .reviewer {
		color: var(--error);
	}

	.reviewer-icon {
		margin-right: 0.125rem;
	}

	.review-comment {
		font-size: 0.6875rem;
		font-style: italic;
		color: var(--muted-foreground);
	}

	.edit-comment-inline {
		flex: 1 1 0;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.75rem;
		font-style: italic;
		color: var(--muted-foreground);
	}

	.diff-details {
		display: inline;
		flex-shrink: 0;
	}

	.diff-toggle {
		color: var(--secondary-soft);
		cursor: pointer;
		font-size: 0.75rem;
		white-space: nowrap;
	}

	.diff-toggle:hover {
		opacity: 0.8;
	}

	.header-actions {
		flex-shrink: 0;
		margin-left: auto;
	}

	.secondary-actions {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.25rem;
	}

	.diff-panel-wrapper {
		display: none;
	}

	.edit-item:has(.diff-details[open]) .diff-panel-wrapper {
		display: block;
	}

	.diff-panel {
		margin-top: 0.375rem;
		padding: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.diff-comment {
		font-size: 0.8125rem;
		font-style: italic;
		color: var(--muted-foreground);
		margin: 0 0 0.5rem;
	}

	.changed-fields {
		font-size: 0.75rem;
		color: var(--muted-foreground);
		margin: 0 0 0.5rem;
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

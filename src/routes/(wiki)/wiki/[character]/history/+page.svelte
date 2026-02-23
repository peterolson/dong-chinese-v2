<script lang="ts">
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

{#if data.edits.length === 0}
	<p class="empty">No edits have been made to this character.</p>
{:else}
	<ul class="timeline">
		{#each data.edits as edit, i (edit.id)}
			{@const baseData = i < data.edits.length - 1 ? data.edits[i + 1] : data.charBase}
			<li class="timeline-entry">
				<div class="entry-header">
					<EditStatusBadge status={edit.status} />
					<span class="entry-meta">
						by {edit.editorName} &middot; {formatDate(edit.createdAt)}
					</span>
				</div>

				{#if edit.editComment}
					<p class="entry-comment">{edit.editComment}</p>
				{/if}

				{#if edit.reviewerName}
					<p class="review-info">
						Reviewed by {edit.reviewerName}
						{#if edit.reviewedAt}
							&middot; {formatDate(edit.reviewedAt)}
						{/if}
						{#if edit.reviewComment}
							— {edit.reviewComment}
						{/if}
					</p>
				{/if}

				<div class="entry-actions">
					<button type="button" class="expand-button" onclick={() => toggleExpand(edit.id)}>
						{expandedId === edit.id ? 'Hide changes' : 'Show changes'}
					</button>

					{#if data.canReview}
						<!-- No-JS: Inline form that POSTs directly -->
						<details class="rollback-details">
							<summary class="rollback-trigger">Rollback to this version</summary>
							<form method="post" action="?/rollback" class="rollback-form">
								<input type="hidden" name="editId" value={edit.id} />
								<label class="rollback-label">
									<span>Comment (required):</span>
									<input
										type="text"
										name="rollbackComment"
										required
										placeholder="Reason for rollback..."
										class="rollback-input"
									/>
								</label>
								<button type="submit" class="rollback-button">Confirm Rollback</button>
							</form>
						</details>
					{/if}
				</div>

				{#if expandedId === edit.id}
					<div class="diff-panel">
						<FieldDiff editData={edit} {baseData} character={data.character.character} />
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.empty {
		color: var(--muted-foreground);
	}

	.timeline {
		list-style: none;
		padding: 0;
	}

	.timeline-entry {
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
	}

	.entry-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.entry-meta {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.entry-comment {
		margin-top: 0.25rem;
		font-size: 0.875rem;
	}

	.review-info {
		margin-top: 0.25rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.entry-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
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

	.rollback-details {
		font-size: 0.8125rem;
	}

	.rollback-trigger {
		color: var(--secondary-soft);
		cursor: pointer;
	}

	.rollback-form {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.rollback-label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		font-size: 0.8125rem;
	}

	.rollback-input {
		padding: 0.375rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
		font-size: 0.8125rem;
	}

	.rollback-input:focus {
		outline: 2px solid var(--primary-soft);
		outline-offset: -1px;
	}

	.rollback-button {
		align-self: flex-start;
		padding: 0.25rem 0.75rem;
		font-size: 0.8125rem;
		font-weight: 500;
		border: 1px solid var(--warning);
		border-radius: var(--radius);
		background: var(--warning-bg);
		color: var(--warning);
		cursor: pointer;
	}

	.rollback-button:hover {
		opacity: 0.9;
	}

	.diff-panel {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
</style>

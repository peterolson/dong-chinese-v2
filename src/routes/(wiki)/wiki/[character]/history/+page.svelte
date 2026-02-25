<script lang="ts">
	import { resolve } from '$app/paths';
	import EditList from '$lib/components/wiki/edit-list.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

{#if data.edits.length === 0}
	<p class="empty">No edits have been made to this character.</p>
{:else}
	<EditList
		items={data.edits}
		baselineMap={data.baselineMap}
		showCharacter={false}
		pageNum={data.pageNum}
		totalPages={data.totalPages}
		paginationUrl={`/wiki/${data.character.character}/history`}
	>
		{#snippet actions(item)}
			<a
				href={resolve(`/wiki/${data.character.character}/history/${item.id}`)}
				class="view-entry-link"
			>
				View full entry
			</a>

			{#if data.canReview && item.status === 'pending'}
				<div class="review-actions">
					<form method="post" action="?/approveEdit" class="inline-form">
						<input type="hidden" name="editId" value={item.id} />
						<button type="submit" class="approve-button">Approve</button>
					</form>
					<form method="post" action="?/rejectEdit" class="inline-form">
						<input type="hidden" name="editId" value={item.id} />
						<label class="reject-label">
							<input
								type="text"
								name="rejectComment"
								placeholder="Reason for rejection..."
								required
								class="reject-input"
							/>
						</label>
						<button type="submit" class="reject-button">Reject</button>
					</form>
				</div>
			{/if}

			{#if data.canReview && item.status === 'approved'}
				<details class="rollback-details">
					<summary class="rollback-trigger">Rollback to this version</summary>
					<form method="post" action="?/rollback" class="rollback-form">
						<input type="hidden" name="editId" value={item.id} />
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
		{/snippet}
	</EditList>
{/if}

<style>
	.empty {
		color: var(--muted-foreground);
	}

	.view-entry-link {
		display: inline-block;
		font-size: 0.8125rem;
		color: var(--secondary-soft);
		margin-top: 0.25rem;
	}

	.view-entry-link:hover {
		text-decoration: underline;
	}

	.review-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}

	.inline-form {
		display: flex;
		gap: 0.375rem;
		align-items: center;
	}

	.approve-button {
		padding: 0.25rem 0.75rem;
		font-size: 0.8125rem;
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
		padding: 0.25rem 0.5rem;
		font-size: 0.8125rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
	}

	.reject-label {
		display: contents;
	}

	.reject-button {
		padding: 0.25rem 0.75rem;
		font-size: 0.8125rem;
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

	.rollback-details {
		font-size: 0.8125rem;
		margin-top: 0.25rem;
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
		outline: 2px solid var(--secondary-soft);
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
</style>

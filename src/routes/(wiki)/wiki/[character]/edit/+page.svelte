<script lang="ts">
	import CharEditForm from '$lib/components/wiki/char-edit-form.svelte';
	import Alert from '$lib/components/ui/alert.svelte';
	import EditStatusBadge from '$lib/components/wiki/edit-status-badge.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

{#if form?.error}
	<div class="form-error">
		<Alert variant="error">{form.error}</Alert>
	</div>
{/if}

{#if data.pendingEdits.length > 0}
	<section class="pending-section">
		<h2>Pending Edits ({data.pendingEdits.length})</h2>
		<ul class="pending-list">
			{#each data.pendingEdits as edit (edit.id)}
				<li class="pending-item">
					<div class="pending-info">
						<EditStatusBadge status="pending" />
						<span>by {edit.editorName} &middot; {formatDate(edit.createdAt)}</span>
					</div>
					{#if edit.editComment}
						<p class="pending-comment">{edit.editComment}</p>
					{/if}
					{#if data.canReview}
						<div class="review-actions">
							<form method="post" action="?/approveEdit" class="inline-form">
								<input type="hidden" name="editId" value={edit.id} />
								<button type="submit" class="approve-button">Approve</button>
							</form>
							<form method="post" action="?/rejectEdit" class="inline-form">
								<input type="hidden" name="editId" value={edit.id} />
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
				</li>
			{/each}
		</ul>
	</section>
{/if}

<CharEditForm character={data.character} canReview={data.canReview} />

<style>
	.form-error {
		max-width: 800px;
		margin-bottom: 1rem;
	}

	.pending-section {
		margin-bottom: 2rem;
		padding: 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.pending-section h2 {
		margin-bottom: 0.75rem;
	}

	.pending-list {
		list-style: none;
		padding: 0;
	}

	.pending-item {
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--border);
	}

	.pending-item:last-child {
		border-bottom: none;
	}

	.pending-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.pending-comment {
		font-size: 0.875rem;
		margin-top: 0.25rem;
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
</style>

<script lang="ts">
	import EditList from '$lib/components/wiki/edit-list.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

{#if data.edits.length === 0}
	<p class="empty">No edits have been made to this character.</p>
{:else}
	<EditList
		items={data.edits}
		baseDataMap={data.charBaseDataMap}
		showCharacter={false}
		pageNum={data.pageNum}
		totalPages={data.totalPages}
		paginationUrl={`/wiki/${data.character.character}/history`}
	>
		{#snippet actions(item)}
			{#if data.canReview}
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

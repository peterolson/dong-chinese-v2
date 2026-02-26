<script lang="ts">
	import { resolve } from '$app/paths';
	import EditList from '$lib/components/wiki/edit-list.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Build baselineMap keyed by edit id (EditList expects this shape)
	const baselineMap = $derived.by(() => {
		const map: Record<string, Record<string, unknown>> = {};
		for (const item of data.items) {
			map[item.id] = data.charBaseDataMap[item.character] ?? {};
		}
		return map;
	});
</script>

<svelte:head>
	<title>{data.canReview ? 'Review Queue' : 'My Pending Edits'} — Chinese Character Wiki</title>
</svelte:head>

<article class="pending-page">
	<h1>{data.canReview ? 'Review Queue' : 'My Pending Edits'}</h1>

	{#if data.items.length > 0}
		<p class="count">
			{data.items.length} edit{data.items.length === 1 ? '' : 's'}
			{data.canReview ? 'pending review' : 'pending'}
		</p>
	{/if}

	<EditList items={data.items} {baselineMap} showCharacter={true}>
		{#snippet actions(item)}
			{#if data.canReview}
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
							placeholder="Reason..."
							required
							class="reject-input"
						/>
						<button type="submit" class="reject-button">Reject</button>
					</form>
				</div>
			{:else}
				<a href={resolve(`/wiki/${item.character}/edit`)} class="edit-link">Edit</a>
			{/if}
		{/snippet}
	</EditList>
</article>

<style>
	.pending-page {
		max-width: 70ch;
	}

	h1 {
		font-size: 1.25rem;
		margin-bottom: 0.75rem;
	}

	.count {
		color: var(--muted-foreground);
		font-size: 0.875rem;
		margin-bottom: 1rem;
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

	.reject-input:focus {
		outline: 2px solid var(--secondary-soft);
		outline-offset: -1px;
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

	.edit-link {
		font-size: 0.8125rem;
		color: var(--secondary-soft);
	}

	.edit-link:hover {
		text-decoration: underline;
	}
</style>

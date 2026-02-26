<script lang="ts">
	import { resolve } from '$app/paths';

	interface Props {
		currentPage: number;
		totalPages: number;
		href: (page: number) => string;
	}

	let { currentPage, totalPages, href }: Props = $props();

	type PageItem = { type: 'page'; page: number } | { type: 'ellipsis' };

	const pages = $derived.by((): PageItem[] => {
		if (totalPages <= 1) return [];

		const items: PageItem[] = [];
		const show = [
			1,
			currentPage - 2,
			currentPage - 1,
			currentPage,
			currentPage + 1,
			currentPage + 2,
			totalPages
		]
			.filter((p) => p >= 1 && p <= totalPages)
			.sort((a, b) => a - b)
			.filter((p, i, arr) => i === 0 || p !== arr[i - 1]);

		for (let i = 0; i < show.length; i++) {
			if (i > 0 && show[i] - show[i - 1] > 1) {
				items.push({ type: 'ellipsis' });
			}
			items.push({ type: 'page', page: show[i] });
		}

		return items;
	});

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const input = form.elements.namedItem('page') as HTMLInputElement;
		const page = parseInt(input.value, 10);
		if (page >= 1 && page <= totalPages) {
			window.location.href = resolve(href(page));
		}
	}
</script>

{#if pages.length > 0}
	<nav class="pagination" aria-label="Pagination">
		<div class="page-numbers">
			{#each pages as item, i (item.type === 'page' ? item.page : `ellipsis-${i}`)}
				{#if item.type === 'ellipsis'}
					<span class="ellipsis" aria-hidden="true">&hellip;</span>
				{:else if item.page === currentPage}
					<span class="page-number current" aria-current="page">{item.page}</span>
				{:else}
					<a href={resolve(href(item.page))} class="page-number">{item.page}</a>
				{/if}
			{/each}
		</div>
		<form class="go-to-page" method="get" onsubmit={handleSubmit}>
			<label>
				<span class="sr-only">Go to page</span>
				<input
					type="number"
					name="page"
					min="1"
					max={totalPages}
					placeholder="#"
					aria-label="Page number"
				/>
			</label>
			<button type="submit">Go</button>
		</form>
	</nav>
{/if}

<style>
	.pagination {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.page-numbers {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.page-number {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.75rem;
		height: 1.75rem;
		padding: 0 0.375rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.8125rem;
		text-decoration: none;
		color: var(--secondary-soft);
	}

	a.page-number:hover {
		background: var(--surface);
		text-decoration: none;
	}

	.page-number.current {
		background: var(--secondary-soft);
		border-color: var(--secondary-soft);
		color: var(--primary-foreground);
		font-weight: 600;
	}

	.ellipsis {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.75rem;
		height: 1.75rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.go-to-page {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.go-to-page input {
		width: 3.5rem;
		height: 1.75rem;
		padding: 0 0.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.8125rem;
		text-align: center;
		background: var(--background);
		color: var(--foreground);
	}

	.go-to-page input:focus {
		outline: 2px solid var(--secondary-soft);
		outline-offset: -1px;
	}

	.go-to-page button {
		height: 1.75rem;
		padding: 0 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.8125rem;
		background: var(--surface);
		color: var(--foreground);
	}

	.go-to-page button:hover {
		background: var(--surface-hover);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}
</style>

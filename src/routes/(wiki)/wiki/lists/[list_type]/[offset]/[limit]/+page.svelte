<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const hasPrev = $derived(data.offset > 0);
	const hasNext = $derived(data.offset + data.limit < data.total);
	const prevHref = $derived(
		`/wiki/lists/${data.listType}/${Math.max(0, data.offset - data.limit)}/${data.limit}`
	);
	const nextHref = $derived(
		`/wiki/lists/${data.listType}/${data.offset + data.limit}/${data.limit}`
	);
	const startRank = $derived(data.offset + 1);
	const endRank = $derived(Math.min(data.offset + data.limit, data.total));
</script>

<svelte:head>
	<title>{data.listLabel} ({startRank}–{endRank}) — Dong Chinese Wiki</title>
</svelte:head>

<article class="list-page">
	<h1>{data.listLabel}</h1>

	<p class="range-info">
		Showing {startRank}–{endRank} of {data.total.toLocaleString()} characters
	</p>

	<nav class="pagination" aria-label="List navigation">
		{#if hasPrev}
			<a href={prevHref} class="page-link">Previous {data.limit}</a>
		{:else}
			<span class="page-link disabled">Previous {data.limit}</span>
		{/if}
		{#if hasNext}
			<a href={nextHref} class="page-link">Next {data.limit}</a>
		{:else}
			<span class="page-link disabled">Next {data.limit}</span>
		{/if}
	</nav>

	<table class="char-list-table">
		<thead>
			<tr>
				<th class="rank-col">#</th>
				<th class="char-col">Character</th>
				<th>Pinyin</th>
				<th>Gloss</th>
				{#if data.listType === 'subtlex-rank' || data.listType === 'subtlex-context-diversity'}
					<th class="num-col">Movies/M</th>
				{/if}
				{#if data.listType === 'subtlex-context-diversity'}
					<th class="num-col">Context Div.</th>
				{/if}
				{#if data.listType === 'jun-da-rank'}
					<th class="num-col">Books/M</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each data.items as item, i (item.character)}
				<tr>
					<td class="rank-col">{data.offset + i + 1}</td>
					<td class="char-col">
						<a href="/wiki/{item.character}">{item.character}</a>
						{#if item.traditionalVariants?.length}
							<span class="variants" lang="zh-Hant">({item.traditionalVariants.join(', ')})</span>
						{/if}
					</td>
					<td>{item.pinyin?.join(', ') ?? ''}</td>
					<td>{item.gloss ?? ''}</td>
					{#if data.listType === 'subtlex-rank' || data.listType === 'subtlex-context-diversity'}
						<td class="num-col">{item.subtlexPerMillion?.toFixed(1) ?? '—'}</td>
					{/if}
					{#if data.listType === 'subtlex-context-diversity'}
						<td class="num-col">{item.subtlexContextDiversity ?? '—'}</td>
					{/if}
					{#if data.listType === 'jun-da-rank'}
						<td class="num-col">{item.junDaPerMillion?.toFixed(1) ?? '—'}</td>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>

	<nav class="pagination bottom" aria-label="List navigation">
		{#if hasPrev}
			<a href={prevHref} class="page-link">Previous {data.limit}</a>
		{:else}
			<span class="page-link disabled">Previous {data.limit}</span>
		{/if}
		{#if hasNext}
			<a href={nextHref} class="page-link">Next {data.limit}</a>
		{:else}
			<span class="page-link disabled">Next {data.limit}</span>
		{/if}
	</nav>
</article>

<style>
	.list-page {
		max-width: 900px;
	}

	h1 {
		margin-bottom: 0.5rem;
	}

	.range-info {
		color: var(--muted-foreground);
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.pagination {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.pagination.bottom {
		margin-top: 1rem;
		margin-bottom: 0;
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

	.char-list-table {
		width: 100%;
		border-collapse: collapse;
	}

	.char-list-table th {
		text-align: left;
		padding: 0.5rem 0.75rem;
		border-bottom: 2px solid var(--border);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.char-list-table td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.rank-col {
		width: 3rem;
		color: var(--muted-foreground);
	}

	.char-col {
		font-size: 1.25rem;
	}

	.char-col a {
		text-decoration: none;
	}

	.char-col a:hover {
		text-decoration: underline;
	}

	.variants {
		font-size: 0.875rem;
		color: var(--muted-foreground);
	}

	.num-col {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
</style>

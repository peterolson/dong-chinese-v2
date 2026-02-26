<script lang="ts">
	import { resolve } from '$app/paths';
	import Pagination from '$lib/components/ui/pagination.svelte';
	import { formatPinyinList } from '$lib/orthography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const currentPage = $derived(Math.floor(data.offset / data.limit) + 1);
	const totalPages = $derived(Math.ceil(data.total / data.limit));
	const paginationHref = $derived(
		(page: number) => `/wiki/lists/${data.listType}/${(page - 1) * data.limit}/${data.limit}`
	);
	const startRank = $derived(data.offset + 1);
	const endRank = $derived(Math.min(data.offset + data.limit, data.total));

	const showMoviesPerMillion = $derived(data.listType === 'movie-count');
	const showMoviePercentage = $derived(data.listType === 'movie-contexts');
	const showBooksPerMillion = $derived(data.listType === 'book-count');
	const showLevel = $derived(data.listType === 'hsk' || data.listType === 'hsk-3');
	const showUsageCount = $derived(data.listType === 'components');
	const showCumulative = $derived(
		data.listType === 'movie-count' || data.listType === 'book-count'
	);

	function uniqueChars(item: (typeof data.items)[number]): string[] {
		const trad = data.settings.characterSet === 'traditional';
		const primary = trad ? (item.traditionalVariants ?? []) : [item.character];
		const secondary = trad ? [item.character] : (item.traditionalVariants ?? []);
		const result: string[] = [];
		for (const c of [...primary, ...secondary]) {
			if (!result.includes(c)) {
				result.push(c);
			}
		}
		return result;
	}
</script>

<svelte:head>
	<title>{data.listLabel} ({startRank}–{endRank}) — Character Lists</title>
</svelte:head>

<article class="list-page">
	<nav class="list-nav" aria-label="List types">
		{#each data.allLists as list (list.slug)}
			{#if list.slug === data.listType}
				<span class="list-pill active">{list.navLabel}</span>
			{:else}
				<a href={resolve(`/wiki/lists/${list.slug}/0/${data.limit}`)} class="list-pill"
					>{list.navLabel}</a
				>
			{/if}
		{/each}
	</nav>

	<h2>{data.listLabel}</h2>
	<p class="list-description">{data.listDescription}</p>

	<p class="range-info">
		Showing {startRank}–{endRank} of {data.total.toLocaleString()} characters
	</p>

	<Pagination {currentPage} {totalPages} href={paginationHref} />

	<div class="table-scroll">
		<table class="char-list-table">
			<thead>
				<tr>
					<th class="rank-col">#</th>
					<th class="char-col">Character</th>
					<th>Pinyin</th>
					<th>Gloss</th>
					{#if showMoviePercentage}
						<th class="num-col">% of Movies</th>
					{/if}
					{#if showMoviesPerMillion}
						<th class="num-col">Uses/M</th>
					{/if}
					{#if showBooksPerMillion}
						<th class="num-col">Uses/M</th>
					{/if}
					{#if showCumulative}
						<th class="num-col">Cum. Freq</th>
					{/if}
					{#if showLevel}
						<th class="num-col">Level</th>
					{/if}
					{#if showUsageCount}
						<th class="num-col">Uses</th>
					{/if}
					<th class="verified-col">Verified</th>
				</tr>
			</thead>
			<tbody>
				{#each data.items as item, i (item.character)}
					<tr>
						<td class="rank-col">{data.offset + i + 1}</td>
						<td class="char-col">
							{#if showUsageCount && item.variants?.length}
								<a href={resolve(`/wiki/${item.character}`)}>{item.character}</a>
								{#each item.variants as v (v)}
									<a href={resolve(`/wiki/${v}`)}>{v}</a>
								{/each}
							{:else}
								{#each uniqueChars(item) as char (char)}
									<a href={resolve(`/wiki/${char}`)}>{char}</a>
								{/each}
							{/if}
						</td>
						<td>{formatPinyinList(item.pinyin, data.settings.phoneticScript)}</td>
						<td>{item.gloss ?? ''}</td>
						{#if showMoviePercentage}
							<td class="num-col">{item.moviePercentage?.toFixed(1) ?? '—'}%</td>
						{/if}
						{#if showMoviesPerMillion}
							<td class="num-col">{item.subtlexPerMillion?.toFixed(1) ?? '—'}</td>
						{/if}
						{#if showBooksPerMillion}
							<td class="num-col">{item.junDaPerMillion?.toFixed(1) ?? '—'}</td>
						{/if}
						{#if showCumulative}
							<td class="num-col">{item.cumulativePercent ?? '—'}%</td>
						{/if}
						{#if showLevel}
							<td class="num-col">{item.level ?? '—'}</td>
						{/if}
						{#if showUsageCount}
							<td class="num-col">{item.usageCount?.toLocaleString() ?? '—'}</td>
						{/if}
						{#if item.isVerified}
							<td class="verified-col verified">✓</td>
						{:else}
							<td class="verified-col unverified">⚠</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="pagination-bottom">
		<Pagination {currentPage} {totalPages} href={paginationHref} />
	</div>
</article>

<style>
	.list-page {
		max-width: 900px;
	}

	.list-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-bottom: 1.25rem;
	}

	.list-pill {
		display: inline-block;
		padding: 0.3rem 0.7rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 0.8125rem;
		color: var(--foreground);
		text-decoration: none;
		background: var(--background);
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.list-pill:hover:not(.active) {
		background: var(--surface);
		border-color: var(--secondary-soft);
		text-decoration: none;
	}

	.list-pill.active {
		background: var(--secondary-soft);
		border-color: var(--secondary-soft);
		color: var(--primary-foreground);
	}

	h2 {
		font-size: 1.25rem;
		margin-bottom: 0.25rem;
	}

	.list-description {
		color: var(--muted-foreground);
		font-size: 0.8125rem;
		margin-bottom: 0.75rem;
	}

	.range-info {
		color: var(--muted-foreground);
		font-size: 0.8125rem;
		margin-bottom: 0.75rem;
	}

	.pagination-bottom {
		margin-top: 1rem;
	}

	.char-list-table {
		width: 100%;
		border-collapse: collapse;
	}

	.table-scroll {
		overflow-x: auto;
	}

	.char-list-table {
		font-size: 0.8125rem;
	}

	.char-list-table th {
		text-align: left;
		padding: 0.3rem 0.5rem;
		border-bottom: 2px solid var(--border);
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.char-list-table td {
		padding: 0.25rem 0.5rem;
		border-bottom: 1px solid var(--border);
	}

	.rank-col {
		width: 2.5rem;
		color: var(--muted-foreground);
	}

	.char-col {
		font-size: 1.05rem;
	}

	.char-col a {
		text-decoration: none;
	}

	.char-col a:hover {
		text-decoration: underline;
	}

	.num-col {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	th.num-col {
		text-align: right;
	}

	.verified-col {
		width: 4rem;
		text-align: center;
	}

	.verified-col.verified {
		color: var(--success);
	}

	.verified-col.unverified {
		color: var(--warning);
	}
</style>

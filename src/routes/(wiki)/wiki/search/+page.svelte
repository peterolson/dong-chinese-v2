<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatPinyinList } from '$lib/orthography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.q ? `"${data.q}" — ` : ''}Search — Chinese Character Wiki</title>
</svelte:head>

<article class="wiki-search">
	<h1>Character Search</h1>

	<form method="get" action="/wiki/search" class="search-form">
		<input
			type="search"
			name="q"
			value={data.q}
			placeholder="Search by character, pinyin, or English..."
			class="search-input"
			autocomplete="off"
		/>
		<button type="submit" class="search-button">Search</button>
	</form>

	{#if data.q}
		{#if data.results.length === 0}
			<p class="no-results">No characters found for "{data.q}".</p>
		{:else}
			<p class="result-count">{data.results.length} result{data.results.length === 1 ? '' : 's'}</p>
			<table class="results-table">
				<thead>
					<tr>
						<th>Character</th>
						<th>Pinyin</th>
						<th>Gloss</th>
					</tr>
				</thead>
				<tbody>
					{#each data.results as result (result.character)}
						<tr>
							<td class="char-cell">
								<a href={resolve(`/wiki/${result.character}`)}>{result.character}</a>
							</td>
							<td>{formatPinyinList(result.pinyin, data.settings.phoneticScript)}</td>
							<td>{result.gloss ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	{/if}
</article>

<style>
	.wiki-search {
		max-width: 70ch;
	}

	h1 {
		margin-bottom: 1rem;
	}

	.search-form {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.search-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
	}

	.search-input:focus {
		outline: 2px solid var(--secondary-soft);
		outline-offset: -1px;
	}

	.search-button {
		padding: 0.5rem 1rem;
		font-size: 1rem;
		font-weight: 500;
		border: 1px solid var(--secondary);
		border-radius: var(--radius);
		background: var(--secondary);
		color: var(--primary-foreground);
	}

	.search-button:hover {
		opacity: 0.9;
	}

	.no-results {
		color: var(--muted-foreground);
		margin-top: 1rem;
	}

	.result-count {
		color: var(--muted-foreground);
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.results-table {
		width: 100%;
		border-collapse: collapse;
	}

	.results-table th {
		text-align: left;
		padding: 0.5rem 0.75rem;
		border-bottom: 2px solid var(--border);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--muted-foreground);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.results-table td {
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.char-cell {
		font-size: 1.25rem;
	}

	.char-cell a {
		text-decoration: none;
	}

	.char-cell a:hover {
		text-decoration: underline;
	}
</style>

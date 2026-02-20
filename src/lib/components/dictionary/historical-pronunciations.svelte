<script lang="ts">
	import type { HistoricalPronunciation } from '$lib/types/dictionary';

	interface Props {
		pronunciations: HistoricalPronunciation[];
	}

	let { pronunciations }: Props = $props();

	interface TableRow {
		source: string;
		middleChinese: string | null;
		oldChinese: string | null;
		gloss: string | null;
	}

	let rows = $derived.by(() => {
		const result: TableRow[] = [];

		for (const p of pronunciations) {
			if (p.source === 'baxter-sagart') {
				result.push({
					source: 'Baxter-Sagart',
					middleChinese: p.middleChinese ?? null,
					oldChinese: p.oldChinese ?? null,
					gloss: p.gloss ?? null
				});
			} else if (p.source === 'zhengzhang') {
				result.push({
					source: 'Zhengzhang',
					middleChinese: null,
					oldChinese: p.oldChinese ?? null,
					gloss: null
				});
			} else if (p.source === 'tang') {
				result.push({
					source: 'Unicode',
					middleChinese: p.middleChinese ?? null,
					oldChinese: null,
					gloss: null
				});
			}
		}

		return result;
	});

	function formatReconstruction(s: string): string[] {
		const stripped = s.startsWith('*') ? s.slice(1) : s;
		return stripped.split(/(?= \(~)/);
	}

	let hasMiddleChinese = $derived(rows.some((r) => r.middleChinese));
	let hasOldChinese = $derived(rows.some((r) => r.oldChinese));
	let hasGloss = $derived(rows.some((r) => r.gloss));
</script>

<section class="historical-pronunciations">
	<h2>Historical Pronunciations</h2>
	<table>
		<thead>
			<tr>
				<th></th>
				{#if hasMiddleChinese}<th>Middle Chinese</th>{/if}
				{#if hasOldChinese}<th>Old Chinese</th>{/if}
				{#if hasGloss}<th>Gloss</th>{/if}
			</tr>
		</thead>
		<tbody>
			{#each rows as row, i (i)}
				<tr>
					<td class="source">{i === 0 || rows[i - 1].source !== row.source ? row.source : ''}</td>
					{#if hasMiddleChinese}<td class="ipa"
							>{#if row.middleChinese}{#each formatReconstruction(row.middleChinese) as part, j (j)}{#if j > 0}<br
										/>{/if}{part}{/each}{/if}</td
						>{/if}
					{#if hasOldChinese}<td class="ipa"
							>{#if row.oldChinese}{#each formatReconstruction(row.oldChinese) as part, j (j)}{#if j > 0}<br
										/>{/if}{part}{/each}{/if}</td
						>{/if}
					{#if hasGloss}<td>{row.gloss ?? ''}</td>{/if}
				</tr>
			{/each}
		</tbody>
	</table>
</section>

<style>
	.historical-pronunciations {
		margin-bottom: 1.5rem;
	}

	h2 {
		font-size: 1rem;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--muted-foreground);
		font-weight: 500;
	}

	h2::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border);
	}

	table {
		font-size: 0.875rem;
		border-collapse: collapse;
	}

	th {
		text-align: left;
		font-weight: 500;
		color: var(--muted-foreground);
		padding: 0.25rem 0.75rem 0.25rem 0;
	}

	td {
		padding: 0.125rem 0.75rem 0.125rem 0;
		vertical-align: top;
	}

	.source {
		color: var(--muted-foreground);
	}

	.ipa {
		font-family: var(--font-mono);
	}
</style>

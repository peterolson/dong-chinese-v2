<script lang="ts">
	import type { HistoricalPronunciation } from '$lib/types/dictionary';

	interface Props {
		pronunciations: HistoricalPronunciation[];
	}

	let { pronunciations }: Props = $props();

	let baxterSagart = $derived(pronunciations.filter((p) => p.source === 'baxter-sagart'));
	let zhengzhang = $derived(pronunciations.filter((p) => p.source === 'zhengzhang'));
	let tang = $derived(pronunciations.filter((p) => p.source === 'tang'));
</script>

<section class="historical-pronunciations">
	<h2>Historical Pronunciations</h2>

	{#if baxterSagart.length > 0}
		<div class="pron-section">
			<h3>Baxter-Sagart (2014)</h3>
			<table>
				<thead>
					<tr>
						<th>Pinyin</th>
						<th>Middle Chinese</th>
						<th>Old Chinese</th>
						<th>Gloss</th>
					</tr>
				</thead>
				<tbody>
					{#each baxterSagart as p, i (i)}
						<tr>
							<td>{p.pinyin ?? '—'}</td>
							<td class="ipa">{p.middleChinese ?? '—'}</td>
							<td class="ipa">{p.oldChinese ?? '—'}</td>
							<td>{p.gloss ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if zhengzhang.length > 0}
		<div class="pron-section">
			<h3>Zhengzhang Shangfang (2003)</h3>
			<table>
				<thead>
					<tr>
						<th>Old Chinese</th>
						<th>Phonetic Series</th>
						<th>Rhyme Group</th>
						{#if zhengzhang.some((p) => p.notes)}
							<th>Notes</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each zhengzhang as p, i (i)}
						<tr>
							<td class="ipa">{p.oldChinese ?? '—'}</td>
							<td>{p.phoneticSeries ?? '—'}</td>
							<td>{p.rhymeGroup ?? '—'}</td>
							{#if zhengzhang.some((q) => q.notes)}
								<td>{p.notes ?? '—'}</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if tang.length > 0}
		<div class="pron-section">
			<h3>Tang Dynasty Reading</h3>
			<ul class="tang-list">
				{#each tang as p, i (i)}
					<li class="ipa">{p.middleChinese}</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>

<style>
	.historical-pronunciations {
		margin-bottom: 1.5rem;
	}

	h2 {
		margin-bottom: 0.75rem;
	}

	.pron-section {
		margin-bottom: 1rem;
	}

	.pron-section h3 {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin-bottom: 0.5rem;
	}

	table {
		border-collapse: collapse;
		width: 100%;
		font-size: 0.875rem;
	}

	th {
		text-align: left;
		padding: 0.375rem 0.75rem;
		border-bottom: 2px solid var(--border);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted-foreground);
	}

	td {
		padding: 0.375rem 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.ipa {
		font-family: var(--font-mono);
	}

	.tang-list {
		list-style: none;
		display: flex;
		gap: 0.75rem;
	}

	.tang-list li {
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}
</style>

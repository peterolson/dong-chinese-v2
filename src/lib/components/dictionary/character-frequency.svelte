<script lang="ts">
	/** Total number of films in the SUBTLEX-CH corpus */
	const SUBTLEX_FILM_COUNT = 6243;

	interface Props {
		junDaRank: number | null;
		junDaPerMillion: number | null;
		subtlexRank: number | null;
		subtlexPerMillion: number | null;
		subtlexContextDiversity: number | null;
	}

	let {
		junDaRank,
		junDaPerMillion,
		subtlexRank,
		subtlexPerMillion,
		subtlexContextDiversity
	}: Props = $props();

	let hasData = $derived(junDaRank != null || subtlexRank != null);

	function ordinal(n: number): string {
		const mod100 = n % 100;
		if (mod100 >= 11 && mod100 <= 13) return 'th';
		switch (n % 10) {
			case 1:
				return 'st';
			case 2:
				return 'nd';
			case 3:
				return 'rd';
			default:
				return 'th';
		}
	}

	function formatPerMillion(n: number | null): string {
		if (n == null) return '—';
		if (n >= 100) return n.toFixed(1);
		if (n >= 10) return n.toFixed(1);
		if (n >= 1) return n.toFixed(2);
		return n.toFixed(3);
	}

	let contextDiversityPct = $derived(
		subtlexContextDiversity != null
			? Math.round((subtlexContextDiversity / SUBTLEX_FILM_COUNT) * 100)
			: null
	);
</script>

{#if hasData}
	<section class="character-frequency">
		<h2>Frequency</h2>
		<dl>
			{#if junDaRank != null}
				<div class="freq-row">
					<dt>Written text</dt>
					<dd>
						{junDaRank.toLocaleString()}{ordinal(junDaRank)} most common
						<span class="detail">{formatPerMillion(junDaPerMillion)} per million</span>
					</dd>
				</div>
			{/if}
			{#if subtlexRank != null}
				<div class="freq-row">
					<dt>Movie subtitles</dt>
					<dd>
						{subtlexRank.toLocaleString()}{ordinal(subtlexRank)} most common
						<span class="detail">{formatPerMillion(subtlexPerMillion)} per million</span>
						{#if contextDiversityPct != null}
							<span class="detail">appears in {contextDiversityPct}% of films</span>
						{/if}
					</dd>
				</div>
			{/if}
		</dl>
	</section>
{/if}

<style>
	.character-frequency {
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

	dl {
		font-size: 0.875rem;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.25rem 1rem;
	}

	.freq-row {
		display: grid;
		grid-template-columns: subgrid;
		grid-column: 1 / -1;
	}

	dt {
		color: var(--muted-foreground);
	}

	dd {
		margin: 0;
		display: flex;
		flex-direction: column;
	}

	.detail {
		color: var(--muted-foreground);
	}
</style>

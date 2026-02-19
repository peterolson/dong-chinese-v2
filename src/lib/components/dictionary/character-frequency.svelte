<script lang="ts">
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

	function formatNumber(n: number | null): string {
		if (n == null) return '—';
		return n.toLocaleString();
	}

	function formatPerMillion(n: number | null): string {
		if (n == null) return '—';
		if (n >= 100) return n.toFixed(0);
		if (n >= 10) return n.toFixed(1);
		if (n >= 1) return n.toFixed(2);
		return n.toFixed(3);
	}
</script>

{#if hasData}
	<section class="character-frequency">
		<h2>Frequency</h2>
		<div class="freq-grid">
			{#if junDaRank != null}
				<div class="freq-card">
					<div class="freq-label">Book Rank</div>
					<div class="freq-rank">#{formatNumber(junDaRank)}</div>
					<div class="freq-detail">
						{formatPerMillion(junDaPerMillion)} per million
					</div>
					<div class="freq-source">Jun Da corpus</div>
				</div>
			{/if}

			{#if subtlexRank != null}
				<div class="freq-card">
					<div class="freq-label">Subtitle Rank</div>
					<div class="freq-rank">#{formatNumber(subtlexRank)}</div>
					<div class="freq-detail">
						{formatPerMillion(subtlexPerMillion)} per million
					</div>
					{#if subtlexContextDiversity != null}
						<div class="freq-detail">
							{formatNumber(subtlexContextDiversity)} films
						</div>
					{/if}
					<div class="freq-source">SUBTLEX-CH</div>
				</div>
			{/if}
		</div>
	</section>
{/if}

<style>
	.character-frequency {
		margin-bottom: 1.5rem;
	}

	h2 {
		margin-bottom: 0.75rem;
	}

	.freq-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.75rem;
	}

	.freq-card {
		padding: 0.75rem 1rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.freq-label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted-foreground);
		margin-bottom: 0.25rem;
	}

	.freq-rank {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.2;
	}

	.freq-detail {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.freq-source {
		font-size: 0.6875rem;
		color: var(--muted-foreground);
		margin-top: 0.25rem;
		opacity: 0.7;
	}
</style>

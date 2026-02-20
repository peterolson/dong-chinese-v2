<script lang="ts">
	import { resolve } from '$app/paths';
	import type { HistoricalPronunciation } from '$lib/types/dictionary';
	import Alert from '$lib/components/ui/alert.svelte';

	interface Props {
		character: string;
		compCharacter: string;
		charPronunciations: HistoricalPronunciation[] | null;
		compPronunciations: HistoricalPronunciation[] | null;
	}

	let { character, compCharacter, charPronunciations, compPronunciations }: Props = $props();

	/** Strip parenthesized text and diacritics for fairer comparison */
	function normalize(s: string): string {
		return s
			.replace(/\(.*?\)/g, '')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.trim();
	}

	function editDistance(a: string, b: string): number {
		const m = a.length;
		const n = b.length;
		const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
		for (let i = 0; i <= m; i++) dp[i][0] = i;
		for (let j = 0; j <= n; j++) dp[0][j] = j;
		for (let i = 1; i <= m; i++) {
			for (let j = 1; j <= n; j++) {
				dp[i][j] =
					a[i - 1] === b[j - 1]
						? dp[i - 1][j - 1]
						: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
			}
		}
		return dp[m][n];
	}

	interface PronComparison {
		charPron: string;
		compPron: string;
		field: 'Old Chinese' | 'Middle Chinese';
	}

	function findClosest(
		charProns: HistoricalPronunciation[],
		compProns: HistoricalPronunciation[]
	): PronComparison | null {
		let best: PronComparison | null = null;
		let bestSimilarity = -1;

		for (const cp of charProns) {
			for (const pp of compProns) {
				if (cp.oldChinese && pp.oldChinese) {
					const a = normalize(cp.oldChinese);
					const b = normalize(pp.oldChinese);
					const maxLen = Math.max(a.length, b.length);
					const similarity = maxLen > 0 ? 1 - editDistance(a, b) / maxLen : 0;
					if (similarity > bestSimilarity) {
						bestSimilarity = similarity;
						best = {
							charPron: cp.oldChinese,
							compPron: pp.oldChinese,
							field: 'Old Chinese'
						};
					}
				}
				if (cp.middleChinese && pp.middleChinese) {
					const a = normalize(cp.middleChinese);
					const b = normalize(pp.middleChinese);
					const maxLen = Math.max(a.length, b.length);
					const similarity = maxLen > 0 ? 1 - editDistance(a, b) / maxLen : 0;
					if (similarity > bestSimilarity) {
						bestSimilarity = similarity;
						best = {
							charPron: cp.middleChinese,
							compPron: pp.middleChinese,
							field: 'Middle Chinese'
						};
					}
				}
			}
		}

		return best;
	}

	let comparison = $derived(
		charPronunciations && compPronunciations
			? findClosest(charPronunciations, compPronunciations)
			: null
	);
</script>

<Alert variant="warning">
	<span>
		<a href={resolve('/(app)/dictionary/[entry]', { entry: character })}>{character}</a> and
		<a href={resolve('/(app)/dictionary/[entry]', { entry: compCharacter })}>{compCharacter}</a>
		don't sound similar in modern Mandarin due to historical phonetic changes. They were more similar
		in {comparison ? comparison.field : 'older Chinese'}.
		{#if comparison}
			<span class="pron-comparison">
				<br /><span class="pron-pair"
					><a href={resolve('/(app)/dictionary/[entry]', { entry: character })}>{character}</a>
					<span class="pron-value">{comparison.charPron}</span></span
				>
				<br /><span class="pron-pair"
					><a href={resolve('/(app)/dictionary/[entry]', { entry: compCharacter })}
						>{compCharacter}</a
					>
					<span class="pron-value">{comparison.compPron}</span></span
				>
			</span>
		{/if}
	</span>
</Alert>

<style>
	.pron-comparison {
		opacity: 0.85;
	}

	.pron-pair {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.pron-value {
		font-size: 0.75rem;
	}
</style>

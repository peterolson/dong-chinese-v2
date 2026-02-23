<script lang="ts">
	import { getCharLinkBase } from './char-link-context';

	interface Props {
		text: string;
	}

	let { text }: Props = $props();

	const charLinkBase = getCharLinkBase();

	const CJK_RE = /(\p{Unified_Ideograph}+)/gu;

	function segments(t: string): Array<{ text: string; cjk: boolean }> {
		const result: Array<{ text: string; cjk: boolean }> = [];
		let last = 0;
		let m;
		while ((m = CJK_RE.exec(t)) !== null) {
			if (m.index > last) result.push({ text: t.slice(last, m.index), cjk: false });
			result.push({ text: m[0], cjk: true });
			last = CJK_RE.lastIndex;
		}
		if (last < t.length) result.push({ text: t.slice(last), cjk: false });
		CJK_RE.lastIndex = 0;
		return result;
	}
</script>

{#each segments(text) as seg, i (i)}{#if seg.cjk}<a
			class="cjk-link"
			href="{charLinkBase}/{seg.text}">{seg.text}</a
		>{:else}{seg.text}{/if}{/each}

<style>
	.cjk-link {
		text-decoration: none;
	}

	.cjk-link:hover {
		text-decoration: underline;
	}
</style>

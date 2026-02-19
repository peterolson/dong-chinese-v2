<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { ComponentData } from '$lib/types/dictionary';
	import CharacterGlyph from '$lib/components/dictionary/character-glyph.svelte';
	import SpeakButton from '$lib/components/ui/speak-button.svelte';
	import { getComponentTitle } from '$lib/components/dictionary/component-colors';
	import type { PageData } from './$types';

	type Chars = [string] | [string, string];

	interface ExPair {
		l: Chars;
		lp: string;
		lg: string;
		r: Chars;
		rp: string;
		rg: string;
	}

	interface TypeInfo {
		leftHead: string;
		rightHead: string;
		leftMono: boolean;
		rightMono: boolean;
		leftSpeak: boolean;
		rightSpeak: boolean;
		pairs: ExPair[];
		intro: string;
		extra?: string;
	}

	let { data }: { data: PageData } = $props();

	let isTrad = $derived(data.settings.characterSet === 'traditional');

	function strokesFor(c: string) {
		const d = data.characters[c];
		if (!d) return null;
		return (
			(isTrad ? (d.strokeDataTrad ?? d.strokeDataSimp) : (d.strokeDataSimp ?? d.strokeDataTrad))
				?.strokes ?? null
		);
	}

	function fragmentsFor(c: string) {
		const d = data.characters[c];
		if (!d) return null;
		return isTrad ? (d.fragmentsTrad ?? d.fragmentsSimp) : (d.fragmentsSimp ?? d.fragmentsTrad);
	}

	function compsFor(c: string) {
		return data.characters[c]?.components ?? null;
	}

	function monoComps(c: string): ComponentData[] {
		return [{ character: c, type: [data.type] }];
	}

	function monoFrags(c: string): number[][] {
		const s = strokesFor(c);
		return s ? [s.map((_, i) => i)] : [];
	}

	function pick(v: Chars): string {
		return v.length > 1 && isTrad ? v[1]! : v[0];
	}

	let title = $derived(getComponentTitle(data.type));

	const colorNames: Record<string, string> = {
		meaning: 'red',
		sound: 'blue',
		iconic: 'green',
		simplified: 'teal',
		unknown: 'gray',
		remnant: 'orange',
		distinguishing: 'purple',
		deleted: 'light gray'
	};

	const typeInfo: Record<string, TypeInfo> = {
		meaning: {
			leftHead: 'Character',
			rightHead: 'Meaning component',
			leftMono: false,
			rightMono: true,
			leftSpeak: false,
			rightSpeak: false,
			pairs: [
				{ l: ['妈', '媽'], lp: 'mā', lg: 'mother', r: ['女'], rp: 'nǚ', rg: 'woman' },
				{ l: ['问', '問'], lp: 'wèn', lg: 'to ask', r: ['口'], rp: 'kǒu', rg: 'mouth' },
				{ l: ['想'], lp: 'xiǎng', lg: 'to think', r: ['心'], rp: 'xīn', rg: 'heart' },
				{ l: ['错', '錯'], lp: 'cuò', lg: 'wrong', r: ['金'], rp: 'jīn', rg: 'metal' }
			],
			intro:
				'A meaning component (also called a semantic component or radical) gives a clue about the meaning of the character. Most Chinese characters contain one.',
			extra:
				'The link between the meaning component and the character\'s modern meaning is sometimes obscure. Over thousands of years, meanings shift. For example, 错 originally meant "to polish jade" — hence the metal radical 金. Today 错 means "wrong," but the old component remains.'
		},
		sound: {
			leftHead: 'Character',
			rightHead: 'Sound component',
			leftMono: false,
			rightMono: true,
			leftSpeak: true,
			rightSpeak: true,
			pairs: [
				{
					l: ['妈', '媽'],
					lp: 'mā',
					lg: 'mother',
					r: ['马', '馬'],
					rp: 'mǎ',
					rg: 'horse'
				},
				{
					l: ['问', '問'],
					lp: 'wèn',
					lg: 'to ask',
					r: ['门', '門'],
					rp: 'mén',
					rg: 'door'
				},
				{
					l: ['想'],
					lp: 'xiǎng',
					lg: 'to think',
					r: ['相'],
					rp: 'xiāng',
					rg: 'mutual'
				},
				{ l: ['他'], lp: 'tā', lg: 'he', r: ['也'], rp: 'yě', rg: 'also' }
			],
			intro:
				'A sound component (also called a phonetic component) gives a clue about the pronunciation. Listen to each pair — the character and its sound component often rhyme or sound similar.',
			extra:
				'Pronunciation has changed over thousands of years. Some pairs that once matched exactly now sound quite different. For example, 他 (tā) and 也 (yě) no longer rhyme, but they were much closer in Old Chinese.'
		},
		iconic: {
			leftHead: 'Character',
			rightHead: 'Based on',
			leftMono: false,
			rightMono: true,
			leftSpeak: false,
			rightSpeak: false,
			pairs: [
				{ l: ['林'], lp: 'lín', lg: 'forest', r: ['木'], rp: 'mù', rg: 'tree (×2)' },
				{
					l: ['旦'],
					lp: 'dàn',
					lg: 'dawn',
					r: ['日'],
					rp: 'rì',
					rg: 'sun above horizon'
				},
				{
					l: ['有'],
					lp: 'yǒu',
					lg: 'to have',
					r: ['又'],
					rp: 'yòu',
					rg: 'hand + meat'
				}
			],
			intro:
				"An iconic component creates meaning through visual composition. The arrangement of parts together suggests the character's meaning — like a picture built from simpler pieces."
		},
		unknown: {
			leftHead: 'Character',
			rightHead: 'Component',
			leftMono: false,
			rightMono: true,
			leftSpeak: false,
			rightSpeak: false,
			pairs: [{ l: ['是'], lp: 'shì', lg: 'to be', r: ['止'], rp: 'zhǐ', rg: 'to stop' }],
			intro:
				'For some characters, the role of a component is uncertain. It may have once served as a meaning or sound component, but the connection has been lost or is debated among scholars.'
		},
		simplified: {
			leftHead: 'Traditional',
			rightHead: 'Simplified',
			leftMono: false,
			rightMono: false,
			leftSpeak: false,
			rightSpeak: false,
			pairs: [
				{ l: ['難'], lp: 'nán', lg: 'difficult', r: ['难'], rp: 'nán', rg: 'difficult' },
				{ l: ['點'], lp: 'diǎn', lg: 'point', r: ['点'], rp: 'diǎn', rg: 'point' },
				{ l: ['還'], lp: 'hái', lg: 'still', r: ['还'], rp: 'hái', rg: 'still' }
			],
			intro:
				'A simplified component has been rewritten with fewer strokes in the simplified Chinese system. The traditional form preserves the original structure; the simplified form is streamlined for ease of writing.'
		},
		deleted: {
			leftHead: 'Traditional',
			rightHead: 'Simplified',
			leftMono: false,
			rightMono: false,
			leftSpeak: false,
			rightSpeak: false,
			pairs: [{ l: ['開'], lp: 'kāi', lg: 'to open', r: ['开'], rp: 'kāi', rg: 'to open' }],
			intro:
				'A deleted component was removed entirely during Chinese character simplification. The traditional form contains a component that is absent in the simplified form.',
			extra:
				'In 開, the component 門 (door) was deleted to create the simplified form 开. The traditional character literally depicts "opening a door."'
		},
		remnant: {
			leftHead: 'Character',
			rightHead: 'Original form',
			leftMono: false,
			rightMono: true,
			leftSpeak: true,
			rightSpeak: true,
			pairs: [
				{
					l: ['孝'],
					lp: 'xiào',
					lg: 'filial piety',
					r: ['老'],
					rp: 'lǎo',
					rg: 'old'
				}
			],
			intro:
				'A remnant component is an abbreviated or modified version of another character. The original form was altered to fit within the character, but can still be traced back to its source.',
			extra:
				'The character 孝 (filial piety) contains 耂 at the top — a remnant of 老 (old). Respect for elders is represented by a modified form of "old" placed above 子 (child).'
		},
		distinguishing: {
			leftHead: 'Character',
			rightHead: 'Distinguished from',
			leftMono: false,
			rightMono: false,
			leftSpeak: true,
			rightSpeak: true,
			pairs: [{ l: ['玉'], lp: 'yù', lg: 'jade', r: ['王'], rp: 'wáng', rg: 'king' }],
			intro:
				'A distinguishing component is a small mark — often a single dot or stroke — added to differentiate one character from another that would otherwise look the same.',
			extra:
				'The character 玉 (jade) is distinguished from 王 (king) by a single dot. Without it, the two would be identical.'
		}
	};

	let info = $derived(typeInfo[data.type]!);
	let backHref = $derived(page.url.searchParams.get('from') || resolve('/(app)/dictionary'));
</script>

{#snippet cell(char: string, pinyin: string, meaning: string, mono: boolean, showSpeak: boolean)}
	<td>
		<div class="char-cell">
			<div class="glyph-box">
				<CharacterGlyph
					character={char}
					strokes={strokesFor(char)}
					components={mono ? monoComps(char) : compsFor(char)}
					allFragments={mono ? monoFrags(char) : fragmentsFor(char)}
				/>
			</div>
			<a href={resolve('/(app)/dictionary/[entry]', { entry: char })} class="cell-char">{char}</a>
			<span class="cell-pinyin">{pinyin}</span>
			{#if showSpeak}
				<SpeakButton text={char} label="Listen to {char}" />
			{/if}
			<span class="cell-meaning">{meaning}</span>
		</div>
	</td>
{/snippet}

<svelte:head>
	<title>{title} Component — Dong Chinese</title>
</svelte:head>

<article class="explain-page">
	<a href={backHref} class="back-link">&larr; Back to dictionary</a>

	<h1>{title} component</h1>

	<p class="intro">{info.intro}</p>

	<table class="examples-table">
		<thead>
			<tr>
				<th>{info.leftHead}</th>
				<th>{info.rightHead}</th>
			</tr>
		</thead>
		<tbody>
			{#each info.pairs as pair (pair.l[0])}
				{@const lc = pick(pair.l)}
				{@const rc = pick(pair.r)}
				<tr>
					{@render cell(lc, pair.lp, pair.lg, info.leftMono, info.leftSpeak)}
					{@render cell(rc, pair.rp, pair.rg, info.rightMono, info.rightSpeak)}
				</tr>
			{/each}
		</tbody>
	</table>

	{#if info.extra}
		<section class="extra">
			<h2>
				{#if data.type === 'meaning' || data.type === 'sound'}
					Historical note
				{:else}
					About this type
				{/if}
			</h2>
			<p>{info.extra}</p>
		</section>
	{/if}

	<div class="color-note">
		<span class="color-swatch" style:background={`var(--comp-${data.type})`}></span>
		{title} components are shown in
		<b style:color={`var(--comp-${data.type})`}>{colorNames[data.type]}</b> in character breakdowns.
	</div>
</article>

<style>
	.explain-page {
		max-width: 700px;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	h1 {
		margin-bottom: 1rem;
	}

	.intro {
		margin-bottom: 1.5rem;
		line-height: 1.6;
	}

	.examples-table {
		width: 100%;
		border-collapse: collapse;
		margin-bottom: 1.5rem;
	}

	.examples-table th {
		text-align: center;
		padding: 0.5rem;
		border-bottom: 2px solid var(--border);
		font-size: 0.875rem;
		color: var(--muted-foreground);
		font-weight: 600;
	}

	.examples-table td {
		border-bottom: 1px solid var(--border);
	}

	.char-cell {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.75rem 0.5rem;
		gap: 0.125rem;
	}

	.glyph-box {
		width: 60px;
		height: 60px;
	}

	.cell-char {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.cell-pinyin {
		font-size: 0.875rem;
	}

	.cell-meaning {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}

	.extra {
		margin-bottom: 1.5rem;
	}

	.extra h2 {
		margin-bottom: 0.5rem;
	}

	.extra p {
		line-height: 1.6;
	}

	.color-note {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: var(--surface);
		border-radius: var(--radius);
		font-size: 0.875rem;
	}

	.color-swatch {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border-radius: 50%;
		flex-shrink: 0;
	}
</style>

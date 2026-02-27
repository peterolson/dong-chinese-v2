<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ComponentData, CharacterData } from '$lib/types/dictionary';
	import { getCharLinkBase } from './char-link-context';
	import { typeInfo, colorNames, type Chars } from '$lib/data/component-type-info';
	import { getComponentTitle } from './component-colors';
	import CharacterGlyph from './character-glyph.svelte';
	import SpeakButton from '$lib/components/ui/speak-button.svelte';

	interface Props {
		type: string;
		characters: Record<string, CharacterData>;
		characterSet?: 'simplified' | 'traditional' | null;
	}

	let { type, characters, characterSet = null }: Props = $props();

	const charLinkBase = getCharLinkBase();

	let isTrad = $derived(characterSet === 'traditional');

	function strokesFor(c: string) {
		const d = characters[c];
		if (!d) return null;
		return (
			(isTrad ? (d.strokeDataTrad ?? d.strokeDataSimp) : (d.strokeDataSimp ?? d.strokeDataTrad))
				?.strokes ?? null
		);
	}

	function fragmentsFor(c: string) {
		const d = characters[c];
		if (!d) return null;
		return isTrad ? (d.fragmentsTrad ?? d.fragmentsSimp) : (d.fragmentsSimp ?? d.fragmentsTrad);
	}

	function compsFor(c: string) {
		return characters[c]?.components ?? null;
	}

	function monoComps(c: string): ComponentData[] {
		return [{ character: c, type: [type] }];
	}

	function monoFrags(c: string): number[][] {
		const s = strokesFor(c);
		return s ? [s.map((_, i) => i)] : [];
	}

	function pick(v: Chars): string {
		return v.length > 1 && isTrad ? v[1]! : v[0];
	}

	/** Return a character's components with each type list filtered to only include `keepType` */
	function singleTypeComps(c: string, keepType: string): ComponentData[] | null {
		const comps = compsFor(c);
		if (!comps) return null;
		return comps.map((comp) => ({
			...comp,
			type: comp.type?.includes(keepType) ? [keepType] : comp.type
		}));
	}

	let info = $derived(typeInfo[type]!);
	let title = $derived(getComponentTitle(type));
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
			<a href={resolve(`${charLinkBase}/${char}`)} class="cell-char">{char}</a>
			<span class="cell-pinyin">{pinyin}</span>
			{#if showSpeak}
				<SpeakButton text={char} label="Listen to {char}" />
			{/if}
			<span class="cell-meaning">{meaning}</span>
		</div>
	</td>
{/snippet}

{#snippet customCell(
	char: string,
	pinyin: string,
	meaning: string,
	comps: ComponentData[] | null,
	frags: number[][] | null,
	showSpeak: boolean
)}
	<td>
		<div class="char-cell">
			<div class="glyph-box">
				<CharacterGlyph
					character={char}
					strokes={strokesFor(char)}
					components={comps}
					allFragments={frags}
				/>
			</div>
			<a href={resolve(`${charLinkBase}/${char}`)} class="cell-char">{char}</a>
			<span class="cell-pinyin">{pinyin}</span>
			{#if showSpeak}
				<SpeakButton text={char} label="Listen to {char}" />
			{/if}
			<span class="cell-meaning">{meaning}</span>
		</div>
	</td>
{/snippet}

{#snippet deletedHighlightCell(
	glyphChar: string,
	highlightIndex: number,
	linkChar: string,
	pinyin: string,
	meaning: string
)}
	{@const strokes = strokesFor(glyphChar)}
	{@const frags = fragmentsFor(glyphChar)}
	{@const highlightSet = frags ? new Set(frags[highlightIndex]) : null}
	<td>
		<div class="char-cell">
			<div class="glyph-box">
				{#if strokes && highlightSet}
					<svg viewBox="0 0 1024 1024" class="deleted-glyph" aria-label={glyphChar} role="img">
						<g transform="translate(0, 900) scale(1, -1)">
							{#each strokes as stroke, si (si)}
								<path
									d={stroke}
									fill="var(--foreground)"
									opacity={highlightSet.has(si) ? 1 : 0.15}
								/>
							{/each}
						</g>
						<text
							x="512"
							y="512"
							text-anchor="middle"
							dominant-baseline="central"
							font-size="800"
							fill="transparent">{glyphChar}</text
						>
					</svg>
				{/if}
			</div>
			<a href={resolve(`${charLinkBase}/${linkChar}`)} class="cell-char">{linkChar}</a>
			<span class="cell-pinyin">{pinyin}</span>
			<span class="cell-meaning">{meaning}</span>
		</div>
	</td>
{/snippet}

{#snippet highlightCell(char: string, index: number, meaning: string)}
	<td>
		<div class="char-cell">
			<div class="glyph-box">
				<CharacterGlyph
					character={char}
					strokes={strokesFor(char)}
					components={compsFor(char)}
					allFragments={fragmentsFor(char)}
					highlightIndex={index}
				/>
			</div>
			<span class="cell-meaning">{meaning}</span>
		</div>
	</td>
{/snippet}

<!-- Intro -->
<div class="intro">
	{#if type === 'meaning'}
		<p>
			A <strong>meaning</strong> or <strong>semantic</strong> component hints at the meaning of the character.
		</p>
		<p>For example:</p>
	{:else if type === 'sound'}
		<p>
			A <strong>sound</strong> or <strong>phonetic</strong> component hints at how the character is pronounced.
		</p>
		<p>For example:</p>
	{:else if type === 'iconic'}
		<p>
			An <strong>iconic</strong> or <strong>form</strong> component is a direct visual
			representation of an object or idea (also known as a <i>pictograph</i> or <i>ideograph</i>).
		</p>
		<p>For example:</p>
	{:else if type === 'unknown'}
		<p>
			An <strong>unknown</strong> component is a component whose purpose is unclear. Unfortunately, not
			all Chinese characters have a clear explanation.
		</p>
		<p>
			For example, nobody really knows for certain what the top component of 是 was originally
			supposed to represent.
		</p>
	{:else if type === 'simplified'}
		<p>
			A <strong>simplified</strong> component is a component that was changed during character simplification
			to reduce the number of strokes.
		</p>
		<p>For example:</p>
	{:else if type === 'deleted'}
		<p>
			A <strong>deleted</strong> component is a component that was removed during character simplification
			to reduce the number of strokes.
		</p>
		<p>For example:</p>
	{:else if type === 'remnant'}
		<p>
			A <strong>remnant</strong> component is a component that is derived from a part of another character.
		</p>
		<p>
			For example, the character 孝 (filial piety) is derived from a remnant of 老 (old), and 子
			(child).
		</p>
	{:else if type === 'distinguishing'}
		<p>
			A <strong>distinguishing</strong> component is a component that was added to distinguish one character
			from another character.
		</p>
		<p>
			For example, the characters 王 (king) and 玉 (jade) were written similarly in seal script, so
			a dot was added to distinguish them.
		</p>
	{/if}
</div>

<!-- Examples table -->
{#if type === 'unknown'}
	<table class="examples-table">
		<thead>
			<tr>
				<th>Character</th>
				<th>Unknown component</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				{@render cell('是', 'shì', 'to be', false, false)}
				{@render highlightCell('是', 0, '[unknown meaning]')}
			</tr>
		</tbody>
	</table>
{:else if type === 'remnant'}
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
					{@render customCell(
						lc,
						pair.lp,
						pair.lg,
						singleTypeComps(lc, 'remnant'),
						fragmentsFor(lc),
						info.leftSpeak
					)}
					{@render cell(rc, pair.rp, pair.rg, info.rightMono, info.rightSpeak)}
				</tr>
			{/each}
		</tbody>
	</table>
{:else if type === 'simplified'}
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
					{@render customCell(
						rc,
						pair.rp,
						pair.rg,
						singleTypeComps(rc, 'simplified'),
						fragmentsFor(rc),
						info.rightSpeak
					)}
				</tr>
			{/each}
		</tbody>
	</table>
{:else if type === 'deleted'}
	<!-- Hardcoded 開 → 門 (deleted) → 开 example -->
	<table class="examples-table">
		<thead>
			<tr>
				<th>Traditional</th>
				<th>Deleted component</th>
				<th>Simplified</th>
			</tr>
		</thead>
		<tbody>
			<tr>
				{@render cell('開', 'kāi', 'to open', false, false)}
				{@render deletedHighlightCell('開', 0, '門', 'mén', 'door')}
				{@render cell('开', 'kāi', 'to open', false, false)}
			</tr>
		</tbody>
	</table>
{:else}
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
{/if}

<!-- Color note -->
{#if type !== 'deleted'}
	<p class="color-note">
		<span class="color-swatch" style:background={`var(--comp-${type})`}></span>
		{title} components are color-coded as
		{#if type === 'remnant' || type === 'distinguishing'}
			<strong><span style:color={`var(--comp-${type})`}>{colorNames[type]}</span></strong>.
		{:else}
			<span style:color={`var(--comp-${type})`}>{colorNames[type]}</span>.
		{/if}
	</p>
{/if}

<!-- Extra sections -->
{#if type === 'meaning'}
	<section class="extra">
		<h2>Historical shifts in meaning</h2>
		<p>
			Sometimes a character does not seem related to its meaning component. This can happen when the
			meaning of a character changes over the course of history.
		</p>
		<p>
			For example, the character {isTrad ? '錯' : '错'} originally meant to decorate something by inlaying
			it with gold or silver, which is why it contains the 金 (metal) component. Later this character
			expanded to include other meanings:
		</p>
		<ul>
			<li>interlocking pattern</li>
			<li>stagger / crossing</li>
			<li>complex / chaotic</li>
			<li>incorrect / mistake</li>
			<li>bad / wrong</li>
		</ul>
	</section>
{:else if type === 'sound'}
	<section class="extra">
		<h2>Historical sound changes</h2>
		<p>
			Sometimes a character does not sound similar to its sound component. Most Chinese characters
			were invented thousands of years ago. Since then, there have been many changes to the way
			people speak. For that reason, the sound components of some characters are leftovers from old
			Chinese pronunciation, and do not reflect modern pronunciation.
		</p>
		<p>
			For example, in old Chinese, 他 was pronounced /<i>*l̥ʰaːl</i>/ and 也 was pronounced /<i
				>*laːlʔ</i
			>/, so 也 was used as a sound component in 他. These two characters no longer sound similar.
		</p>
	</section>
{/if}

<style>
	.intro {
		margin-bottom: 1.5rem;
		line-height: 1.6;
	}

	.intro p {
		margin-bottom: 0.5rem;
	}

	.intro p:last-child {
		margin-bottom: 0;
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
		vertical-align: top;
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

	.deleted-glyph {
		width: 100%;
		height: 100%;
		display: block;
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

	.color-note {
		padding: 0.75rem 1rem;
		background: var(--surface);
		border-radius: var(--radius);
		font-size: 0.875rem;
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}

	.color-swatch {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 50%;
		vertical-align: middle;
		margin-right: 0.25rem;
	}

	.extra {
		margin-bottom: 1.5rem;
	}

	.extra h2 {
		margin-bottom: 0.5rem;
	}

	.extra p {
		line-height: 1.6;
		margin-bottom: 0.75rem;
	}

	.extra p:last-child {
		margin-bottom: 0;
	}

	.extra ul {
		padding-left: 1.5rem;
		margin: 0.5rem 0 0.75rem;
		line-height: 1.6;
	}
</style>

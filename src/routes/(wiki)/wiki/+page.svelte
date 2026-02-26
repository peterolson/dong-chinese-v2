<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Chinese Character Wiki</title>
</svelte:head>

<article class="wiki-home">
	<h1>Chinese Character Wiki</h1>

	<p>
		The Chinese Character Wiki is a community-maintained database of Chinese character information.
		It powers the character breakdowns and explanations throughout the site.
	</p>

	<section class="wiki-section">
		<h2>Component Types</h2>
		<p>
			Chinese characters are composed of components. Each component has a role in the character — it
			may contribute meaning, sound, or both. The wiki categorizes components into 8 types:
		</p>

		<ul class="type-list">
			<li>
				<span class="type-badge" style:--badge-color="var(--comp-meaning)">meaning</span>
				The component contributes to the character's meaning.
			</li>
			<li>
				<span class="type-badge" style:--badge-color="var(--comp-sound)">sound</span>
				The component contributes to the character's pronunciation.
			</li>
			<li>
				<span class="type-badge" style:--badge-color="var(--comp-iconic)">iconic</span>
				The character is a pictographic representation of its meaning.
			</li>
			<li>
				<span class="type-badge" style:--badge-color="var(--comp-remnant)">remnant</span>
				A vestige of an older, more complex form.
			</li>
			<li>
				<span class="type-badge" style:--badge-color="var(--comp-simplified)">simplified</span>
				A simplification of a traditional component.
			</li>
			<li>
				<span class="type-badge" style:--badge-color="var(--comp-deleted)">deleted</span>
				A component that was removed during simplification.
			</li>
			<li>
				<span class="type-badge" style:--badge-color="var(--comp-distinguishing)"
					>distinguishing</span
				>
				Added to distinguish from a similar character.
			</li>
			<li>
				<span class="type-badge" style:--badge-color="var(--comp-unknown)">unknown</span>
				The component's role is unclear.
			</li>
		</ul>
	</section>

	<section class="wiki-section">
		<h2>How to Contribute</h2>
		<p>
			Anyone can suggest edits to character data. Navigate to a character page (e.g.
			<a href={resolve('/wiki/你')}>你</a>) and click "Edit this character." Your edit will be
			reviewed by a wiki editor before being published.
		</p>
		<p>
			If you have wiki editor permissions, your edits are automatically approved and you can review
			edits from other contributors.
		</p>
	</section>

	<section class="wiki-section">
		<h2>Data Sources</h2>
		<p>The wiki aggregates data from multiple sources:</p>
		<ul>
			<li><strong>Unihan</strong> — Unicode standard character properties</li>
			<li><strong>CC-CEDICT</strong> — Collaborative Chinese-English dictionary</li>
			<li><strong>AnimCJK</strong> — Stroke order animations</li>
			<li><strong>MakeMeAHanzi</strong> — Character decomposition data</li>
			<li><strong>Shuowen Jiezi</strong> — Ancient character etymology</li>
			<li><strong>Baxter-Sagart</strong> — Old Chinese pronunciation reconstructions</li>
			<li><strong>Zhengzhang</strong> — Historical phonology</li>
			<li><strong>Jun Da corpus</strong> — Character frequency in books</li>
			<li><strong>SUBTLEX-CH</strong> — Character frequency in film subtitles</li>
		</ul>
	</section>

	<section class="wiki-section">
		<h2>Quick Links</h2>
		<ul>
			<li><a href={resolve('/wiki/search')}>Search characters</a></li>
			<li><a href={resolve('/wiki/lists')}>Browse frequency lists</a></li>
			<li><a href={resolve('/wiki/recent-changes')}>View recent changes</a></li>
		</ul>
	</section>
</article>

<style>
	.wiki-home {
		max-width: 70ch;
	}

	.wiki-section {
		margin-top: 2rem;
	}

	.wiki-section h2 {
		margin-bottom: 0.75rem;
	}

	.wiki-section p {
		margin-bottom: 0.5rem;
	}

	.wiki-section ul {
		padding-left: 1.5rem;
	}

	.wiki-section li {
		margin-bottom: 0.375rem;
	}

	.type-list {
		list-style: none;
		padding-left: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.type-list li {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.type-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--primary-foreground);
		background: var(--badge-color);
		flex-shrink: 0;
	}
</style>

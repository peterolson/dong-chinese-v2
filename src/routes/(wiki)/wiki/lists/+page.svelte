<script lang="ts">
</script>

<svelte:head>
	<title>Character Lists — Dong Chinese Wiki</title>
</svelte:head>

<article class="lists-home">
	<h1>Character Lists</h1>

	<p>Browse characters ordered by frequency or usage. Click a list to explore.</p>

	<ul class="list-cards">
		<li>
			<a href="/wiki/lists/subtlex-rank/0/100" class="list-card">
				<h2>Movie Frequency</h2>
				<p>Characters ranked by how often they appear in Chinese film subtitles (SUBTLEX-CH).</p>
			</a>
		</li>
		<li>
			<a href="/wiki/lists/subtlex-context-diversity/0/100" class="list-card">
				<h2>Context Diversity</h2>
				<p>
					Characters ranked by how many different films they appear in. A good measure of how
					"generally useful" a character is.
				</p>
			</a>
		</li>
		<li>
			<a href="/wiki/lists/jun-da-rank/0/100" class="list-card">
				<h2>Book Frequency</h2>
				<p>Characters ranked by how often they appear in modern Chinese books (Jun Da corpus).</p>
			</a>
		</li>
		<li>
			<a href="/wiki/lists/common-components/0/100" class="list-card">
				<h2>Most Common Components</h2>
				<p>Characters that are most frequently used as building blocks of other characters.</p>
			</a>
		</li>
	</ul>
</article>

<style>
	.lists-home {
		max-width: 70ch;
	}

	.lists-home p {
		margin-bottom: 1.5rem;
	}

	.list-cards {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}

	.list-card {
		display: block;
		padding: 1.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--foreground);
		text-decoration: none;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.list-card:hover {
		border-color: var(--primary-soft);
		box-shadow: 0 2px 8px rgb(0 0 0 / 0.08);
		text-decoration: none;
	}

	.list-card h2 {
		font-size: 1.125rem;
		margin-bottom: 0.375rem;
		color: var(--primary-soft);
	}

	.list-card p {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin: 0;
	}
</style>

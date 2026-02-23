<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import { BookOpen, BookText, BookMarked } from 'lucide-svelte';
	import logoTransparent from '$lib/assets/logo-transparent.webp';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<div class="home">
	<header class="home-header">
		<img src={logoTransparent} alt="懂中文 Dong Chinese" class="home-logo" />
		<div class="auth-area">
			{#if data.user}
				<span class="greeting">Hi, {data.user.name || data.user.email}</span>
				<form method="post" action="/login?/signOut" use:enhance>
					<button type="submit" class="auth-link">Sign out</button>
				</form>
			{:else}
				<a href={resolve('/login')} class="auth-link">Log in</a>
				<a href={resolve('/register')} class="auth-link primary">Create account</a>
			{/if}
		</div>
	</header>

	<nav class="home-nav" aria-label="Main sections">
		<a href={resolve('/(app)/learn')} class="nav-card">
			<BookOpen size={32} aria-hidden="true" />
			<div>
				<h2>Learn</h2>
				<p>Lessons and practice</p>
			</div>
		</a>
		<a href={resolve('/(app)/dictionary')} class="nav-card">
			<BookText size={32} aria-hidden="true" />
			<div>
				<h2>Dictionary</h2>
				<p>Look up characters and words</p>
			</div>
		</a>
		<a href="/wiki" class="nav-card">
			<BookMarked size={32} aria-hidden="true" />
			<div>
				<h2>Wiki</h2>
				<p>Browse and edit character data</p>
			</div>
		</a>
	</nav>
</div>

<style>
	.home {
		max-width: 40rem;
		margin: 0 auto;
		padding: 3rem 1.5rem;
	}

	.home-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 3rem;
	}

	.home-logo {
		max-height: 52px;
		width: auto;
	}

	.auth-area {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
	}

	.greeting {
		color: var(--muted-foreground);
	}

	.auth-link {
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		color: var(--foreground);
		text-decoration: none;
		font-size: 0.875rem;
		background: none;
		cursor: pointer;
		font: inherit;
	}

	.auth-link:hover {
		background: var(--surface);
		text-decoration: none;
	}

	.auth-link.primary {
		background: var(--primary);
		color: var(--primary-foreground);
		border-color: var(--primary);
	}

	.auth-link.primary:hover {
		opacity: 0.9;
	}

	.home-nav {
		display: grid;
		gap: 1rem;
	}

	.nav-card {
		display: flex;
		align-items: center;
		gap: 1.25rem;
		padding: 1.25rem 1.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		text-decoration: none;
		color: var(--foreground);
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.nav-card:hover {
		background: var(--surface);
		border-color: var(--primary-soft);
		text-decoration: none;
	}

	.nav-card :global(svg) {
		flex-shrink: 0;
		color: var(--primary-soft);
	}

	.nav-card h2 {
		font-size: 1.125rem;
		margin: 0 0 0.125rem;
	}

	.nav-card p {
		font-size: 0.875rem;
		color: var(--muted-foreground);
		margin: 0;
	}
</style>

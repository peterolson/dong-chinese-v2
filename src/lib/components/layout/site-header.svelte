<script lang="ts">
	import { Menu } from 'lucide-svelte';
	import { resolve } from '$app/paths';
	import AuthStatus from '$lib/components/layout/auth-status.svelte';
	import type { AuthUser } from '$lib/server/auth';
	import logoTransparent from '$lib/assets/logo-transparent.webp';

	let { user }: { user: AuthUser | null } = $props();
</script>

<header class="site-header">
	<div class="header-left">
		<label for="sidebar-toggle" class="menu-button" aria-label="Toggle navigation">
			<Menu size={24} aria-hidden="true" />
		</label>
		<a href={resolve('/')} class="site-brand">
			<img src={logoTransparent} alt="懂中文 Dong Chinese" class="site-logo" />
		</a>
	</div>
	<AuthStatus {user} variant="on-primary" />
</header>

<style>
	.site-header {
		position: sticky;
		top: 0;
		z-index: 30;
		height: var(--header-height);
		background: var(--header-bg);
		color: var(--primary-foreground);
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1rem;
		border-bottom: 1px solid var(--border);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.menu-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border-radius: var(--radius);
		color: var(--primary-foreground);
		cursor: pointer;
		transition: background-color 0.15s;
	}

	.menu-button:hover {
		background: rgb(255 255 255 / 0.15);
	}

	.site-brand {
		display: flex;
		align-items: center;
		text-decoration: none;
		user-select: none;
	}

	.site-logo {
		max-height: 52px;
		width: auto;
	}
</style>

<script lang="ts">
	import { House, Search, List, Clock, CheckCircle } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SegmentedControl from '$lib/components/ui/segmented-control.svelte';
	import { readSettings, writeSettings, applyThemeToDOM } from '$lib/settings-client';
	import type { UserSettings } from '$lib/settings';
	import favicon from '$lib/assets/favicon-32.png';

	let {
		canReview = false,
		pendingBadgeCount = 0,
		settings = {}
	}: {
		canReview?: boolean;
		pendingBadgeCount?: number;
		settings?: Partial<UserSettings>;
	} = $props();

	const currentTheme = $derived(settings.theme ?? null);
	const currentCharSet = $derived(settings.characterSet ?? null);
	const currentPhoneticScript = $derived(settings.phoneticScript ?? 'pinyin');

	let formEl: HTMLFormElement | undefined = $state();

	const mainNav = [
		{ href: '/wiki', label: 'Home', icon: House },
		{ href: '/wiki/search', label: 'Search', icon: Search },
		{ href: '/wiki/lists', label: 'Lists', icon: List },
		{ href: '/wiki/recent-changes', label: 'Recent Changes', icon: Clock }
	];

	const themeOptions = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' }
	];

	const charSetOptions = [
		{ value: 'simplified', label: '简' },
		{ value: 'traditional', label: '繁' }
	];

	function isActive(href: string): boolean {
		const pathname = page.url.pathname;
		if (href === '/wiki') return pathname === '/wiki';
		return pathname === href || pathname.startsWith(href + '/');
	}
</script>

<nav class="sidebar" aria-label="Wiki navigation">
	<ul class="nav-list">
		{#each mainNav as item (item.href)}
			<li>
				<a
					href={resolve(item.href)}
					class="nav-link"
					aria-current={isActive(item.href) ? 'page' : undefined}
				>
					<item.icon size={20} class="nav-icon" aria-hidden="true" />
					{item.label}
				</a>
			</li>
		{/each}

		<li>
			<a
				href={resolve('/wiki/pending')}
				class="nav-link"
				aria-current={isActive('/wiki/pending') ? 'page' : undefined}
			>
				<CheckCircle size={20} class="nav-icon" aria-hidden="true" />
				{canReview ? 'Review Queue' : 'My Edits'}
				{#if canReview && pendingBadgeCount > 0}
					<span class="badge">{pendingBadgeCount}</span>
				{/if}
			</a>
		</li>
	</ul>

	<div class="nav-divider"></div>

	<form
		bind:this={formEl}
		method="post"
		action={resolve('/(app)/settings') + '?/updateSettings'}
		class="settings-section"
		use:enhance={() => {
			const formData = new FormData(formEl!);

			const theme = formData.get('theme')?.toString() ?? '';
			const themeValue = theme === 'light' || theme === 'dark' ? theme : null;
			applyThemeToDOM(themeValue);

			const charSet = formData.get('characterSet')?.toString() ?? '';
			const charSetValue = charSet === 'simplified' || charSet === 'traditional' ? charSet : null;

			const phoneticRaw = formData.get('phoneticScript')?.toString() ?? '';
			const phoneticValue =
				phoneticRaw === 'zhuyin' ||
				phoneticRaw === 'wadegiles' ||
				phoneticRaw === 'gwoyeu' ||
				phoneticRaw === 'cyrillic'
					? phoneticRaw
					: null;

			const current = readSettings();
			writeSettings({
				...current,
				theme: themeValue,
				characterSet: charSetValue,
				phoneticScript: phoneticValue
			});

			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
	>
		<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
		<div class="setting-row">
			<span class="setting-label">Theme</span>
			<SegmentedControl
				name="theme"
				options={themeOptions}
				selected={currentTheme === 'light' || currentTheme === 'dark' ? currentTheme : 'light'}
				onchange={() => formEl?.requestSubmit()}
			/>
		</div>
		<div class="setting-row">
			<span class="setting-label">Characters</span>
			<SegmentedControl
				name="characterSet"
				options={charSetOptions}
				selected={currentCharSet ?? 'simplified'}
				onchange={() => formEl?.requestSubmit()}
			/>
		</div>
		<div class="setting-row">
			<span class="setting-label">Phonetic</span>
			<select
				name="phoneticScript"
				class="phonetic-select"
				value={currentPhoneticScript}
				onchange={() => formEl?.requestSubmit()}
			>
				<option value="pinyin">Hànyǔ Pīnyīn</option>
				<option value="zhuyin">ㄅㄆㄇㄈ</option>
				<option value="wadegiles">Wade-Giles</option>
				<option value="gwoyeu">Gwoyeu Romatzyh</option>
				<option value="cyrillic">Силиэр</option>
			</select>
		</div>
		<noscript>
			<button type="submit">Save</button>
		</noscript>
	</form>

	<div class="nav-divider"></div>

	<ul class="nav-list">
		<li>
			<a href={resolve('/')} class="nav-link dong-link">
				<img src={favicon} alt="" class="dong-favicon" aria-hidden="true" />
				Dong Chinese
			</a>
		</li>
	</ul>
</nav>

<style>
	.sidebar {
		width: var(--sidebar-width);
		height: 100%;
		background: var(--background);
		border-right: 1px solid var(--border);
		overflow-y: auto;
		padding: 0.5rem 0;
		display: flex;
		flex-direction: column;
	}

	.nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.625rem 1.5rem;
		color: var(--foreground);
		text-decoration: none;
		font-size: 0.9375rem;
		font-weight: 500;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.nav-link:hover {
		background: var(--surface);
		color: var(--secondary-soft);
		text-decoration: none;
	}

	.nav-link[aria-current='page'] {
		background: color-mix(in srgb, var(--secondary) 8%, transparent);
		color: var(--secondary-soft);
		font-weight: 600;
		border-right: 3px solid var(--secondary-soft);
	}

	.nav-link :global(.nav-icon) {
		flex-shrink: 0;
		color: var(--muted-foreground);
		transition: color 0.15s;
	}

	.nav-link:hover :global(.nav-icon),
	.nav-link[aria-current='page'] :global(.nav-icon) {
		color: var(--secondary-soft);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.25rem;
		height: 1.25rem;
		padding: 0 0.375rem;
		font-size: 0.6875rem;
		font-weight: 600;
		line-height: 1;
		border-radius: 0.625rem;
		background: var(--secondary);
		color: var(--primary-foreground);
		margin-left: auto;
	}

	.nav-divider {
		height: 1px;
		background: var(--border);
		margin: 0.5rem 1rem;
	}

	/* Settings */

	.settings-section {
		padding: 0.5rem 1.25rem;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.375rem 0;
	}

	.setting-label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--muted-foreground);
		white-space: nowrap;
	}

	.phonetic-select {
		padding: 0.25rem 0.375rem;
		font-size: 0.8125rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--background);
		color: var(--foreground);
		cursor: pointer;
	}

	noscript button {
		margin-top: 0.5rem;
		padding: 0.25rem 0.75rem;
		background: var(--secondary);
		color: var(--primary-foreground);
		border: none;
		border-radius: var(--radius);
		font-size: 0.8125rem;
		font-weight: 500;
		cursor: pointer;
	}

	/* Dong Chinese link */

	.dong-link {
		color: var(--muted-foreground);
		font-size: 0.8125rem;
	}

	.dong-link:hover {
		color: var(--primary-soft);
		background: var(--surface);
	}

	.dong-favicon {
		width: 20px;
		height: 20px;
		object-fit: contain;
		opacity: 0.6;
		transition: opacity 0.15s;
	}

	.dong-link:hover .dong-favicon {
		opacity: 1;
	}
</style>

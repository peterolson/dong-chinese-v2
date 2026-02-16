<script lang="ts">
	import { enhance } from '$app/forms';
	import SocialIcon from './social-icon.svelte';
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle,
		socialProviders = [],
		redirectTo = '/',
		socialButtonPrefix = 'Continue with',
		alerts,
		socialExtra,
		children,
		afterColumns
	}: {
		title: string;
		subtitle?: string;
		socialProviders?: { name: 'google' | 'facebook' | 'github'; label: string }[];
		redirectTo?: string;
		socialButtonPrefix?: string;
		alerts?: Snippet;
		socialExtra?: Snippet;
		children: Snippet;
		afterColumns?: Snippet;
	} = $props();

	const hasSocial = $derived(socialProviders.length > 0);
</script>

<div class="auth-page">
	<div class="auth-card" class:wide={hasSocial}>
		<div class="card-body">
			<h1>{title}</h1>

			{#if subtitle}
				<p class="subtitle">{subtitle}</p>
			{/if}

			{#if alerts}
				{@render alerts()}
			{/if}

			<div class="auth-columns" class:has-social={hasSocial}>
				<div class="credentials-column">
					{@render children()}
				</div>

				{#if hasSocial}
					<div class="column-divider"><span>or</span></div>

					<div class="social-column">
						{#each socialProviders as provider (provider.name)}
							<form method="post" action="?/signInSocial" use:enhance>
								<input type="hidden" name="provider" value={provider.name} />
								<input type="hidden" name="redirectTo" value={redirectTo} />
								<button type="submit" class="social-btn social-{provider.name}">
									<SocialIcon provider={provider.name} />
									<span>{socialButtonPrefix} {provider.label}</span>
								</button>
							</form>
						{/each}

						{#if socialExtra}
							{@render socialExtra()}
						{/if}
					</div>
				{/if}
			</div>

			{#if afterColumns}
				{@render afterColumns()}
			{/if}
		</div>
	</div>
</div>

<style>
	/* ─── Page & Card ─────────────────────────────── */

	.auth-page {
		display: flex;
		margin: calc(-1 * var(--content-padding));
		padding: 2rem 1rem;
		background: var(--surface);
		min-height: calc(100vh - var(--header-height));
		justify-content: center;
	}

	@media (max-width: 600px) {
		.auth-page {
			margin: -1.25rem -1rem;
		}
	}

	.auth-card {
		width: 100%;
		max-width: 28rem;
		background: var(--background);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow:
			0 1px 3px rgba(0, 0, 0, 0.04),
			0 6px 16px rgba(0, 0, 0, 0.06);
		overflow: hidden;
		align-self: flex-start;
	}

	.auth-card.wide {
		max-width: 54rem;
	}

	.card-body {
		padding: 1.5rem;
	}

	@media (max-width: 659px) {
		.card-body {
			padding: 1.5rem;
		}
	}

	h1 {
		margin-bottom: 1.75rem;
		text-align: center;
		letter-spacing: -0.01em;
	}

	.subtitle {
		color: var(--muted-foreground);
		font-size: 0.875rem;
		text-align: center;
		margin-bottom: 1.75rem;
		margin-top: -1rem;
		line-height: 1.5;
	}

	/* ─── Two-Column Layout ───────────────────────── */

	.auth-columns {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	@media (min-width: 660px) {
		.auth-columns.has-social {
			flex-direction: row;
			align-items: stretch;
			gap: 0;
		}

		.auth-columns.has-social .credentials-column {
			flex: 1;
			padding-right: 1.75rem;
		}

		.auth-columns.has-social .social-column {
			flex: 1;
			padding-left: 1.75rem;
		}
	}

	/* ─── Social Column ───────────────────────────── */

	.social-column {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.social-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1.25rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.9375rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition:
			transform 0.15s,
			box-shadow 0.15s,
			background-color 0.15s,
			border-color 0.15s;
	}

	.social-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.social-btn:active {
		transform: translateY(0);
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
	}

	.social-google {
		background: #fff;
		color: #3c4043;
		border-color: #dadce0;
	}
	.social-google:hover {
		background: #f8f9fa;
		border-color: #c6c9cd;
	}

	.social-facebook {
		background: #1877f2;
		color: #fff;
		border-color: #1877f2;
	}
	.social-facebook:hover {
		background: #166fe5;
	}

	.social-github {
		background: #24292e;
		color: #fff;
		border-color: #24292e;
	}
	.social-github:hover {
		background: #2f363d;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light']):not([data-theme='dark'])) .social-github {
			background: #333a41;
			border-color: #444c56;
		}
		:global(:root:not([data-theme='light']):not([data-theme='dark'])) .social-github:hover {
			background: #3d444d;
		}
		:global(:root:not([data-theme='light']):not([data-theme='dark'])) .social-google {
			background: var(--surface);
			color: var(--foreground);
			border-color: var(--border);
		}
		:global(:root:not([data-theme='light']):not([data-theme='dark'])) .social-google:hover {
			background: var(--surface-hover);
		}
	}
	:global([data-theme='dark']) .social-github {
		background: #333a41;
		border-color: #444c56;
	}
	:global([data-theme='dark']) .social-github:hover {
		background: #3d444d;
	}
	:global([data-theme='dark']) .social-google {
		background: var(--surface);
		color: var(--foreground);
		border-color: var(--border);
	}
	:global([data-theme='dark']) .social-google:hover {
		background: var(--surface-hover);
	}

	/* ─── Column Divider ──────────────────────────── */

	.column-divider {
		display: flex;
		align-items: center;
		gap: 1rem;
		color: var(--muted-foreground);
		font-size: 0.8125rem;
	}

	.column-divider::before,
	.column-divider::after {
		content: '';
		flex: 1;
		border-top: 1px solid var(--border);
	}

	@media (min-width: 660px) {
		.auth-columns.has-social .column-divider {
			flex-direction: column;
			gap: 0.75rem;
			padding: 0;
		}

		.auth-columns.has-social .column-divider::before,
		.auth-columns.has-social .column-divider::after {
			border-top: none;
			border-left: 1px solid var(--border);
			min-height: 2rem;
			flex: 1;
		}
	}

	/* ─── Credentials Column ──────────────────────── */
	/* :global() so styles reach snippet content from pages */

	.credentials-column {
		display: flex;
		flex-direction: column;
	}

	.credentials-column :global(form) {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.credentials-column :global(label) {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.credentials-column :global(label > span) {
		font-weight: 500;
		font-size: 0.875rem;
	}

	.credentials-column :global(input[type='text']),
	.credentials-column :global(input[type='email']) {
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 1rem;
		font-family: inherit;
		background: var(--background);
		color: var(--foreground);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.credentials-column :global(input[type='text']:focus),
	.credentials-column :global(input[type='email']:focus) {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
	}

	.credentials-column :global(.auth-footer) {
		margin-top: 1.25rem;
		font-size: 0.875rem;
		text-align: center;
	}

	.credentials-column :global(.auth-links) {
		display: flex;
		justify-content: space-between;
		margin-top: 0.75rem;
		font-size: 0.875rem;
	}

	.credentials-column :global([role='alert']) {
		margin-bottom: 1rem;
	}
</style>

<script lang="ts">
	import { enhance } from '$app/forms';
	import Mail from 'lucide-svelte/icons/mail';
	import Alert from '../ui/alert.svelte';
	import ProgressButton from '../ui/progress-button.svelte';

	let {
		redirectTo = '/',
		label = 'Email me a sign in link',
		magicLinkMessage,
		magicLinkError
	}: {
		redirectTo?: string;
		label?: string;
		magicLinkMessage?: string;
		magicLinkError?: boolean;
	} = $props();

	let loading = $state(false);
</script>

{#if magicLinkMessage && !magicLinkError}
	<Alert variant="success">{magicLinkMessage}</Alert>
{:else}
	<details class="magic-link-details" open={magicLinkError || null}>
		<summary>
			<Mail size={16} aria-hidden="true" />
			<span>{label}</span>
			<span class="chevron"></span>
		</summary>
		<div class="magic-link-content">
			<form
				method="post"
				action="?/sendMagicLink"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						loading = false;
						await update();
					};
				}}
			>
				<input type="hidden" name="redirectTo" value={redirectTo} />

				{#if magicLinkMessage && magicLinkError}
					<Alert variant="error">{magicLinkMessage}</Alert>
				{/if}

				<div class="magic-link-row">
					<label class="magic-link-label">
						<span class="sr-only">Email</span>
						<input
							type="email"
							name="email"
							autocomplete="email"
							required
							placeholder="your@email.com"
						/>
					</label>
					<ProgressButton type="submit" variant="secondary" {loading}>Send</ProgressButton>
				</div>
			</form>
		</div>
	</details>
{/if}

<style>
	.magic-link-details {
		border-radius: var(--radius);
		border: 1px solid var(--border);
	}

	.magic-link-details summary {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		border-radius: var(--radius);
		font-size: 0.875rem;
		color: var(--muted-foreground);
		cursor: pointer;
		list-style: none;
		transition:
			color 0.15s,
			background-color 0.15s;
	}

	.magic-link-details summary::-webkit-details-marker {
		display: none;
	}

	.magic-link-details summary:hover {
		color: var(--foreground);
		background: var(--surface);
	}

	.magic-link-details summary .chevron {
		margin-left: auto;
		width: 7px;
		height: 7px;
		border-right: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		transform: rotate(45deg);
		transition: transform 0.2s ease;
		flex-shrink: 0;
	}

	.magic-link-details[open] summary .chevron {
		transform: rotate(225deg);
	}

	.magic-link-content {
		padding: 0.75rem 1rem;
	}

	.magic-link-content form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.magic-link-row {
		display: flex;
		gap: 0.5rem;
	}

	.magic-link-label {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.magic-link-label input[type='email'] {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		font-size: 0.875rem;
		font-family: inherit;
		background: var(--background);
		color: var(--foreground);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.magic-link-label input[type='email']:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>

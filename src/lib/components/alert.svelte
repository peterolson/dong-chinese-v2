<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleAlert from 'lucide-svelte/icons/circle-alert';
	import CircleCheck from 'lucide-svelte/icons/circle-check';
	import TriangleAlert from 'lucide-svelte/icons/triangle-alert';
	import Info from 'lucide-svelte/icons/info';

	type Variant = 'error' | 'success' | 'warning' | 'info';

	const icons = {
		error: CircleAlert,
		success: CircleCheck,
		warning: TriangleAlert,
		info: Info
	} as const;

	let { variant, children }: { variant: Variant; children: Snippet } = $props();

	const role = $derived(variant === 'error' || variant === 'warning' ? 'alert' : 'status');
	const Icon = $derived(icons[variant]);
</script>

<p class="alert {variant}" {role}>
	<Icon size={16} aria-hidden="true" />
	<span>{@render children()}</span>
</p>

<style>
	.alert {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: var(--radius);
		padding: 0.5rem 0.75rem;
	}

	.alert :global(svg) {
		flex-shrink: 0;
		margin-top: 0.125rem;
	}

	.error {
		color: var(--error);
		background: var(--error-bg);
		border: 1px solid var(--error);
	}

	.success {
		color: var(--success);
		background: var(--success-bg);
		border: 1px solid var(--success);
	}

	.warning {
		color: var(--warning);
		background: var(--warning-bg);
		border: 1px solid var(--warning);
	}

	.info {
		color: var(--info);
		background: var(--info-bg);
		border: 1px solid var(--info);
	}
</style>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'dashed' | 'ghost';
	type Size = 'default' | 'sm' | 'icon';

	let {
		variant = 'secondary',
		size = 'default',
		children,
		...rest
	}: HTMLButtonAttributes & { variant?: Variant; size?: Size; children: Snippet } = $props();
</script>

<button class="btn {variant} size-{size}" {...rest}>
	{@render children()}
</button>

<style>
	.btn {
		position: relative;
		overflow: hidden;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: var(--radius);
		font-size: 1rem;
		font-weight: 500;
		line-height: 1.5;
		cursor: pointer;
		transition: filter 0.15s;
	}

	.btn:hover {
		filter: brightness(0.9);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		filter: none;
	}

	/* Sizes */

	.size-sm {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
	}

	.size-icon {
		padding: 0.25rem;
		font-size: 1.25rem;
		line-height: 1;
	}

	/* Variants */

	.primary {
		background: var(--primary);
		color: var(--primary-foreground);
	}

	.secondary {
		background: var(--secondary);
		color: var(--primary-foreground);
	}

	.tertiary {
		background: var(--tertiary);
		color: var(--primary-foreground);
	}

	.outline {
		background: var(--background);
		color: var(--foreground);
		border: 1px solid var(--border);
	}

	.outline:hover {
		background: var(--surface);
		filter: none;
	}

	.dashed {
		background: transparent;
		color: var(--secondary-soft);
		border: 1px dashed var(--border);
		font-weight: 500;
	}

	.dashed:hover {
		background: var(--surface);
		filter: none;
	}

	.ghost {
		background: none;
		color: var(--muted-foreground);
		filter: none;
	}

	.ghost:hover {
		color: var(--error);
		filter: none;
	}
</style>

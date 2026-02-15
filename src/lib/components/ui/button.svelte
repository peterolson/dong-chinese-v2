<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'tertiary' | 'outline';

	let {
		variant = 'secondary',
		children,
		...rest
	}: HTMLButtonAttributes & { variant?: Variant; children: Snippet } = $props();
</script>

<button class="btn {variant}" {...rest}>
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
</style>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import LoaderCircle from 'lucide-svelte/icons/loader-circle';
	import Button from './button.svelte';

	type Variant = 'primary' | 'secondary' | 'tertiary' | 'outline';

	let {
		loading = false,
		variant = 'secondary',
		children,
		...rest
	}: HTMLButtonAttributes & { loading?: boolean; variant?: Variant; children: Snippet } = $props();
</script>

<Button {variant} disabled={loading} {...rest}>
	<span class="content" class:loading>
		{@render children()}
	</span>
	{#if loading}
		<span class="spinner" aria-hidden="true">
			<LoaderCircle size={18} />
		</span>
	{/if}
</Button>

<style>
	.content.loading {
		visibility: hidden;
	}

	.spinner {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>

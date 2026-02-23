<script lang="ts">
	let { status }: { status: string } = $props();
</script>

<span class="badge" data-status={status}>
	{status}
</span>

<style>
	.badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
	}

	.badge[data-status='pending'] {
		background: var(--warning-bg);
		color: var(--warning);
	}

	.badge[data-status='approved'] {
		background: var(--success-bg);
		color: var(--success);
	}

	.badge[data-status='rejected'] {
		background: var(--error-bg);
		color: var(--error);
	}
</style>

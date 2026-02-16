<script lang="ts">
	type Option = {
		value: string;
		label: string;
	};

	let {
		name,
		options,
		selected = '',
		onchange
	}: {
		name: string;
		options: Option[];
		selected?: string;
		onchange?: () => void;
	} = $props();
</script>

<span class="segmented-control">
	{#each options as option (option.value)}
		<label class="segment">
			<input
				type="radio"
				{name}
				value={option.value}
				checked={option.value === selected}
				{onchange}
			/>
			<span class="segment-label">{option.label}</span>
		</label>
	{/each}
</span>

<style>
	.segmented-control {
		display: flex;
		gap: 2px;
		background: var(--surface);
		border-radius: var(--radius);
		padding: 2px;
	}

	.segment {
		display: flex;
		cursor: pointer;
	}

	.segment input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.segment-label {
		display: flex;
		align-items: center;
		padding: 0.375rem 0.875rem;
		border-radius: calc(var(--radius) - 2px);
		font-size: 0.875rem;
		color: var(--muted-foreground);
		transition:
			background 0.15s,
			color 0.15s;
	}

	.segment:hover .segment-label {
		color: var(--foreground);
	}

	.segment:has(input:checked) .segment-label {
		background: var(--background);
		color: var(--foreground);
		font-weight: 500;
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.08);
	}
</style>

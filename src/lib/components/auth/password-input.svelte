<script lang="ts">
	import Eye from 'lucide-svelte/icons/eye';
	import EyeOff from 'lucide-svelte/icons/eye-off';
	import type { HTMLInputAttributes } from 'svelte/elements';

	let { ...rest }: Omit<HTMLInputAttributes, 'type'> = $props();

	let visible = $state(false);
</script>

<div class="password-field">
	<input type={visible ? 'text' : 'password'} {...rest} />
	<button
		type="button"
		class="toggle"
		onclick={() => (visible = !visible)}
		aria-label={visible ? 'Hide password' : 'Show password'}
	>
		{#if visible}
			<EyeOff size={18} aria-hidden="true" />
		{:else}
			<Eye size={18} aria-hidden="true" />
		{/if}
	</button>
</div>

<style>
	.password-field {
		position: relative;
	}

	.password-field input {
		width: 100%;
		padding: 0.625rem 2.75rem 0.625rem 0.75rem;
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

	.password-field input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
	}

	.toggle {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: none;
		border-radius: 4px;
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
		transition: color 0.15s;
	}

	.toggle:hover {
		color: var(--foreground);
	}
</style>

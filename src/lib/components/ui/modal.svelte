<script lang="ts">
	import type { Snippet } from 'svelte';
	import X from 'lucide-svelte/icons/x';

	interface Props {
		open: boolean;
		title: string;
		children: Snippet;
		onclose?: () => void;
	}

	let { open = $bindable(), title, children, onclose }: Props = $props();

	let dialogEl: HTMLDialogElement | undefined = $state();
	let bodyEl: HTMLDivElement | undefined = $state();

	const titleId = 'modal-title';

	$effect(() => {
		if (!dialogEl) return;
		if (open) {
			if (!dialogEl.open) dialogEl.showModal();
		} else {
			if (dialogEl.open) dialogEl.close();
		}
	});

	// Reset scroll when the modal opens or its content changes (title swap)
	$effect(() => {
		if (open && title && bodyEl) {
			bodyEl.scrollTop = 0;
		}
	});

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleClick(e: MouseEvent) {
		if (e.target === dialogEl) {
			handleClose();
		}
	}
</script>

<dialog bind:this={dialogEl} aria-labelledby={titleId} onclose={handleClose} onclick={handleClick}>
	<div class="modal-content">
		<header class="modal-header">
			<h2 id={titleId}>{title}</h2>
			<button class="close-btn" onclick={handleClose} aria-label="Close">
				<X size={20} />
			</button>
		</header>
		<div class="modal-body" bind:this={bodyEl}>
			{@render children()}
		</div>
	</div>
</dialog>

<style>
	dialog {
		position: fixed;
		inset: 0;
		margin: auto;
		max-width: 720px;
		width: calc(100% - 2rem);
		max-height: 85vh;
		border: none;
		border-radius: var(--radius);
		padding: 0;
		background: var(--background);
		color: var(--foreground);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
		z-index: 40;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
	}

	dialog[open] {
		animation: modal-in 0.2s ease-out;
	}

	dialog[open]::backdrop {
		animation: backdrop-in 0.2s ease-out;
	}

	@keyframes modal-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		dialog[open],
		dialog[open]::backdrop {
			animation: none;
		}
	}

	.modal-content {
		display: flex;
		flex-direction: column;
		max-height: 85vh;
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.125rem;
	}

	.close-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: none;
		border-radius: var(--radius);
		background: transparent;
		color: var(--muted-foreground);
		cursor: pointer;
	}

	.close-btn:hover {
		background: var(--surface);
		color: var(--foreground);
	}

	.modal-body {
		padding: 1.25rem;
		overflow-y: auto;
		flex: 1;
	}

	@media (max-width: 480px) {
		dialog {
			width: 100%;
			max-width: 100%;
			max-height: 100vh;
			height: 100vh;
			border-radius: 0;
			margin: 0;
		}

		.modal-content {
			max-height: 100vh;
			height: 100vh;
		}
	}
</style>

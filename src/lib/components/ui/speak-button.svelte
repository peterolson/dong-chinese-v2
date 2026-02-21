<script lang="ts">
	import { Volume2, Square } from 'lucide-svelte';
	import { speak, stopSpeaking, type SpeakOptions } from '$lib/speech';

	interface Props {
		text: string;
		label?: string;
		options?: SpeakOptions;
	}

	let { text, label = 'Listen', options }: Props = $props();
	let playing = $state(false);

	async function handleClick() {
		if (playing) {
			stopSpeaking();
			playing = false;
			return;
		}

		playing = true;
		try {
			await speak(text, options);
		} finally {
			playing = false;
		}
	}
</script>

<button
	class="speak-btn"
	class:playing
	onclick={handleClick}
	aria-label={playing ? 'Stop' : label}
	title={playing ? 'Stop' : label}
>
	{#if playing}
		<Square size={20} />
	{:else}
		<Volume2 size={20} />
	{/if}
</button>

<style>
	.speak-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.375rem;
		border: none;
		border-radius: var(--radius);
		background: transparent;
		color: var(--foreground);
		cursor: pointer;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.speak-btn:hover {
		background: var(--surface);
	}

	.speak-btn.playing {
		color: var(--primary);
	}
</style>

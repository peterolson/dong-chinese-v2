<script lang="ts">
	import CharEditForm from '$lib/components/wiki/char-edit-form.svelte';
	import Alert from '$lib/components/ui/alert.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

{#if form?.error}
	<div class="form-error">
		<Alert variant="error">{form.error}</Alert>
	</div>
{/if}

<CharEditForm
	character={data.character}
	canReview={data.canReview}
	pendingEdit={data.userPendingEdit}
/>

<style>
	.form-error {
		max-width: 800px;
		margin-bottom: 1rem;
	}
</style>

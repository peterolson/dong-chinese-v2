import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('should render navigation cards', async () => {
		render(Page, {
			props: {
				data: {
					user: null,
					settings: {}
				}
			}
		});

		const heading = page.getByRole('heading', { level: 2, name: 'Dictionary' });
		await expect.element(heading).toBeInTheDocument();
	});
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$app/navigation', () => ({
	afterNavigate: vi.fn()
}));

import { afterNavigate } from '$app/navigation';
import { closeSidebarOnNavigate } from './close-sidebar-on-navigate';

const afterNavigateMock = vi.mocked(afterNavigate);

describe('closeSidebarOnNavigate', () => {
	let checkbox: HTMLInputElement;
	let wrapper: HTMLDivElement;

	beforeEach(() => {
		afterNavigateMock.mockReset();

		checkbox = document.createElement('input');
		checkbox.type = 'checkbox';
		checkbox.id = 'sidebar-toggle';
		document.body.appendChild(checkbox);

		wrapper = document.createElement('div');
		wrapper.classList.add('sidebar-wrapper');
		document.body.appendChild(wrapper);
	});

	afterEach(() => {
		checkbox.remove();
		wrapper.remove();
	});

	function triggerNavigate() {
		const callback = afterNavigateMock.mock.calls[0][0];
		(callback as () => void)();
	}

	it('registers an afterNavigate callback', () => {
		closeSidebarOnNavigate();
		expect(afterNavigateMock).toHaveBeenCalledOnce();
	});

	it('unchecks the checkbox when sidebar is in mobile overlay mode (position: fixed)', () => {
		closeSidebarOnNavigate();
		checkbox.checked = true;
		wrapper.style.position = 'fixed';

		triggerNavigate();

		expect(checkbox.checked).toBe(false);
	});

	it('does nothing when checkbox is not checked', () => {
		closeSidebarOnNavigate();
		checkbox.checked = false;
		wrapper.style.position = 'fixed';

		triggerNavigate();

		expect(checkbox.checked).toBe(false);
	});

	it('does not uncheck when sidebar is in desktop mode (position: sticky)', () => {
		closeSidebarOnNavigate();
		checkbox.checked = true;
		wrapper.style.position = 'sticky';

		triggerNavigate();

		expect(checkbox.checked).toBe(true);
	});
});

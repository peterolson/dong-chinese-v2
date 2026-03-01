import { afterNavigate } from '$app/navigation';

/**
 * Closes the mobile sidebar overlay after client-side navigation.
 *
 * The sidebar toggle uses a CSS checkbox. On mobile the sidebar is `position: fixed`
 * and checked = open. On desktop it's `position: sticky` and checked = hidden.
 * We only uncheck when the sidebar is in mobile overlay mode.
 *
 * Call this once from any layout that has the sidebar checkbox + wrapper.
 */
export function closeSidebarOnNavigate(): void {
	afterNavigate(() => {
		const checkbox = document.getElementById('sidebar-toggle') as HTMLInputElement | null;
		if (!checkbox?.checked) return;
		// Only uncheck when sidebar is in mobile overlay mode (position: fixed).
		// On desktop it's position: sticky and checked means "hide sidebar" — leave it alone.
		const wrapper = document.querySelector('.sidebar-wrapper');
		if (wrapper && getComputedStyle(wrapper).position === 'fixed') {
			checkbox.checked = false;
		}
	});
}

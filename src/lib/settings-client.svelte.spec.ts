import { describe, expect, it, afterEach } from 'vitest';
import { readSettings, writeSettings, applyThemeToDOM } from './settings-client';

// ── readSettings ────────────────────────────────────────────────

describe('readSettings', () => {
	afterEach(() => {
		// Clear all cookies
		document.cookie.split(';').forEach((c) => {
			const name = c.trim().split('=')[0];
			if (name) document.cookie = `${name}=; max-age=0; path=/`;
		});
	});

	it('returns empty object when no cookie exists', () => {
		expect(readSettings()).toEqual({});
	});

	it('parses valid settings cookie', () => {
		document.cookie = `settings=${encodeURIComponent('{"theme":"dark"}')}; path=/`;
		expect(readSettings()).toEqual({ theme: 'dark' });
	});

	it('returns empty object for malformed JSON', () => {
		document.cookie = `settings=${encodeURIComponent('not-json')}; path=/`;
		expect(readSettings()).toEqual({});
	});

	it('handles cookie with = in value', () => {
		document.cookie = `settings=${encodeURIComponent('{"theme":"light"}')}; path=/`;
		expect(readSettings()).toEqual({ theme: 'light' });
	});
});

// ── writeSettings ───────────────────────────────────────────────

describe('writeSettings', () => {
	afterEach(() => {
		document.cookie.split(';').forEach((c) => {
			const name = c.trim().split('=')[0];
			if (name) document.cookie = `${name}=; max-age=0; path=/`;
		});
	});

	it('writes non-default settings to cookie', () => {
		writeSettings({ theme: 'dark' });
		expect(readSettings()).toEqual({ theme: 'dark' });
	});

	it('deletes cookie when all values are defaults', () => {
		writeSettings({ theme: 'dark' });
		writeSettings({ theme: null });
		expect(readSettings()).toEqual({});
	});
});

// ── applyThemeToDOM ─────────────────────────────────────────────

describe('applyThemeToDOM', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('data-theme');
	});

	it('sets data-theme="dark"', () => {
		applyThemeToDOM('dark');
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
	});

	it('sets data-theme="light"', () => {
		applyThemeToDOM('light');
		expect(document.documentElement.getAttribute('data-theme')).toBe('light');
	});

	it('removes data-theme when null (system default)', () => {
		document.documentElement.setAttribute('data-theme', 'dark');
		applyThemeToDOM(null);
		expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
	});
});

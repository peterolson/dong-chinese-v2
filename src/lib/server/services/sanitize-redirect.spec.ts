import { describe, expect, it } from 'vitest';
import { sanitizeRedirectTo } from './sanitize-redirect';

describe('sanitizeRedirectTo', () => {
	it('returns "/" for null', () => {
		expect(sanitizeRedirectTo(null)).toBe('/');
	});

	it('returns "/" for empty string', () => {
		expect(sanitizeRedirectTo('')).toBe('/');
	});

	it('allows a simple path', () => {
		expect(sanitizeRedirectTo('/dashboard')).toBe('/dashboard');
	});

	it('allows a nested path', () => {
		expect(sanitizeRedirectTo('/lessons/hsk-1/lesson-1')).toBe('/lessons/hsk-1/lesson-1');
	});

	it('allows root path', () => {
		expect(sanitizeRedirectTo('/')).toBe('/');
	});

	it('allows path with query string', () => {
		expect(sanitizeRedirectTo('/search?q=hello')).toBe('/search?q=hello');
	});

	it('blocks protocol-relative URLs (double slash)', () => {
		expect(sanitizeRedirectTo('//evil.com')).toBe('/');
	});

	it('blocks absolute URLs to external sites', () => {
		expect(sanitizeRedirectTo('https://evil.com')).toBe('/');
	});

	it('blocks javascript: protocol', () => {
		expect(sanitizeRedirectTo('javascript:alert(1)')).toBe('/');
	});

	it('blocks relative paths without leading slash', () => {
		expect(sanitizeRedirectTo('dashboard')).toBe('/');
	});
});

/**
 * Prevent open redirects: only allow paths starting with a single `/`.
 * Returns `/` for null, empty, or unsafe values.
 */
export function sanitizeRedirectTo(value: string | null): string {
	if (!value) return '/';
	// Must start with / and not //
	if (value.startsWith('/') && !value.startsWith('//')) return value;
	return '/';
}

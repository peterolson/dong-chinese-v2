/**
 * Mock for $app/paths in Storybook.
 * resolve() strips route groups like (app) and replaces [param] with provided values.
 */
export const base = '';
export const assets = '';

export function resolve(route: string, params?: Record<string, string>): string {
	// Strip route groups: (app), (auth), (marketing), etc.
	let path = route.replace(/\/\([^)]+\)/g, '');
	// Replace [param] placeholders
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			path = path.replace(`[${key}]`, encodeURIComponent(value));
		}
	}
	return path;
}

export const resolveRoute = resolve;

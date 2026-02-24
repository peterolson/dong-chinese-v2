import type { User, Session } from 'better-auth';
import type { UserSettings } from '$lib/settings';

// Augment $app/paths to allow dynamic string paths in resolve().
// SvelteKit's strict route typing rejects template literals and variables,
// but many components construct paths dynamically (e.g. `${charLinkBase}/${char}`).
declare module '$app/paths' {
	export function resolve(route: string, ...params: unknown[]): string;
}

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			user?: User;
			session?: Session;
			anonymousSessionId?: string;
			magicLinkUrl?: string;
			resetPasswordUrl?: string;
			settings: Partial<UserSettings>;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

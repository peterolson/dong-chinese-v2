import type { User, Session } from 'better-auth';
import type { UserSettings } from '$lib/settings';

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

import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import {
	COOKIE_NAME,
	MAX_AGE_SECONDS,
	createAnonymousSession,
	validateAnonymousSession
} from '$lib/server/services/anonymous-session';
import { SETTINGS_COOKIE } from '$lib/settings';
import type { UserSettings } from '$lib/settings';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

const handleAnonymousSession: Handle = async ({ event, resolve }) => {
	// Skip during build and for Better Auth API routes (auth handles its own sessions)
	if (building || event.url.pathname.startsWith('/api/auth')) {
		return resolve(event);
	}

	// If the user is authenticated, no anonymous session needed.
	// The cookie is kept around — it will be used for merge at login time
	// by the form action, then cleared.
	if (event.locals.user) {
		return resolve(event);
	}

	const existingId = event.cookies.get(COOKIE_NAME);

	if (existingId) {
		// Validate the session still exists in the DB
		const valid = await validateAnonymousSession(db, existingId);
		if (valid) {
			event.locals.anonymousSessionId = existingId;
		} else {
			// Session expired or was deleted — create a new one
			const newId = await createAnonymousSession(db);
			event.locals.anonymousSessionId = newId;
			event.cookies.set(COOKIE_NAME, newId, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: event.url.protocol === 'https:',
				maxAge: MAX_AGE_SECONDS
			});
		}
	} else {
		// First visit — create anonymous session
		const newId = await createAnonymousSession(db);
		event.locals.anonymousSessionId = newId;
		event.cookies.set(COOKIE_NAME, newId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: event.url.protocol === 'https:',
			maxAge: MAX_AGE_SECONDS
		});
	}

	return resolve(event);
};

const handleSettings: Handle = async ({ event, resolve }) => {
	const raw = event.cookies.get(SETTINGS_COOKIE);
	let settings: Partial<UserSettings> = {};
	if (raw) {
		try {
			settings = JSON.parse(raw);
		} catch {
			// Invalid cookie, ignore
		}
	}
	event.locals.settings = settings;

	return resolve(event, {
		transformPageChunk: ({ html }) => {
			const theme = event.locals.settings.theme;
			if (theme === 'light' || theme === 'dark') {
				return html.replace('<html', `<html data-theme="${theme}"`);
			}
			return html;
		}
	});
};

// Better Auth runs first (sets locals.user), then anonymous session, then settings
export const handle: Handle = sequence(handleBetterAuth, handleAnonymousSession, handleSettings);

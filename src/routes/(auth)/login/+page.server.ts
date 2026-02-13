import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth, getConfiguredSocialProviders } from '$lib/server/auth';
import { APIError } from 'better-auth';

function sanitizeRedirectTo(value: string | null): string {
	if (!value) return '/';
	// Prevent open redirects: must start with / and not //
	if (value.startsWith('/') && !value.startsWith('//')) return value;
	return '/';
}

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		redirect(302, '/');
	}
	return {
		socialProviders: getConfiguredSocialProviders(),
		redirectTo: sanitizeRedirectTo(event.url.searchParams.get('redirectTo'))
	};
};

export const actions: Actions = {
	signIn: async (event) => {
		const formData = await event.request.formData();
		const identifier = formData.get('identifier')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const redirectTo = sanitizeRedirectTo(formData.get('redirectTo')?.toString() ?? null);

		if (!identifier || !password) {
			return fail(400, { message: 'Email or username and password are required.', identifier });
		}

		try {
			if (identifier.includes('@')) {
				await auth.api.signInEmail({
					body: { email: identifier, password }
				});
			} else {
				await auth.api.signInUsername({
					body: { username: identifier, password }
				});
			}
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { message: 'Invalid credentials.', identifier });
			}
			return fail(500, {
				message: 'An unexpected error occurred. Please try again.',
				identifier
			});
		}

		redirect(302, redirectTo);
	},

	signInSocial: async (event) => {
		const formData = await event.request.formData();
		const provider = formData.get('provider')?.toString() ?? '';
		const redirectTo = sanitizeRedirectTo(formData.get('redirectTo')?.toString() ?? null);

		const configured = getConfiguredSocialProviders();
		if (!configured.some((p) => p.name === provider)) {
			return fail(400, { message: 'Invalid provider.' });
		}

		const result = await auth.api.signInSocial({
			body: {
				provider: provider as 'github',
				callbackURL: redirectTo
			}
		});

		if (result.url) {
			redirect(302, result.url);
		}

		return fail(400, { message: 'Social sign-in failed.' });
	},

	signOut: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});

		redirect(302, '/');
	}
};

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth, getConfiguredSocialProviders } from '$lib/server/auth';
import { sanitizeRedirectTo } from '$lib/server/services/sanitize-redirect';
import { handleSendMagicLink } from '$lib/server/services/magic-link';
import { syncSettingsOnSignup } from '$lib/server/services/settings';
import { db } from '$lib/server/db';
import { APIError } from 'better-auth';

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
	signUp: async (event) => {
		const formData = await event.request.formData();
		const name = formData.get('name')?.toString()?.trim() ?? '';
		const email = formData.get('email')?.toString()?.trim().toLowerCase() ?? '';
		const username = formData.get('username')?.toString()?.trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';
		const redirectTo = sanitizeRedirectTo(formData.get('redirectTo')?.toString() ?? null);

		if (!email || !password) {
			return fail(400, {
				message: 'Email and password are required.',
				name,
				email,
				username
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				message: 'Passwords do not match.',
				name,
				email,
				username
			});
		}

		let userId: string | undefined;

		try {
			const result = await auth.api.signUpEmail({
				body: {
					name: name || email.split('@')[0],
					email,
					password,
					...(username ? { username } : {})
				}
			});
			userId = result.user?.id;
		} catch (error) {
			if (error instanceof APIError) {
				const msg = error.body?.message ?? error.message;
				if (typeof msg === 'string' && msg.toLowerCase().includes('user already exists')) {
					return fail(400, {
						message: 'An account with this email already exists.',
						name,
						email,
						username
					});
				}
				if (typeof msg === 'string' && msg.toLowerCase().includes('username')) {
					return fail(400, {
						message: 'This username is already taken.',
						name,
						email,
						username
					});
				}
				return fail(400, {
					message: typeof msg === 'string' ? msg : 'Could not create account.',
					name,
					email,
					username
				});
			}
			return fail(500, {
				message: 'An unexpected error occurred. Please try again.',
				name,
				email,
				username
			});
		}

		if (userId) {
			await syncSettingsOnSignup(db, userId, event.cookies);
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

	sendMagicLink: async (event) => {
		return handleSendMagicLink(event);
	}
};

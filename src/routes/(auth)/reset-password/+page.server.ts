import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth';

export const load: PageServerLoad = async (event) => {
	const token = event.url.searchParams.get('token');

	if (!token) {
		redirect(302, '/forgot-password');
	}

	return { token };
};

export const actions: Actions = {
	resetPassword: async (event) => {
		const formData = await event.request.formData();
		const token = formData.get('token')?.toString() ?? '';
		const newPassword = formData.get('newPassword')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		if (!token) {
			return fail(400, { message: 'Invalid or missing reset token.' });
		}

		if (!newPassword) {
			return fail(400, { message: 'Password is required.' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.' });
		}

		try {
			await auth.api.resetPassword({
				body: { newPassword, token }
			});
		} catch (error) {
			if (error instanceof APIError) {
				const msg = error.body?.message ?? error.message;
				if (typeof msg === 'string' && msg.toLowerCase().includes('token')) {
					return fail(400, {
						message: 'This reset link has expired or is invalid. Please request a new one.'
					});
				}
				return fail(400, {
					message: typeof msg === 'string' ? msg : 'Could not reset password.'
				});
			}
			return fail(500, {
				message: 'An unexpected error occurred. Please try again.'
			});
		}

		redirect(302, '/login?reset=success');
	}
};

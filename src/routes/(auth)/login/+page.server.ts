import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth, getConfiguredSocialProviders } from '$lib/server/auth';
import { sanitizeRedirectTo } from '$lib/server/services/sanitize-redirect';
import { sendEmail } from '$lib/server/services/email';
import { APIError } from 'better-auth';
import { db } from '$lib/server/db';
import { userEmail } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';

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
				// Look up user_email table to resolve secondary emails to the primary email
				let loginEmail = identifier;
				const emailRecord = await db
					.select({ userId: userEmail.userId })
					.from(userEmail)
					.innerJoin(user, eq(user.id, userEmail.userId))
					.where(eq(userEmail.email, identifier.toLowerCase()))
					.limit(1);

				if (emailRecord.length > 0) {
					// Use the user's primary email (from user table) for Better Auth
					const userRecord = await db
						.select({ email: user.email })
						.from(user)
						.where(eq(user.id, emailRecord[0].userId))
						.limit(1);
					if (userRecord.length > 0) {
						loginEmail = userRecord[0].email;
					}
				}

				await auth.api.signInEmail({
					body: { email: loginEmail, password }
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

	sendMagicLink: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString()?.trim().toLowerCase() ?? '';
		const redirectTo = sanitizeRedirectTo(formData.get('redirectTo')?.toString() ?? null);

		if (!email) {
			return fail(400, { magicLinkMessage: 'Email is required.', magicLinkError: true });
		}

		// Resolve secondary emails to primary for Better Auth lookup
		let authEmail = email;
		let isNewUser = true;

		// Check user_email table (secondary emails)
		const emailRecord = await db
			.select({ userId: userEmail.userId })
			.from(userEmail)
			.innerJoin(user, eq(user.id, userEmail.userId))
			.where(eq(userEmail.email, email))
			.limit(1);

		if (emailRecord.length > 0) {
			isNewUser = false;
			const userRecord = await db
				.select({ email: user.email })
				.from(user)
				.where(eq(user.id, emailRecord[0].userId))
				.limit(1);
			if (userRecord.length > 0) {
				authEmail = userRecord[0].email;
			}
		} else {
			// Check primary email in user table
			const primaryRecord = await db
				.select({ id: user.id })
				.from(user)
				.where(eq(user.email, email))
				.limit(1);
			if (primaryRecord.length > 0) {
				isNewUser = false;
			}
		}

		try {
			await auth.api.signInMagicLink({
				body: { email: authEmail, callbackURL: redirectTo },
				headers: event.request.headers
			});
		} catch {
			return fail(500, {
				magicLinkMessage: 'Something went wrong. Please try again.',
				magicLinkError: true
			});
		}

		const magicLinkUrl = event.locals.magicLinkUrl;
		if (!magicLinkUrl) {
			return fail(500, {
				magicLinkMessage: 'Something went wrong. Please try again.',
				magicLinkError: true
			});
		}

		// Send to the original email the user typed, not the resolved primary
		const subject = isNewUser
			? 'Create your Dong Chinese account'
			: 'Sign in to Dong Chinese';
		const action = isNewUser ? 'create your account' : 'sign in';
		const sent = await sendEmail(
			email,
			subject,
			`<p>Click the link below to ${action}:</p>
<p><a href="${magicLinkUrl}">${isNewUser ? 'Create account' : 'Sign in'}</a></p>
<p>This link expires in 5 minutes. If you didn't request this, you can safely ignore this email.</p>`,
			`${subject}:\n\n${magicLinkUrl}\n\nThis link expires in 5 minutes. If you didn't request this, you can safely ignore this email.`
		);

		if (!sent) {
			return fail(500, {
				magicLinkMessage: 'Failed to send email. Please try again.',
				magicLinkError: true
			});
		}

		const successMessage = isNewUser
			? 'Check your email for a link to create your account.'
			: 'Check your email for a sign-in link.';
		return { magicLinkMessage: successMessage };
	},

	signOut: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});

		redirect(302, '/');
	}
};

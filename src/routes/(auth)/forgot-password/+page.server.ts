import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { sendEmail } from '$lib/server/services/email';
import { db } from '$lib/server/db';
import { userEmail } from '$lib/server/db/schema';
import { user } from '$lib/server/db/auth.schema';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user) {
		redirect(302, '/');
	}
};

export const actions: Actions = {
	requestReset: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString()?.trim().toLowerCase() ?? '';

		if (!email) {
			return fail(400, { message: 'Email is required.', email });
		}

		// Resolve secondary emails to primary for Better Auth lookup
		let authEmail = email;
		const emailRecord = await db
			.select({ userId: userEmail.userId })
			.from(userEmail)
			.innerJoin(user, eq(user.id, userEmail.userId))
			.where(eq(userEmail.email, email))
			.limit(1);

		if (emailRecord.length > 0) {
			const userRecord = await db
				.select({ email: user.email })
				.from(user)
				.where(eq(user.id, emailRecord[0].userId))
				.limit(1);
			if (userRecord.length > 0) {
				authEmail = userRecord[0].email;
			}
		}

		try {
			await auth.api.requestPasswordReset({
				body: {
					email: authEmail,
					redirectTo: `${event.url.origin}/reset-password`
				},
				headers: event.request.headers
			});
		} catch {
			// Silently handle errors — don't reveal whether the email exists
		}

		// Check if the reset URL was stashed by the sendResetPassword callback
		const resetUrl = event.locals.resetPasswordUrl;
		if (resetUrl) {
			// Send to the email the user typed (not the resolved primary)
			await sendEmail(
				email,
				'Reset your Dong Chinese password',
				`<p>Click the link below to reset your password:</p>
<p><a href="${resetUrl}">Reset password</a></p>
<p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>`,
				`Reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.`
			);
		}

		// Always return success to prevent email enumeration
		return { success: true };
	}
};

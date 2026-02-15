import { createHash } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins/magic-link';
import { username } from 'better-auth/plugins/username';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { userEmail } from '$lib/server/db/schema';
import { sendEmail } from '$lib/server/services/email';

export type SocialProviderName = 'github' | 'google' | 'facebook';

const socialProviderConfig: Record<
	SocialProviderName,
	{ clientIdVar: string; clientSecretVar: string; label: string; order: number }
> = {
	google: {
		clientIdVar: 'GOOGLE_CLIENT_ID',
		clientSecretVar: 'GOOGLE_CLIENT_SECRET',
		label: 'Google',
		order: 1
	},
	facebook: {
		clientIdVar: 'FACEBOOK_CLIENT_ID',
		clientSecretVar: 'FACEBOOK_CLIENT_SECRET',
		label: 'Facebook',
		order: 2
	},
	github: {
		clientIdVar: 'GITHUB_CLIENT_ID',
		clientSecretVar: 'GITHUB_CLIENT_SECRET',
		label: 'GitHub',
		order: 3
	}
};

export function getConfiguredSocialProviders(): Array<{ name: SocialProviderName; label: string }> {
	const providers: Array<{ name: SocialProviderName; label: string; order: number }> = [];
	for (const [name, config] of Object.entries(socialProviderConfig)) {
		if (env[config.clientIdVar] && env[config.clientSecretVar]) {
			providers.push({
				name: name as SocialProviderName,
				label: config.label,
				order: config.order
			});
		}
	}
	return providers.sort((a, b) => a.order - b.order);
}

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	databaseHooks: {
		user: {
			create: {
				after: async (user) => {
					await db
						.insert(userEmail)
						.values({
							userId: user.id,
							email: user.email,
							verified: user.emailVerified ?? false,
							isPrimary: true
						})
						.onConflictDoNothing();
				}
			},
			update: {
				after: async (user) => {
					if (user.emailVerified) {
						await db
							.update(userEmail)
							.set({ verified: true, updatedAt: new Date() })
							.where(and(eq(userEmail.userId, user.id), eq(userEmail.email, user.email)));
					}
				}
			}
		}
	},
	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail(
				user.email,
				'Verify your email — Dong Chinese',
				`<p>Click the link below to verify your email address:</p>
				 <p><a href="${url}">Verify email</a></p>
				 <p>This link expires in 1 hour.</p>`,
				`Verify your email:\n\n${url}\n\nThis link expires in 1 hour.`
			);
		}
	},
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 1,
		sendResetPassword: async ({ url }) => {
			const event = getRequestEvent();
			event.locals.resetPasswordUrl = url;
		},
		password: {
			hash: async (password) => {
				const bcrypt = await import('bcryptjs');
				const sha256 = createHash('sha256').update(password).digest('hex');
				return bcrypt.default.hash(sha256, 10);
			},
			verify: async ({ hash, password }) => {
				const bcrypt = await import('bcryptjs');
				const sha256 = createHash('sha256').update(password).digest('hex');
				return bcrypt.default.compare(sha256, hash);
			}
		}
	},
	socialProviders: {
		...(env.GITHUB_CLIENT_ID &&
			env.GITHUB_CLIENT_SECRET && {
				github: {
					clientId: env.GITHUB_CLIENT_ID,
					clientSecret: env.GITHUB_CLIENT_SECRET
				}
			}),
		...(env.GOOGLE_CLIENT_ID &&
			env.GOOGLE_CLIENT_SECRET && {
				google: {
					clientId: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET
				}
			}),
		...(env.FACEBOOK_CLIENT_ID &&
			env.FACEBOOK_CLIENT_SECRET && {
				facebook: {
					clientId: env.FACEBOOK_CLIENT_ID,
					clientSecret: env.FACEBOOK_CLIENT_SECRET
				}
			})
	},
	plugins: [
		username({
			minUsernameLength: 1,
			maxUsernameLength: 255,
			usernameValidator: () => true
		}),
		magicLink({
			expiresIn: 300,
			disableSignUp: false,
			sendMagicLink: async ({ url }) => {
				// Don't send here — stash the URL so the form action can send
				// to the correct recipient with the right content.
				const event = getRequestEvent();
				event.locals.magicLinkUrl = url;
			}
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

export type AuthUser = (typeof auth)['$Infer']['Session']['user'];

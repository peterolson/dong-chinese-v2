import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins/username';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

export type SocialProviderName = 'github' | 'google' | 'facebook' | 'twitter';

const socialProviderConfig: Record<
	SocialProviderName,
	{ clientIdVar: string; clientSecretVar: string; label: string }
> = {
	github: {
		clientIdVar: 'GITHUB_CLIENT_ID',
		clientSecretVar: 'GITHUB_CLIENT_SECRET',
		label: 'GitHub'
	},
	google: {
		clientIdVar: 'GOOGLE_CLIENT_ID',
		clientSecretVar: 'GOOGLE_CLIENT_SECRET',
		label: 'Google'
	},
	facebook: {
		clientIdVar: 'FACEBOOK_CLIENT_ID',
		clientSecretVar: 'FACEBOOK_CLIENT_SECRET',
		label: 'Facebook'
	},
	twitter: {
		clientIdVar: 'TWITTER_CLIENT_ID',
		clientSecretVar: 'TWITTER_CLIENT_SECRET',
		label: 'Twitter'
	}
};

export function getConfiguredSocialProviders(): Array<{ name: SocialProviderName; label: string }> {
	const providers: Array<{ name: SocialProviderName; label: string }> = [];
	for (const [name, config] of Object.entries(socialProviderConfig)) {
		if (env[config.clientIdVar] && env[config.clientSecretVar]) {
			providers.push({ name: name as SocialProviderName, label: config.label });
		}
	}
	return providers;
}

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: { enabled: true },
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
			}),
		...(env.TWITTER_CLIENT_ID &&
			env.TWITTER_CLIENT_SECRET && {
				twitter: {
					clientId: env.TWITTER_CLIENT_ID,
					clientSecret: env.TWITTER_CLIENT_SECRET
				}
			})
	},
	plugins: [
		username({
			minUsernameLength: 1,
			maxUsernameLength: 255,
			usernameValidator: () => true
		}),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});

export type AuthUser = (typeof auth)['$Infer']['Session']['user'];

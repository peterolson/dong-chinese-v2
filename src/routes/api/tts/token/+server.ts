import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

let cachedToken: string | null = null;
let cachedAt = 0;
const CACHE_DURATION_MS = 9 * 60 * 1000; // 9 minutes (Azure tokens last 10 min)

export const GET: RequestHandler = async () => {
	const subscriptionKey = env.TTS_SUBSCRIPTION_KEY;
	const tokenEndpoint = env.TTS_TOKEN_ENDPOINT;

	if (!subscriptionKey || !tokenEndpoint) {
		error(503, 'TTS service not configured');
	}

	const now = Date.now();
	if (cachedToken && now - cachedAt < CACHE_DURATION_MS) {
		return json({ token: cachedToken });
	}

	let response: Response;
	try {
		response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Ocp-Apim-Subscription-Key': subscriptionKey,
				'Content-Length': '0'
			}
		});
	} catch {
		error(502, 'Failed to reach Azure token service');
	}

	if (!response.ok) {
		error(502, `Azure token service returned ${response.status}`);
	}

	const token = await response.text();
	cachedToken = token;
	cachedAt = now;

	return json({ token });
};

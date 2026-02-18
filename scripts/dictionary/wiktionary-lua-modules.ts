/**
 * Shared utility for downloading and parsing Wiktionary Lua data modules.
 *
 * Used by import-baxter-sagart.ts and import-zhengzhang.ts.
 * Both datasets are stored as Lua table modules on English Wiktionary
 * under Module:zh/data/och-pron-{BS,ZS}/.
 *
 * License: CC BY-SA 4.0 (Wiktionary content)
 */

const WIKTIONARY_API = 'https://en.wiktionary.org/w/api.php';
const BATCH_SIZE = 50; // max pages per API request
const DELAY_MS = 500; // delay between API requests to be respectful
const MAX_RETRIES = 5;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string): Promise<Response> {
	for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
		const response = await fetch(url);
		if (response.ok) return response;
		if (response.status === 429) {
			const backoff = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s, 16s, 32s
			console.warn(`  Rate limited (429), waiting ${backoff / 1000}s before retry...`);
			await delay(backoff);
			continue;
		}
		throw new Error(`API error: ${response.status}`);
	}
	throw new Error(`API error: 429 after ${MAX_RETRIES} retries`);
}

/**
 * Enumerate all module titles under a given prefix using the allpages API.
 */
export async function listModuleTitles(prefix: string): Promise<string[]> {
	const titles: string[] = [];
	let apcontinue = '';

	while (true) {
		const params = new URLSearchParams({
			action: 'query',
			list: 'allpages',
			apnamespace: '828', // Module namespace
			apprefix: prefix,
			aplimit: '500',
			format: 'json'
		});
		if (apcontinue) params.set('apcontinue', apcontinue);

		const response = await fetchWithRetry(`${WIKTIONARY_API}?${params}`);
		const data = (await response.json()) as {
			query?: { allpages?: { title: string }[] };
			continue?: { apcontinue?: string };
		};

		const pages = data.query?.allpages ?? [];
		for (const p of pages) titles.push(p.title);

		if (data.continue?.apcontinue) {
			apcontinue = data.continue.apcontinue;
		} else {
			break;
		}

		await delay(DELAY_MS);
	}

	return titles;
}

/**
 * Batch-fetch raw content of multiple module pages.
 * Returns a Map of title -> raw Lua content.
 */
export async function fetchModuleContents(
	titles: string[],
	onProgress?: (fetched: number, total: number) => void
): Promise<Map<string, string>> {
	const contents = new Map<string, string>();

	for (let i = 0; i < titles.length; i += BATCH_SIZE) {
		const batch = titles.slice(i, i + BATCH_SIZE);
		const params = new URLSearchParams({
			action: 'query',
			prop: 'revisions',
			rvprop: 'content',
			rvslots: 'main',
			titles: batch.join('|'),
			format: 'json'
		});

		const response = await fetchWithRetry(`${WIKTIONARY_API}?${params}`);
		const data = (await response.json()) as {
			query?: {
				pages?: Record<
					string,
					{
						title: string;
						revisions?: { slots?: { main?: { '*'?: string; content?: string } } }[];
					}
				>;
			};
		};

		const pages = data.query?.pages ?? {};
		for (const page of Object.values(pages)) {
			const rev = page.revisions?.[0];
			const content = rev?.slots?.main?.['*'] ?? rev?.slots?.main?.content ?? '';
			if (content && page.title) {
				contents.set(page.title, content);
			}
		}

		if (onProgress) onProgress(Math.min(i + BATCH_SIZE, titles.length), titles.length);
		if (i + BATCH_SIZE < titles.length) await delay(DELAY_MS);
	}

	return contents;
}

/**
 * Parse a Wiktionary Lua module that returns a table of character -> readings.
 *
 * Format:
 *   return {
 *     ["字"] = { { "f1", "f2", ... }, { "f1", "f2", ... } },
 *     ...
 *   }
 *
 * Returns a Map of character -> array of string arrays (readings).
 */
export function parseLuaModule(content: string): Map<string, string[][]> {
	const result = new Map<string, string[][]>();

	// Strip "return" prefix and outer braces
	let body = content.trim();
	if (body.startsWith('return')) body = body.slice(6).trim();
	if (body.startsWith('{')) body = body.slice(1);
	if (body.endsWith('}')) body = body.slice(0, -1);

	// Match each ["char"] = { ... } entry using a state machine approach
	let pos = 0;
	while (pos < body.length) {
		// Find next ["..."] key
		const keyStart = body.indexOf('["', pos);
		if (keyStart === -1) break;

		const keyEnd = body.indexOf('"]', keyStart + 2);
		if (keyEnd === -1) break;

		const character = body.slice(keyStart + 2, keyEnd);
		pos = keyEnd + 2;

		// Find the = sign
		const eqPos = body.indexOf('=', pos);
		if (eqPos === -1) break;
		pos = eqPos + 1;

		// Find the outer { for the value (which is a table of tables)
		const outerBrace = body.indexOf('{', pos);
		if (outerBrace === -1) break;

		// Find matching closing brace, counting depth
		let depth = 1;
		let j = outerBrace + 1;
		while (j < body.length && depth > 0) {
			const ch = body[j];
			if (ch === '{') {
				depth++;
			} else if (ch === '}') {
				depth--;
			} else if (ch === '"' || ch === "'") {
				// Skip over string content
				const quote = ch;
				j++;
				while (j < body.length && body[j] !== quote) {
					if (body[j] === '\\') j++; // skip escaped char
					j++;
				}
			}
			j++;
		}

		const valueStr = body.slice(outerBrace + 1, j - 1);
		pos = j;

		// Parse inner arrays: { "f1", "f2", ... }
		const readings: string[][] = [];
		let innerPos = 0;
		while (innerPos < valueStr.length) {
			const innerBrace = valueStr.indexOf('{', innerPos);
			if (innerBrace === -1) break;

			// Find matching }
			let innerDepth = 1;
			let k = innerBrace + 1;
			while (k < valueStr.length && innerDepth > 0) {
				const ch = valueStr[k];
				if (ch === '{') innerDepth++;
				else if (ch === '}') innerDepth--;
				else if (ch === '"' || ch === "'") {
					const quote = ch;
					k++;
					while (k < valueStr.length && valueStr[k] !== quote) {
						if (valueStr[k] === '\\') k++;
						k++;
					}
				}
				k++;
			}

			const innerStr = valueStr.slice(innerBrace + 1, k - 1);
			innerPos = k;

			// Extract string values from the inner array
			const fields: string[] = [];
			let fPos = 0;
			while (fPos < innerStr.length) {
				// Find next string (double or single quoted)
				let nextDouble = innerStr.indexOf('"', fPos);
				let nextSingle = innerStr.indexOf("'", fPos);
				if (nextDouble === -1) nextDouble = Infinity;
				if (nextSingle === -1) nextSingle = Infinity;

				if (nextDouble === Infinity && nextSingle === Infinity) break;

				const quote = nextDouble < nextSingle ? '"' : "'";
				const start = Math.min(nextDouble, nextSingle) + 1;
				let end = start;
				while (end < innerStr.length && innerStr[end] !== quote) {
					if (innerStr[end] === '\\') end++;
					end++;
				}

				let value = innerStr.slice(start, end);
				// Decode HTML entities
				value = value.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
				value = value.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
					String.fromCharCode(parseInt(code, 16))
				);
				value = value.replace(/&amp;/g, '&');
				value = value.replace(/&lt;/g, '<');
				value = value.replace(/&gt;/g, '>');
				value = value.replace(/&quot;/g, '"');

				fields.push(value);
				fPos = end + 1;
			}

			if (fields.length > 0) {
				readings.push(fields);
			}
		}

		if (readings.length > 0) {
			const existing = result.get(character);
			if (existing) {
				// Character appears in multiple modules — merge readings
				for (const r of readings) existing.push(r);
			} else {
				result.set(character, readings);
			}
		}
	}

	return result;
}

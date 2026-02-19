import { env } from '$env/dynamic/public';
import { convertToneToNumber, isTonedPinyin } from './pinyin';

const CDN_BASE = 'https://data.dong-chinese.com';

export interface SpeakOptions {
	voice?: string;
	speed?: number;
	pitch?: string;
}

const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural';
const DEFAULT_SPEED = 1.0;
const DEFAULT_PITCH = '+0%';

// --- Audio management ---

let currentAudio: HTMLAudioElement | null = null;
let speaking = false;

export function isSpeaking(): boolean {
	return speaking;
}

export function stopSpeaking(): void {
	if (currentAudio) {
		currentAudio.pause();
		currentAudio.currentTime = 0;
		currentAudio = null;
	}
	if (typeof speechSynthesis !== 'undefined') {
		speechSynthesis.cancel();
	}
	speaking = false;
}

function playUrl(url: string): Promise<boolean> {
	return new Promise((resolve) => {
		stopSpeaking();
		const audio = new Audio(url);
		currentAudio = audio;
		speaking = true;

		audio.addEventListener('ended', () => {
			speaking = false;
			currentAudio = null;
			resolve(true);
		});
		audio.addEventListener('error', () => {
			speaking = false;
			currentAudio = null;
			resolve(false);
		});
		audio.play().catch(() => {
			speaking = false;
			currentAudio = null;
			resolve(false);
		});
	});
}

function playBlob(blob: Blob): Promise<boolean> {
	const url = URL.createObjectURL(blob);
	return playUrl(url).finally(() => URL.revokeObjectURL(url));
}

// --- Lazy-loaded CDN data ---

let pinyinDictPromise: Promise<Record<string, string[]>> | null = null;
let hskSetPromise: Promise<Set<string>> | null = null;
let hskT2sPromise: Promise<Record<string, string>> | null = null;

function loadPinyinDict(): Promise<Record<string, string[]>> {
	if (!pinyinDictPromise) {
		pinyinDictPromise = fetch(`${CDN_BASE}/json/pinyinDict.json`)
			.then((r) => r.json())
			.catch(() => {
				pinyinDictPromise = null;
				return {};
			});
	}
	return pinyinDictPromise;
}

function loadHskSet(): Promise<Set<string>> {
	if (!hskSetPromise) {
		hskSetPromise = fetch(`${CDN_BASE}/json/HSKList.json`)
			.then((r) => r.json())
			.then((words: string[]) => new Set(words))
			.catch(() => {
				hskSetPromise = null;
				return new Set<string>();
			});
	}
	return hskSetPromise;
}

function loadHskT2s(): Promise<Record<string, string>> {
	if (!hskT2sPromise) {
		hskT2sPromise = fetch(`${CDN_BASE}/json/HSKt2s.json`)
			.then((r) => r.json())
			.catch(() => {
				hskT2sPromise = null;
				return {};
			});
	}
	return hskT2sPromise;
}

// --- Azure TTS ---

let azureToken: string | null = null;
let azureTokenFetchedAt = 0;
const AZURE_TOKEN_CACHE_MS = 8 * 60 * 1000; // 8 minutes
let lastAzureCallAt = 0;
const AZURE_THROTTLE_MS = 1000;
const azureBlobCache = new Map<string, Blob>();

async function getAzureToken(): Promise<string | null> {
	const now = Date.now();
	if (azureToken && now - azureTokenFetchedAt < AZURE_TOKEN_CACHE_MS) {
		return azureToken;
	}

	try {
		const response = await fetch('/api/tts/token');
		if (!response.ok) return null;
		const data = await response.json();
		azureToken = data.token;
		azureTokenFetchedAt = now;
		return azureToken;
	} catch {
		return null;
	}
}

async function speakWithAzure(text: string, options: SpeakOptions): Promise<boolean> {
	if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

	const now = Date.now();
	const waitTime = AZURE_THROTTLE_MS - (now - lastAzureCallAt);
	if (waitTime > 0) {
		await new Promise((resolve) => setTimeout(resolve, waitTime));
	}

	const voice = options.voice ?? DEFAULT_VOICE;
	const speed = options.speed ?? DEFAULT_SPEED;
	const pitch = options.pitch ?? DEFAULT_PITCH;
	const cacheKey = `${voice}:${speed}:${pitch}:${text}`;

	const cached = azureBlobCache.get(cacheKey);
	if (cached) return playBlob(cached);

	const token = await getAzureToken();
	if (!token) return false;

	const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>
<voice name='${voice}'>
<prosody rate='${speed}' pitch='${pitch}'>${escapeXml(text)}</prosody>
</voice>
</speak>`;

	lastAzureCallAt = Date.now();

	try {
		const ttsEndpoint = env.PUBLIC_TTS_ENDPOINT;
		if (!ttsEndpoint) return false;

		const response = await fetch(ttsEndpoint, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/ssml+xml',
				'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
			},
			body: ssml
		});

		if (!response.ok) return false;

		const blob = await response.blob();
		azureBlobCache.set(cacheKey, blob);
		return playBlob(blob);
	} catch {
		return false;
	}
}

function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

// --- Browser fallback ---

function speakWithBrowser(text: string): Promise<boolean> {
	return new Promise((resolve) => {
		if (typeof speechSynthesis === 'undefined') {
			resolve(false);
			return;
		}

		stopSpeaking();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = 'zh-CN';

		// Prefer a Chinese voice if available
		const voices = speechSynthesis.getVoices();
		const chineseVoice = voices.find(
			(v) => v.lang.startsWith('zh-CN') || v.lang.startsWith('zh_CN')
		);
		if (chineseVoice) utterance.voice = chineseVoice;

		speaking = true;
		utterance.onend = () => {
			speaking = false;
			resolve(true);
		};
		utterance.onerror = () => {
			speaking = false;
			resolve(false);
		};
		speechSynthesis.speak(utterance);
	});
}

// --- Priority chain ---

async function tryPinyinAudio(text: string): Promise<boolean> {
	try {
		// Direct toned pinyin input
		if (isTonedPinyin(text)) {
			const numbered = convertToneToNumber(text);
			return await playUrl(`${CDN_BASE}/pinyin/b/${numbered}.mp3`);
		}

		// Single Chinese character — look up pinyin
		if (text.length === 1 && /[\u4e00-\u9fff]/.test(text)) {
			const dict = await loadPinyinDict();
			const readings = dict[text];
			if (readings && readings.length > 0) {
				const numbered = convertToneToNumber(readings[0]);
				return await playUrl(`${CDN_BASE}/pinyin/b/${numbered}.mp3`);
			}
		}
	} catch {
		// fall through
	}
	return false;
}

async function tryHskAudio(text: string): Promise<boolean> {
	try {
		const [hskSet, t2s] = await Promise.all([loadHskSet(), loadHskT2s()]);

		// Check if text is directly in the HSK word set
		if (hskSet.has(text)) {
			return await playUrl(`${CDN_BASE}/hsk-audio/${text}.mp3`);
		}

		// Try converting traditional to simplified
		const simplified = t2s[text];
		if (simplified && hskSet.has(simplified)) {
			return await playUrl(`${CDN_BASE}/hsk-audio/${simplified}.mp3`);
		}
	} catch {
		// fall through
	}
	return false;
}

/**
 * Speak Chinese text using the best available method:
 * 1. Pre-recorded pinyin audio (single characters/syllables)
 * 2. Pre-recorded HSK word audio
 * 3. Azure Cognitive Services TTS
 * 4. Browser speechSynthesis fallback
 */
export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
	const trimmed = text.trim();
	if (!trimmed) return;

	// Priority 1: Single character / pinyin syllable
	if (await tryPinyinAudio(trimmed)) return;

	// Priority 2: HSK word audio
	if (await tryHskAudio(trimmed)) return;

	// Priority 3: Azure TTS
	if (await speakWithAzure(trimmed, options)) return;

	// Priority 4: Browser fallback
	await speakWithBrowser(trimmed);
}

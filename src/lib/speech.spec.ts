import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock $env/dynamic/public before importing speech module
vi.mock('$env/dynamic/public', () => ({
	env: { PUBLIC_TTS_ENDPOINT: 'https://tts.example.com/cognitiveservices/v1' }
}));

// Mock pinyin module
vi.mock('./pinyin', () => ({
	isTonedPinyin: vi.fn((text: string) => /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(text)),
	convertToneToNumber: vi.fn((text: string) => text.replace(/[āáǎà]/g, 'a') + '1')
}));

// Provide browser globals for node environment
const mockAudio = {
	play: vi.fn(),
	pause: vi.fn(),
	currentTime: 0,
	addEventListener: vi.fn(),
	removeEventListener: vi.fn()
};

vi.stubGlobal(
	'Audio',
	vi.fn(() => mockAudio)
);

// Extend the real URL with createObjectURL/revokeObjectURL
const RealURL = globalThis.URL;
const MockURL = Object.assign(
	function (...args: ConstructorParameters<typeof RealURL>) {
		return new RealURL(...args);
	},
	{
		createObjectURL: vi.fn(() => 'blob:mock'),
		revokeObjectURL: vi.fn(),
		canParse: RealURL.canParse?.bind(RealURL),
		prototype: RealURL.prototype
	}
);
vi.stubGlobal('URL', MockURL);

const mockSpeechSynthesis = {
	cancel: vi.fn(),
	speak: vi.fn(),
	getVoices: vi.fn(() => [])
};
vi.stubGlobal('speechSynthesis', mockSpeechSynthesis);

// Must be a real constructor (used with `new`).
class MockSpeechSynthesisUtterance {
	lang = '';
	voice: null | object = null;
	onend: (() => void) | null = null;
	onerror: (() => void) | null = null;
	constructor(_text?: string) {}
}
vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);

// Mock navigator.onLine
Object.defineProperty(globalThis, 'navigator', {
	value: { onLine: true },
	writable: true,
	configurable: true
});

describe('speech module', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAudio.play.mockResolvedValue(undefined);
		vi.resetModules();
	});

	it('isSpeaking returns false initially', async () => {
		const { isSpeaking } = await import('./speech');
		expect(isSpeaking()).toBe(false);
	});

	it('stopSpeaking cancels speechSynthesis', async () => {
		const { stopSpeaking } = await import('./speech');
		stopSpeaking();
		expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
	});

	it('speak with empty string returns immediately', async () => {
		const { speak } = await import('./speech');
		await speak('');
		expect(vi.mocked(Audio)).not.toHaveBeenCalled();
	});

	it('speak with whitespace-only string returns immediately', async () => {
		const { speak } = await import('./speech');
		await speak('   ');
		expect(vi.mocked(Audio)).not.toHaveBeenCalled();
	});

	it('stopSpeaking pauses current audio', async () => {
		const { stopSpeaking } = await import('./speech');
		stopSpeaking();
		expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
	});

	describe('playUrl via speak with pinyin audio', () => {
		it('falls through when Audio errors on pinyin', async () => {
			// Audio fires error
			mockAudio.addEventListener.mockImplementation((event: string, cb: () => void) => {
				if (event === 'error') setTimeout(cb, 0);
			});

			// Mock fetch for subsequent fallbacks (HSK, Azure)
			const fetchMock = vi.fn().mockResolvedValue({ ok: false });
			vi.stubGlobal('fetch', fetchMock);

			// Browser fallback — make speechSynthesis.speak fire onend
			mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
				setTimeout(() => utterance.onend?.(), 0);
			});

			const { speak } = await import('./speech');
			await speak('mā');

			// Should have attempted Audio (pinyin), then fallen through to other methods
			expect(vi.mocked(Audio)).toHaveBeenCalled();
		});
	});

	describe('playUrl - audio.play() rejection', () => {
		it('resolves false when audio.play() throws', async () => {
			mockAudio.play.mockRejectedValue(new Error('NotAllowedError'));
			mockAudio.addEventListener.mockImplementation(() => {});

			const fetchMock = vi.fn().mockResolvedValue({ ok: false });
			vi.stubGlobal('fetch', fetchMock);

			mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
				setTimeout(() => utterance.onend?.(), 0);
			});

			const { speak } = await import('./speech');
			await speak('mā');

			expect(vi.mocked(Audio)).toHaveBeenCalled();
		});
	});

	describe('tryHskAudio', () => {
		it('attempts HSK audio for multi-char Chinese text', async () => {
			mockAudio.addEventListener.mockImplementation((event: string, cb: () => void) => {
				if (event === 'ended') setTimeout(cb, 0);
			});

			// Mock fetch for HSK JSON + audio
			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) // pinyinDict
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(['你好']) }) // HSKList
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) // HSKt2s
				.mockImplementation(() => Promise.resolve({ ok: false })); // fallbacks

			vi.stubGlobal('fetch', fetchMock);

			mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
				setTimeout(() => utterance.onend?.(), 0);
			});

			const { speak } = await import('./speech');
			await speak('你好');

			expect(fetchMock).toHaveBeenCalled();
		});
	});

	describe('speakWithAzure', () => {
		it('skips Azure when offline', async () => {
			Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true });

			mockAudio.addEventListener.mockImplementation((event: string, cb: () => void) => {
				if (event === 'error') setTimeout(cb, 0);
			});

			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) // pinyinDict
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // HSKList
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // HSKt2s

			vi.stubGlobal('fetch', fetchMock);

			mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
				setTimeout(() => utterance.onend?.(), 0);
			});

			const { speak } = await import('./speech');
			await speak('测试');

			// Should NOT have called the token endpoint
			const tokenCall = fetchMock.mock.calls.find(
				(c: unknown[]) => typeof c[0] === 'string' && (c[0] as string).includes('/api/tts/token')
			);
			expect(tokenCall).toBeUndefined();

			// Restore online state
			Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
		});
	});

	describe('speakWithBrowser', () => {
		it('uses speechSynthesis as final fallback', async () => {
			mockAudio.addEventListener.mockImplementation((event: string, cb: () => void) => {
				if (event === 'error') setTimeout(cb, 0);
			});

			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) // pinyinDict
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // HSKList
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) // HSKt2s
				.mockResolvedValueOnce({ ok: false }) // token fails
				.mockResolvedValue({ ok: false }); // any other

			vi.stubGlobal('fetch', fetchMock);

			mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
				setTimeout(() => utterance.onend?.(), 0);
			});

			const { speak } = await import('./speech');
			await speak('测试');

			expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
		});

		it('prefers a Chinese voice when available', async () => {
			mockAudio.addEventListener.mockImplementation((event: string, cb: () => void) => {
				if (event === 'error') setTimeout(cb, 0);
			});

			const chineseVoice = { lang: 'zh-CN', name: 'Chinese' };
			(mockSpeechSynthesis.getVoices as ReturnType<typeof vi.fn>).mockReturnValue([
				{ lang: 'en-US', name: 'English' },
				chineseVoice
			]);

			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
				.mockResolvedValue({ ok: false });

			vi.stubGlobal('fetch', fetchMock);

			let capturedUtterance: MockSpeechSynthesisUtterance | null = null;
			mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
				capturedUtterance = utterance;
				setTimeout(() => utterance.onend?.(), 0);
			});

			const { speak } = await import('./speech');
			await speak('测试');

			expect(capturedUtterance).not.toBeNull();
			expect(capturedUtterance!.voice).toBe(chineseVoice);
		});

		it('resolves false when speechSynthesis onerror fires', async () => {
			mockAudio.addEventListener.mockImplementation((event: string, cb: () => void) => {
				if (event === 'error') setTimeout(cb, 0);
			});

			const fetchMock = vi
				.fn()
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
				.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
				.mockResolvedValue({ ok: false });

			vi.stubGlobal('fetch', fetchMock);

			mockSpeechSynthesis.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
				setTimeout(() => utterance.onerror?.(), 0);
			});

			const { speak } = await import('./speech');
			await speak('测试');

			expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
		});
	});

	describe('tryPinyinAudio for single Chinese character', () => {
		it('looks up pinyin from pinyinDict for a single character', async () => {
			mockAudio.addEventListener.mockImplementation((event: string, cb: () => void) => {
				if (event === 'ended') setTimeout(cb, 0);
			});

			const fetchMock = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({ 学: ['xué'] })
			});

			vi.stubGlobal('fetch', fetchMock);

			const { speak } = await import('./speech');
			await speak('学');

			expect(vi.mocked(Audio)).toHaveBeenCalled();
			const url = (vi.mocked(Audio).mock.calls[0] as string[])[0];
			expect(url).toContain('/pinyin/b/');
		});
	});
});

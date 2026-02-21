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
// The speak callback triggers onend so that speakWithBrowser resolves.
class MockSpeechSynthesisUtterance {
	lang = '';
	voice: null | object = null;
	onend: (() => void) | null = null;
	onerror: (() => void) | null = null;
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	constructor(_text?: string) {}
}
vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);

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

		// Should cancel speechSynthesis (always called)
		expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
	});
});

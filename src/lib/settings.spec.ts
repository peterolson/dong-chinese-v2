import { describe, expect, it } from 'vitest';
import { SETTINGS_DEFAULTS, PHONETIC_SCRIPT_VALUES, SETTINGS_COOKIE } from './settings';

describe('SETTINGS_DEFAULTS', () => {
	it('has all settings defaulting to null', () => {
		expect(SETTINGS_DEFAULTS.theme).toBeNull();
		expect(SETTINGS_DEFAULTS.characterSet).toBeNull();
		expect(SETTINGS_DEFAULTS.phoneticScript).toBeNull();
	});
});

describe('PHONETIC_SCRIPT_VALUES', () => {
	it('contains all 5 phonetic scripts', () => {
		expect(PHONETIC_SCRIPT_VALUES).toHaveLength(5);
	});

	it('includes pinyin, zhuyin, wadegiles, gwoyeu, cyrillic', () => {
		expect(PHONETIC_SCRIPT_VALUES).toContain('pinyin');
		expect(PHONETIC_SCRIPT_VALUES).toContain('zhuyin');
		expect(PHONETIC_SCRIPT_VALUES).toContain('wadegiles');
		expect(PHONETIC_SCRIPT_VALUES).toContain('gwoyeu');
		expect(PHONETIC_SCRIPT_VALUES).toContain('cyrillic');
	});
});

describe('SETTINGS_COOKIE', () => {
	it('is "settings"', () => {
		expect(SETTINGS_COOKIE).toBe('settings');
	});
});

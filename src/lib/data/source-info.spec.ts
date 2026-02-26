import { describe, expect, it } from 'vitest';
import { detectSources, sourceData } from './source-info';
import type { CharacterData } from '$lib/types/dictionary';

function makeChar(overrides: Partial<CharacterData> = {}): CharacterData {
	return {
		character: '字',
		codepoint: 'U+5B57',
		gloss: null,
		hint: null,
		originalMeaning: null,
		strokeCountSimp: null,
		strokeCountTrad: null,
		isVerified: null,
		components: null,
		customSources: null,
		simplifiedVariants: null,
		traditionalVariants: null,
		variantOf: null,
		junDaRank: null,
		junDaFrequency: null,
		junDaPerMillion: null,
		subtlexRank: null,
		subtlexCount: null,
		subtlexPerMillion: null,
		subtlexContextDiversity: null,
		strokeDataSimp: null,
		strokeDataTrad: null,
		fragmentsSimp: null,
		fragmentsTrad: null,
		historicalImages: null,
		historicalPronunciations: null,
		shuowenExplanation: null,
		shuowenPronunciation: null,
		shuowenPinyin: null,
		pinyinFrequencies: null,
		pinyin: null,
		...overrides
	};
}

describe('sourceData', () => {
	it('contains expected source keys', () => {
		expect(sourceData).toHaveProperty('unicode');
		expect(sourceData).toHaveProperty('cedict');
		expect(sourceData).toHaveProperty('animcjk');
		expect(sourceData).toHaveProperty('makemeahanzi');
		expect(sourceData).toHaveProperty('baxter-sagart');
		expect(sourceData).toHaveProperty('zhengzhang');
		expect(sourceData).toHaveProperty('shuowen');
		expect(sourceData).toHaveProperty('jun-da');
		expect(sourceData).toHaveProperty('subtlex-ch');
	});

	it('each entry has title and url', () => {
		for (const [key, entry] of Object.entries(sourceData)) {
			expect(entry.title, `${key} should have a title`).toBeTruthy();
			expect(entry.url, `${key} should have a url`).toBeTruthy();
		}
	});
});

describe('detectSources', () => {
	it('returns empty array for minimal character', () => {
		const groups = detectSources(makeChar());
		expect(groups).toEqual([]);
	});

	it('detects unicode readings from pinyin', () => {
		const groups = detectSources(makeChar({ pinyin: ['zì'] }));
		expect(groups).toContainEqual({ label: 'Readings & variants', keys: ['unicode'] });
	});

	it('detects unicode readings from simplified variants', () => {
		const groups = detectSources(makeChar({ simplifiedVariants: ['字'] }));
		expect(groups).toContainEqual({ label: 'Readings & variants', keys: ['unicode'] });
	});

	it('detects unicode readings from traditional variants', () => {
		const groups = detectSources(makeChar({ traditionalVariants: ['字'] }));
		expect(groups).toContainEqual({ label: 'Readings & variants', keys: ['unicode'] });
	});

	it('detects unicode readings from tang pronunciation', () => {
		const groups = detectSources(
			makeChar({
				historicalPronunciations: [{ source: 'tang', middleChinese: 'dzɨH' }]
			})
		);
		expect(groups).toContainEqual({ label: 'Readings & variants', keys: ['unicode'] });
	});

	it('detects animcjk stroke data (simplified)', () => {
		const groups = detectSources(
			makeChar({
				strokeDataSimp: { strokes: ['M0 0'], medians: [[[0, 0]]], source: 'animcjk' }
			})
		);
		expect(groups).toContainEqual({ label: 'Stroke data', keys: ['animcjk'] });
	});

	it('detects animcjk stroke data (traditional)', () => {
		const groups = detectSources(
			makeChar({
				strokeDataTrad: { strokes: ['M0 0'], medians: [[[0, 0]]], source: 'animcjk' }
			})
		);
		expect(groups).toContainEqual({ label: 'Stroke data', keys: ['animcjk'] });
	});

	it('detects makemeahanzi stroke data', () => {
		const groups = detectSources(
			makeChar({
				strokeDataSimp: { strokes: ['M0 0'], medians: [[[0, 0]]], source: 'makemeahanzi' }
			})
		);
		expect(groups).toContainEqual({ label: 'Stroke data', keys: ['makemeahanzi'] });
	});

	it('detects both stroke sources', () => {
		const groups = detectSources(
			makeChar({
				strokeDataSimp: { strokes: ['M0 0'], medians: [[[0, 0]]], source: 'animcjk' },
				strokeDataTrad: { strokes: ['M0 0'], medians: [[[0, 0]]], source: 'makemeahanzi' }
			})
		);
		const strokeGroup = groups.find((g) => g.label === 'Stroke data');
		expect(strokeGroup?.keys).toContain('animcjk');
		expect(strokeGroup?.keys).toContain('makemeahanzi');
	});

	it('detects baxter-sagart historical pronunciations', () => {
		const groups = detectSources(
			makeChar({
				historicalPronunciations: [{ source: 'baxter-sagart', oldChinese: '*dzəʔ' }]
			})
		);
		expect(groups).toContainEqual({
			label: 'Historical pronunciations',
			keys: ['baxter-sagart']
		});
	});

	it('detects zhengzhang historical pronunciations', () => {
		const groups = detectSources(
			makeChar({
				historicalPronunciations: [{ source: 'zhengzhang', oldChinese: '*zɯːs' }]
			})
		);
		expect(groups).toContainEqual({ label: 'Historical pronunciations', keys: ['zhengzhang'] });
	});

	it('detects both historical pronunciation sources', () => {
		const groups = detectSources(
			makeChar({
				historicalPronunciations: [
					{ source: 'baxter-sagart', oldChinese: '*dzəʔ' },
					{ source: 'zhengzhang', oldChinese: '*zɯːs' }
				]
			})
		);
		const histGroup = groups.find((g) => g.label === 'Historical pronunciations');
		expect(histGroup?.keys).toEqual(['baxter-sagart', 'zhengzhang']);
	});

	it('detects shuowen etymology', () => {
		const groups = detectSources(makeChar({ shuowenExplanation: '乳也' }));
		expect(groups).toContainEqual({ label: 'Etymology', keys: ['shuowen'] });
	});

	it('detects jun-da frequency', () => {
		const groups = detectSources(makeChar({ junDaRank: 500 }));
		expect(groups).toContainEqual({ label: 'Frequency data', keys: ['jun-da'] });
	});

	it('detects subtlex-ch frequency', () => {
		const groups = detectSources(makeChar({ subtlexRank: 300 }));
		expect(groups).toContainEqual({ label: 'Frequency data', keys: ['subtlex-ch'] });
	});

	it('detects both frequency sources', () => {
		const groups = detectSources(makeChar({ junDaRank: 500, subtlexRank: 300 }));
		const freqGroup = groups.find((g) => g.label === 'Frequency data');
		expect(freqGroup?.keys).toEqual(['jun-da', 'subtlex-ch']);
	});

	it('adds character origin group when hasCustomSources is true', () => {
		const groups = detectSources(makeChar(), { hasCustomSources: true });
		expect(groups[0]).toEqual({ label: 'Character origin', keys: [] });
	});

	it('does not add character origin group by default', () => {
		const groups = detectSources(makeChar({ pinyin: ['zì'] }));
		expect(groups.find((g) => g.label === 'Character origin')).toBeUndefined();
	});

	it('detects all sources for a fully populated character', () => {
		const groups = detectSources(
			makeChar({
				pinyin: ['zì'],
				strokeDataSimp: { strokes: ['M0 0'], medians: [[[0, 0]]], source: 'animcjk' },
				historicalPronunciations: [
					{ source: 'baxter-sagart', oldChinese: '*dzəʔ' },
					{ source: 'zhengzhang', oldChinese: '*zɯːs' },
					{ source: 'tang', middleChinese: 'dzɨH' }
				],
				shuowenExplanation: '乳也',
				junDaRank: 500,
				subtlexRank: 300
			}),
			{ hasCustomSources: true }
		);
		const labels = groups.map((g) => g.label);
		expect(labels).toContain('Character origin');
		expect(labels).toContain('Readings & variants');
		expect(labels).toContain('Stroke data');
		expect(labels).toContain('Historical pronunciations');
		expect(labels).toContain('Etymology');
		expect(labels).toContain('Frequency data');
	});
});

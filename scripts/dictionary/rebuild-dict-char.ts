/**
 * Rebuild dictionary.char_base
 *
 * Materializes data from all stage.* source tables into a single
 * dictionary.char_base row per character. This is the "base" layer;
 * later, dictionary.char will overlay manual overrides on top.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run dictionary:rebuild-char
 *
 * Algorithm:
 *   1. Load each source table into an in-memory Map<char, ...>
 *   2. Build the universe of characters as a union of all source keys
 *   3. For each character, build a row using priority chains
 *   4. Batch UPSERT into dictionary.char_base
 */

import postgres, { type Row, type PendingQuery } from 'postgres';

type Tx = postgres.TransactionSql & {
	<T extends readonly (object | undefined)[] = Row[]>(
		template: TemplateStringsArray,
		...parameters: readonly postgres.ParameterOrFragment<never>[]
	): PendingQuery<T>;
};

const DATABASE_URL = process.env.DATABASE_URL;
const BATCH_SIZE = 500;
const JUN_DA_CORPUS_SIZE = 193504018;

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required');
	process.exit(1);
}

// ---------------------------------------------------------------------------
// Types for in-memory maps
// ---------------------------------------------------------------------------

interface DongCharData {
	char: string;
	codepoint: string;
	strokeCount: number | null;
	gloss: string | null;
	data: Record<string, unknown>;
}

interface AnimcjkData {
	strokes: string[];
	medians: number[][][];
}

interface MakemeahanziData {
	strokes: string[];
	medians: number[][][];
}

interface BaxterSagartData {
	pinyin: string;
	middleChinese: string;
	oldChinese: string;
	gloss: string;
}

interface ZhengzhangData {
	oldChinese: string;
	phoneticSeries: string;
	rhymeGroup: string;
	notes: string;
}

interface ShuowenData {
	explanation: string;
	pronunciation: string;
	pinyin: string;
}

interface SubtlexData {
	rank: number;
	count: number;
	perMillion: number;
	contextDiversity: number;
}

interface JunDaData {
	rank: number;
	rawFrequency: number;
}

interface UnihanFieldMap {
	[field: string]: string;
}

// Per-character max updated_at across all contributing source tables
type UpdatedAtMap = Map<string, Date>;

/** Ensure a value from a jsonb source field is a parsed JS value (not a string).
 *  Some jsonb documents store nested fields as JSON strings instead of objects. */
function parseJsonField(v: unknown): unknown {
	if (v == null) return null;
	if (typeof v === 'string') {
		try {
			return JSON.parse(v);
		} catch {
			return v;
		}
	}
	return v;
}

// ---------------------------------------------------------------------------
// Load sources into memory
// ---------------------------------------------------------------------------

async function loadDongChars(sql: postgres.Sql): Promise<Map<string, DongCharData>> {
	console.log('Loading dong_dict_char_raw...');
	const rows = await sql`
		SELECT char, codepoint, stroke_count, gloss, data
		FROM stage.dong_dict_char_raw
		WHERE is_current = true
	`;
	const map = new Map<string, DongCharData>();
	for (const r of rows) {
		const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
		map.set(r.char as string, {
			char: r.char as string,
			codepoint: r.codepoint as string,
			strokeCount: r.stroke_count as number | null,
			gloss: r.gloss as string | null,
			data
		});
	}
	console.log(`  ${map.size.toLocaleString()} characters`);
	return map;
}

async function loadAnimcjk(
	sql: postgres.Sql
): Promise<{ simplified: Map<string, AnimcjkData>; traditional: Map<string, AnimcjkData> }> {
	console.log('Loading animcjk_raw...');
	const rows = await sql`
		SELECT character, variant, strokes, medians
		FROM stage.animcjk_raw
		WHERE is_current = true
	`;
	const simplified = new Map<string, AnimcjkData>();
	const traditional = new Map<string, AnimcjkData>();
	for (const r of rows) {
		const entry = {
			strokes: parseJsonField(r.strokes) as string[],
			medians: parseJsonField(r.medians) as number[][][]
		};
		if (r.variant === 'simplified') simplified.set(r.character as string, entry);
		else traditional.set(r.character as string, entry);
	}
	console.log(
		`  ${simplified.size.toLocaleString()} simplified, ${traditional.size.toLocaleString()} traditional`
	);
	return { simplified, traditional };
}

async function loadMakemeahanzi(sql: postgres.Sql): Promise<Map<string, MakemeahanziData>> {
	console.log('Loading makemeahanzi_raw...');
	const rows = await sql`
		SELECT character, strokes, medians
		FROM stage.makemeahanzi_raw
		WHERE is_current = true
	`;
	const map = new Map<string, MakemeahanziData>();
	for (const r of rows) {
		map.set(r.character as string, {
			strokes: parseJsonField(r.strokes) as string[],
			medians: parseJsonField(r.medians) as number[][][]
		});
	}
	console.log(`  ${map.size.toLocaleString()} characters`);
	return map;
}

async function loadBaxterSagart(sql: postgres.Sql): Promise<Map<string, BaxterSagartData[]>> {
	console.log('Loading baxter_sagart_raw...');
	const rows = await sql`
		SELECT character, pinyin, middle_chinese, old_chinese, gloss
		FROM stage.baxter_sagart_raw
		WHERE is_current = true
	`;
	const map = new Map<string, BaxterSagartData[]>();
	for (const r of rows) {
		const char = r.character as string;
		const entry = {
			pinyin: r.pinyin as string,
			middleChinese: r.middle_chinese as string,
			oldChinese: r.old_chinese as string,
			gloss: r.gloss as string
		};
		const existing = map.get(char);
		if (existing) existing.push(entry);
		else map.set(char, [entry]);
	}
	console.log(`  ${map.size.toLocaleString()} characters`);
	return map;
}

async function loadZhengzhang(sql: postgres.Sql): Promise<Map<string, ZhengzhangData[]>> {
	console.log('Loading zhengzhang_raw...');
	const rows = await sql`
		SELECT character, old_chinese, phonetic_series, rhyme_group, notes
		FROM stage.zhengzhang_raw
		WHERE is_current = true
	`;
	const map = new Map<string, ZhengzhangData[]>();
	for (const r of rows) {
		const char = r.character as string;
		const entry = {
			oldChinese: r.old_chinese as string,
			phoneticSeries: r.phonetic_series as string,
			rhymeGroup: r.rhyme_group as string,
			notes: r.notes as string
		};
		const existing = map.get(char);
		if (existing) existing.push(entry);
		else map.set(char, [entry]);
	}
	console.log(`  ${map.size.toLocaleString()} characters`);
	return map;
}

async function loadShuowen(sql: postgres.Sql): Promise<Map<string, ShuowenData>> {
	console.log('Loading shuowen_raw...');
	const rows = await sql`
		SELECT wordhead, explanation, pronunciation, pinyin
		FROM stage.shuowen_raw
		WHERE is_current = true
	`;
	const map = new Map<string, ShuowenData>();
	for (const r of rows) {
		// wordhead can be multi-character; we key by single char
		const wordhead = r.wordhead as string;
		const chars = [...wordhead];
		for (const char of chars) {
			if (!map.has(char)) {
				map.set(char, {
					explanation: r.explanation as string,
					pronunciation: r.pronunciation as string,
					pinyin: r.pinyin as string
				});
			}
		}
	}
	console.log(`  ${map.size.toLocaleString()} characters`);
	return map;
}

async function loadJunDa(sql: postgres.Sql): Promise<Map<string, JunDaData>> {
	console.log('Loading jun_da_char_freq_raw...');
	const rows = await sql`
		SELECT character, rank, raw_frequency
		FROM stage.jun_da_char_freq_raw
		WHERE is_current = true
	`;
	const map = new Map<string, JunDaData>();
	for (const r of rows) {
		map.set(r.character as string, {
			rank: r.rank as number,
			rawFrequency: r.raw_frequency as number
		});
	}
	console.log(`  ${map.size.toLocaleString()} characters`);
	return map;
}

async function loadSubtlex(sql: postgres.Sql): Promise<Map<string, SubtlexData>> {
	console.log('Loading subtlex_ch_char_raw (with computed rank)...');
	const rows = await sql`
		SELECT character, count, per_million, context_diversity,
			ROW_NUMBER() OVER (ORDER BY count DESC) AS rank
		FROM stage.subtlex_ch_char_raw
		WHERE is_current = true
	`;
	const map = new Map<string, SubtlexData>();
	for (const r of rows) {
		map.set(r.character as string, {
			rank: Number(r.rank),
			count: r.count as number,
			perMillion: r.per_million as number,
			contextDiversity: r.context_diversity as number
		});
	}
	console.log(`  ${map.size.toLocaleString()} characters`);
	return map;
}

async function loadWordPinyin(sql: postgres.Sql): Promise<Map<string, string[]>> {
	console.log('Loading dong_dict_word_raw (single-char pinyin)...');
	const rows = await sql`
		SELECT simp, data
		FROM stage.dong_dict_word_raw
		WHERE is_current = true AND LENGTH(simp) = 1
	`;
	const map = new Map<string, string[]>();
	for (const r of rows) {
		const char = r.simp as string;
		const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
		const items = data?.items as Array<{ pinyin?: string; definitions?: unknown[] }> | undefined;
		if (!items) continue;
		// Count definitions per pinyin reading
		const defCounts = new Map<string, number>();
		for (const item of items) {
			if (!item.pinyin) continue;
			const lower = item.pinyin.toLowerCase();
			defCounts.set(lower, (defCounts.get(lower) ?? 0) + (item.definitions?.length ?? 0));
		}
		if (defCounts.size > 0) {
			// Sort by definition count descending
			const sorted = [...defCounts.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
			map.set(char, sorted);
		}
	}
	console.log(`  ${map.size.toLocaleString()} characters with word pinyin`);
	return map;
}

async function loadUnihanFields(sql: postgres.Sql): Promise<Map<string, UnihanFieldMap>> {
	console.log('Loading unihan_raw (selected fields)...');
	const rows = await sql`
		SELECT codepoint, field, value
		FROM stage.unihan_raw
		WHERE is_current = true
		AND field IN (
			'kTotalStrokes', 'kSimplifiedVariant', 'kTraditionalVariant',
			'kHanyuPinlu', 'kTang'
		)
	`;
	const map = new Map<string, UnihanFieldMap>();
	for (const r of rows) {
		const cp = r.codepoint as string;
		const existing = map.get(cp);
		if (existing) {
			existing[r.field as string] = r.value as string;
		} else {
			map.set(cp, { [r.field as string]: r.value as string });
		}
	}
	console.log(`  ${map.size.toLocaleString()} codepoints with relevant fields`);
	return map;
}

/**
 * Load max updated_at per character across all source tables.
 * For unihan, we convert codepoints to characters.
 */
async function loadUpdatedAtMap(sql: postgres.Sql): Promise<UpdatedAtMap> {
	console.log('Loading max updated_at per character...');
	const rows = await sql`
		SELECT character, MAX(updated_at) AS max_updated_at FROM (
			SELECT char AS character, updated_at FROM stage.dong_dict_char_raw WHERE is_current = true
			UNION ALL
			SELECT character, updated_at FROM stage.animcjk_raw WHERE is_current = true
			UNION ALL
			SELECT character, updated_at FROM stage.makemeahanzi_raw WHERE is_current = true
			UNION ALL
			SELECT character, updated_at FROM stage.baxter_sagart_raw WHERE is_current = true
			UNION ALL
			SELECT character, updated_at FROM stage.zhengzhang_raw WHERE is_current = true
			UNION ALL
			SELECT character, updated_at FROM stage.jun_da_char_freq_raw WHERE is_current = true
			UNION ALL
			SELECT character, updated_at FROM stage.subtlex_ch_char_raw WHERE is_current = true
			UNION ALL
			SELECT wordhead AS character, updated_at FROM stage.shuowen_raw WHERE is_current = true
			UNION ALL
			SELECT
				CHR(('x' || LPAD(SUBSTRING(codepoint FROM 3), 8, '0'))::bit(32)::int)
				AS character,
				updated_at
			FROM stage.unihan_raw
			WHERE is_current = true
			AND field IN ('kTotalStrokes', 'kSimplifiedVariant', 'kTraditionalVariant', 'kHanyuPinlu', 'kTang')
		) AS all_sources
		GROUP BY character
	`;
	const map: UpdatedAtMap = new Map();
	for (const r of rows) {
		const char = r.character as string;
		const ts = r.max_updated_at as Date;
		if (char && ts) {
			// shuowen wordhead can be multi-char; expand to individual chars
			const chars = [...char];
			for (const c of chars) {
				const existing = map.get(c);
				if (!existing || ts > existing) {
					map.set(c, ts);
				}
			}
		}
	}
	console.log(`  ${map.size.toLocaleString()} characters with timestamps`);
	return map;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a character to its Unicode codepoint string (e.g. "U+6728") */
function charToCodepoint(char: string): string {
	const code = char.codePointAt(0);
	if (code === undefined) return '';
	return 'U+' + code.toString(16).toUpperCase().padStart(4, '0');
}

/** Parse U+XXXX to character */
function codepointToChar(cp: string): string {
	const hex = cp.replace(/^U\+/i, '');
	return String.fromCodePoint(parseInt(hex, 16));
}

/** Parse kHanyuPinlu format: "mù(415)" or "de(75596) dì(157)" → [{ pinyin, count }] */
function parseHanyuPinlu(value: string): Array<{ pinyin: string; count: number }> {
	const results: Array<{ pinyin: string; count: number }> = [];
	const regex = /(\S+?)\((\d+)\)/g;
	let match;
	while ((match = regex.exec(value)) !== null) {
		results.push({ pinyin: match[1], count: parseInt(match[2], 10) });
	}
	return results;
}

/** Parse space-separated U+XXXX list → array of characters */
function parseUnicodeList(value: string): string[] {
	return value
		.split(/\s+/)
		.filter((s) => s.startsWith('U+'))
		.map(codepointToChar);
}

// ---------------------------------------------------------------------------
// Build rows
// ---------------------------------------------------------------------------

interface CharBaseRow {
	character: string;
	codepoint: string | null;
	gloss: string | null;
	hint: string | null;
	originalMeaning: string | null;
	strokeCountSimp: number | null;
	strokeCountTrad: number | null;
	isVerified: boolean | null;
	components: unknown; // jsonb — parsed JS value
	customSources: unknown; // jsonb — parsed JS value
	simplifiedVariants: unknown; // jsonb — parsed JS value
	traditionalVariants: unknown; // jsonb — parsed JS value
	junDaRank: number | null;
	junDaFrequency: number | null;
	junDaPerMillion: number | null;
	subtlexRank: number | null;
	subtlexCount: number | null;
	subtlexPerMillion: number | null;
	subtlexContextDiversity: number | null;
	strokeDataSimp: unknown; // jsonb — parsed JS value
	strokeDataTrad: unknown; // jsonb — parsed JS value
	fragmentsSimp: unknown; // jsonb — parsed JS value
	fragmentsTrad: unknown; // jsonb — parsed JS value
	historicalImages: unknown; // jsonb — parsed JS value
	historicalPronunciations: unknown; // jsonb — parsed JS value
	shuowenExplanation: string | null;
	shuowenPronunciation: string | null;
	shuowenPinyin: string | null;
	pinyinFrequencies: unknown; // jsonb — parsed JS value
	pinyin: string[] | null;
	updatedAt: Date;
}

function buildRow(
	char: string,
	dong: Map<string, DongCharData>,
	animcjk: { simplified: Map<string, AnimcjkData>; traditional: Map<string, AnimcjkData> },
	makemeahanzi: Map<string, MakemeahanziData>,
	baxterSagart: Map<string, BaxterSagartData[]>,
	zhengzhang: Map<string, ZhengzhangData[]>,
	shuowen: Map<string, ShuowenData>,
	junDa: Map<string, JunDaData>,
	subtlex: Map<string, SubtlexData>,
	unihanFields: Map<string, UnihanFieldMap>,
	wordPinyin: Map<string, string[]>,
	updatedAtMap: UpdatedAtMap
): CharBaseRow {
	const dongChar = dong.get(char);
	const dongData = dongChar?.data;
	const cp = dongChar?.codepoint || charToCodepoint(char);
	const unihanCp = unihanFields.get(cp);

	// --- Basic fields ---
	const gloss = (dongData?.gloss as string) || null;
	const hint = (dongData?.hint as string) || null;
	const originalMeaning = (dongData?.originalMeaning as string) || null;
	const isVerified = dongData?.isVerified != null ? Boolean(dongData.isVerified) : null;
	const components = parseJsonField(dongData?.components);
	const customSources = parseJsonField(dongData?.customSources);

	// --- Base stroke count: dong_dict > unihan kTotalStrokes ---
	// This is the default; will be overridden per-variant below if stroke data is available.
	let baseStrokeCount: number | null = dongChar?.strokeCount ?? null;
	if (baseStrokeCount == null && unihanCp?.kTotalStrokes) {
		const parsed = parseInt(unihanCp.kTotalStrokes, 10);
		if (!isNaN(parsed)) baseStrokeCount = parsed;
	}

	// --- Variants: merge unihan + dong_dict ---
	const simpFromUnihan = unihanCp?.kSimplifiedVariant
		? parseUnicodeList(unihanCp.kSimplifiedVariant)
		: [];
	const tradFromUnihan = unihanCp?.kTraditionalVariant
		? parseUnicodeList(unihanCp.kTraditionalVariant)
		: [];
	const simpFromDong = (dongData?.simpVariants as string[]) || [];
	const tradFromDong = (dongData?.tradVariants as string[]) || [];
	const simplifiedVariants = [...new Set([...simpFromDong, ...simpFromUnihan])];
	const traditionalVariants = [...new Set([...tradFromDong, ...tradFromUnihan])];

	// --- Stroke data: dong_dict images > animcjk > makemeahanzi_raw ---
	const animSimp = animcjk.simplified.get(char);
	const animTrad = animcjk.traditional.get(char);
	const mmah = makemeahanzi.get(char);

	// Extract stroke data from dong_dict images array.
	// The last entry with a `data` sub-object containing strokes/medians is dong's curated data.
	// Fragments (how components map to strokes) live as a sibling of `data` on the same entry.
	let dongStroke: { strokes: string[]; medians: number[][][]; fragments?: unknown } | null = null;
	const dongImages = parseJsonField(dongData?.images);
	if (dongImages && Array.isArray(dongImages)) {
		const imgArr = dongImages as Array<Record<string, unknown>>;
		for (let i = imgArr.length - 1; i >= 0; i--) {
			const img = imgArr[i];
			const imgData = parseJsonField(img.data) as Record<string, unknown> | null;
			if (imgData?.strokes && imgData?.medians) {
				dongStroke = {
					strokes: parseJsonField(imgData.strokes) as string[],
					medians: parseJsonField(imgData.medians) as number[][][],
					fragments: img.fragments ? parseJsonField(img.fragments) : undefined
				};
				break;
			}
		}
	}

	// Priority chain: animcjk > dong_dict > makemeahanzi_raw
	let strokeDataSimp: Record<string, unknown> | null = null;
	if (animSimp) {
		strokeDataSimp = { strokes: animSimp.strokes, medians: animSimp.medians, source: 'animcjk' };
	} else if (dongStroke) {
		strokeDataSimp = { strokes: dongStroke.strokes, medians: dongStroke.medians, source: 'dong' };
	} else if (mmah) {
		strokeDataSimp = { strokes: mmah.strokes, medians: mmah.medians, source: 'makemeahanzi' };
	}

	let strokeDataTrad: Record<string, unknown> | null = null;
	if (animTrad) {
		strokeDataTrad = { strokes: animTrad.strokes, medians: animTrad.medians, source: 'animcjk' };
	} else if (dongStroke) {
		strokeDataTrad = { strokes: dongStroke.strokes, medians: dongStroke.medians, source: 'dong' };
	} else if (mmah) {
		strokeDataTrad = { strokes: mmah.strokes, medians: mmah.medians, source: 'makemeahanzi' };
	}

	// --- Stroke counts: use medians/strokes length from stroke data if available, else base count ---
	const strokeCountSimp =
		(strokeDataSimp?.medians as number[][][] | null)?.length ??
		(strokeDataSimp?.strokes as string[] | null)?.length ??
		baseStrokeCount;
	const strokeCountTrad =
		(strokeDataTrad?.medians as number[][][] | null)?.length ??
		(strokeDataTrad?.strokes as string[] | null)?.length ??
		baseStrokeCount;

	// --- Fragments: dong_dict curated data for simplified; no trad data yet ---
	const fragmentsSimp = dongStroke?.fragments ?? null;
	const fragmentsTrad = null;

	// --- Historical images: dong_dict images excluding entries with stroke data ---
	let historicalImages: unknown[] | null = null;
	if (dongImages && Array.isArray(dongImages)) {
		const filtered = (dongImages as Array<Record<string, unknown>>).filter((img) => {
			const imgData = parseJsonField(img.data) as Record<string, unknown> | null;
			return !imgData?.strokes && !imgData?.medians;
		});
		if (filtered.length > 0) historicalImages = filtered;
	}

	// --- Historical pronunciations: baxter-sagart + zhengzhang + unihan kTang ---
	const pronunciations: Array<Record<string, unknown>> = [];
	const bs = baxterSagart.get(char);
	if (bs) {
		for (const entry of bs) {
			pronunciations.push({
				pinyin: entry.pinyin || undefined,
				middleChinese: entry.middleChinese || undefined,
				oldChinese: entry.oldChinese || undefined,
				gloss: entry.gloss || undefined,
				source: 'baxter-sagart'
			});
		}
	}
	const zz = zhengzhang.get(char);
	if (zz) {
		for (const entry of zz) {
			pronunciations.push({
				oldChinese: entry.oldChinese || undefined,
				phoneticSeries: entry.phoneticSeries || undefined,
				rhymeGroup: entry.rhymeGroup || undefined,
				notes: entry.notes || undefined,
				source: 'zhengzhang'
			});
		}
	}
	if (unihanCp?.kTang) {
		const readings = unihanCp.kTang.split(/\s+/).filter(Boolean);
		for (const reading of readings) {
			pronunciations.push({
				middleChinese: reading,
				source: 'tang'
			});
		}
	}

	// --- Shuowen ---
	const sw = shuowen.get(char);

	// --- Jun Da ---
	const jd = junDa.get(char);
	const junDaPerMillion = jd != null ? (jd.rawFrequency / JUN_DA_CORPUS_SIZE) * 1_000_000 : null;

	// --- SUBTLEX ---
	const st = subtlex.get(char);

	// --- Pinyin frequencies ---
	let pinyinFrequencies: Array<{ pinyin: string; count: number }> | null = null;
	if (unihanCp?.kHanyuPinlu) {
		const parsed = parseHanyuPinlu(unihanCp.kHanyuPinlu);
		if (parsed.length > 0) pinyinFrequencies = parsed;
	}

	// --- Deduplicated pinyin readings ---
	// If pinyin frequency data exists (kHanyuPinlu), use only those readings.
	// Otherwise fall back to word pinyin (sorted by definition count).
	// Cap at 3 readings to avoid clutter.
	let pinyin: string[] | null = null;
	if (pinyinFrequencies) {
		const seen = new Set<string>();
		const result: string[] = [];
		for (const pf of pinyinFrequencies) {
			if (pf.pinyin) {
				const lower = pf.pinyin.toLowerCase();
				if (!seen.has(lower)) {
					seen.add(lower);
					result.push(lower);
				}
			}
		}
		pinyin = result.length > 0 ? result.slice(0, 3) : null;
	} else {
		const wp = wordPinyin.get(char);
		if (wp) {
			const seen = new Set<string>();
			const result: string[] = [];
			for (const p of wp) {
				const clean = p.replace(/\u200B|\u200C|\u200D|\uFEFF/g, '').toLowerCase();
				if (clean && !seen.has(clean)) {
					seen.add(clean);
					result.push(clean);
				}
			}
			pinyin = result.length > 0 ? result.slice(0, 3) : null;
		}
	}

	return {
		character: char,
		codepoint: cp || null,
		gloss,
		hint,
		originalMeaning,
		strokeCountSimp: strokeCountSimp,
		strokeCountTrad: strokeCountTrad,
		isVerified,
		components,
		customSources,
		simplifiedVariants: simplifiedVariants.length > 0 ? simplifiedVariants : null,
		traditionalVariants: traditionalVariants.length > 0 ? traditionalVariants : null,
		junDaRank: jd?.rank ?? null,
		junDaFrequency: jd?.rawFrequency ?? null,
		junDaPerMillion,
		subtlexRank: st?.rank ?? null,
		subtlexCount: st?.count ?? null,
		subtlexPerMillion: st?.perMillion ?? null,
		subtlexContextDiversity: st?.contextDiversity ?? null,
		strokeDataSimp: strokeDataSimp ?? null,
		strokeDataTrad: strokeDataTrad ?? null,
		fragmentsSimp: fragmentsSimp ?? null,
		fragmentsTrad: fragmentsTrad ?? null,
		historicalImages: historicalImages ?? null,
		historicalPronunciations: pronunciations.length > 0 ? pronunciations : null,
		shuowenExplanation: sw?.explanation ?? null,
		shuowenPronunciation: sw?.pronunciation ?? null,
		shuowenPinyin: sw?.pinyin ?? null,
		pinyinFrequencies: pinyinFrequencies ?? null,
		pinyin,
		updatedAt: updatedAtMap.get(char) ?? new Date()
	};
}

// ---------------------------------------------------------------------------
// Upsert
// ---------------------------------------------------------------------------

const COLUMNS = [
	'character',
	'codepoint',
	'gloss',
	'hint',
	'original_meaning',
	'stroke_count_simp',
	'stroke_count_trad',
	'is_verified',
	'components',
	'custom_sources',
	'simplified_variants',
	'traditional_variants',
	'jun_da_rank',
	'jun_da_frequency',
	'jun_da_per_million',
	'subtlex_rank',
	'subtlex_count',
	'subtlex_per_million',
	'subtlex_context_diversity',
	'stroke_data_simp',
	'stroke_data_trad',
	'fragments_simp',
	'fragments_trad',
	'historical_images',
	'historical_pronunciations',
	'shuowen_explanation',
	'shuowen_pronunciation',
	'shuowen_pinyin',
	'pinyin_frequencies',
	'pinyin',
	'updated_at'
] as const;

/** Convert a CharBaseRow to a record with snake_case column names for postgres.js insert helper. */
function toDbRow(r: CharBaseRow): Record<string, unknown> {
	return {
		character: r.character,
		codepoint: r.codepoint,
		gloss: r.gloss,
		hint: r.hint,
		original_meaning: r.originalMeaning,
		stroke_count_simp: r.strokeCountSimp,
		stroke_count_trad: r.strokeCountTrad,
		is_verified: r.isVerified,
		components: r.components,
		custom_sources: r.customSources,
		simplified_variants: r.simplifiedVariants,
		traditional_variants: r.traditionalVariants,
		jun_da_rank: r.junDaRank,
		jun_da_frequency: r.junDaFrequency,
		jun_da_per_million: r.junDaPerMillion,
		subtlex_rank: r.subtlexRank,
		subtlex_count: r.subtlexCount,
		subtlex_per_million: r.subtlexPerMillion,
		subtlex_context_diversity: r.subtlexContextDiversity,
		stroke_data_simp: r.strokeDataSimp,
		stroke_data_trad: r.strokeDataTrad,
		fragments_simp: r.fragmentsSimp,
		fragments_trad: r.fragmentsTrad,
		historical_images: r.historicalImages,
		historical_pronunciations: r.historicalPronunciations,
		shuowen_explanation: r.shuowenExplanation,
		shuowen_pronunciation: r.shuowenPronunciation,
		shuowen_pinyin: r.shuowenPinyin,
		pinyin_frequencies: r.pinyinFrequencies,
		pinyin: r.pinyin,
		updated_at: r.updatedAt
	};
}

async function insertBatch(tx: Tx, batch: CharBaseRow[]): Promise<void> {
	if (batch.length === 0) return;

	const dbRows = batch.map(toDbRow);

	// postgres.js sql(rows, ...columns) helper handles jsonb serialization correctly
	await tx`INSERT INTO dictionary.char_base_new ${tx(dbRows, ...COLUMNS)}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	console.log('=== Rebuild dictionary.char_base ===\n');
	const startTime = Date.now();

	const sql = postgres(DATABASE_URL!);

	try {
		// Ensure the dictionary schema exists
		await sql`CREATE SCHEMA IF NOT EXISTS dictionary`;

		// Ensure the live table exists (drizzle-kit push should have done this,
		// but we create it here as a safety net for scripts run standalone)
		await sql`
			CREATE TABLE IF NOT EXISTS dictionary.char_base (
				character text PRIMARY KEY,
				codepoint text,
				gloss text,
				hint text,
				original_meaning text,
				stroke_count_simp integer,
				stroke_count_trad integer,
				is_verified boolean,
				components jsonb,
				custom_sources jsonb,
				simplified_variants jsonb,
				traditional_variants jsonb,
				jun_da_rank integer,
				jun_da_frequency integer,
				jun_da_per_million double precision,
				subtlex_rank integer,
				subtlex_count integer,
				subtlex_per_million double precision,
				subtlex_context_diversity integer,
				stroke_data_simp jsonb,
				stroke_data_trad jsonb,
				fragments_simp jsonb,
				fragments_trad jsonb,
				historical_images jsonb,
				historical_pronunciations jsonb,
				shuowen_explanation text,
				shuowen_pronunciation text,
				shuowen_pinyin text,
				pinyin_frequencies jsonb,
				pinyin text[],
				created_at timestamptz NOT NULL DEFAULT NOW(),
				updated_at timestamptz NOT NULL DEFAULT NOW()
			)
		`;

		// Create shadow table (drop if leftover from a failed previous run)
		await sql`DROP TABLE IF EXISTS dictionary.char_base_new`;
		await sql`CREATE TABLE dictionary.char_base_new (LIKE dictionary.char_base INCLUDING ALL)`;
		console.log('Created shadow table char_base_new');

		// 1. Load all sources
		console.log('--- Loading sources ---\n');
		const [
			dong,
			animcjkData,
			makemeahanzi,
			baxterSagart,
			zhengzhang,
			shuowen,
			junDa,
			subtlex,
			unihanFields,
			wordPinyin,
			updatedAtMap
		] = await Promise.all([
			loadDongChars(sql),
			loadAnimcjk(sql),
			loadMakemeahanzi(sql),
			loadBaxterSagart(sql),
			loadZhengzhang(sql),
			loadShuowen(sql),
			loadJunDa(sql),
			loadSubtlex(sql),
			loadUnihanFields(sql),
			loadWordPinyin(sql),
			loadUpdatedAtMap(sql)
		]);

		// 2. Build universe of characters
		console.log('\n--- Building character universe ---\n');
		const universe = new Set<string>();

		for (const char of dong.keys()) universe.add(char);
		for (const char of animcjkData.simplified.keys()) universe.add(char);
		for (const char of animcjkData.traditional.keys()) universe.add(char);
		for (const char of makemeahanzi.keys()) universe.add(char);
		for (const char of baxterSagart.keys()) universe.add(char);
		for (const char of zhengzhang.keys()) universe.add(char);
		for (const char of shuowen.keys()) universe.add(char);
		for (const char of junDa.keys()) universe.add(char);
		for (const char of subtlex.keys()) universe.add(char);

		// Add characters from unihan codepoints
		for (const cp of unihanFields.keys()) {
			try {
				const char = codepointToChar(cp);
				universe.add(char);
			} catch {
				// skip invalid codepoints
			}
		}

		console.log(`Total unique characters: ${universe.size.toLocaleString()}`);

		// 3. Build rows
		console.log('\n--- Building rows ---\n');
		const allRows: CharBaseRow[] = [];
		for (const char of universe) {
			allRows.push(
				buildRow(
					char,
					dong,
					animcjkData,
					makemeahanzi,
					baxterSagart,
					zhengzhang,
					shuowen,
					junDa,
					subtlex,
					unihanFields,
					wordPinyin,
					updatedAtMap
				)
			);
		}
		console.log(`Built ${allRows.length.toLocaleString()} rows`);

		// 4. Insert into shadow table (char_base_new), then atomic swap
		console.log('\n--- Inserting into shadow table ---\n');

		{
			let processed = 0;
			for (let i = 0; i < allRows.length; i += BATCH_SIZE) {
				const batch = allRows.slice(i, i + BATCH_SIZE);
				// insertBatch writes to char_base_new (no ON CONFLICT needed — fresh table)
				await insertBatch(sql as unknown as Tx, batch);
				processed += batch.length;
				if (processed % 10000 === 0 || processed === allRows.length) {
					console.log(
						`  Progress: ${processed.toLocaleString()}/${allRows.length.toLocaleString()}`
					);
				}
			}
		}

		// Atomic swap: rename tables in a single transaction
		// Readers see either the old or new table — never an empty one
		console.log('\nSwapping tables...');
		await sql.begin(async (tx) => {
			await tx`ALTER TABLE dictionary.char_base RENAME TO char_base_old`;
			await tx`ALTER TABLE dictionary.char_base_new RENAME TO char_base`;
			await tx`DROP TABLE dictionary.char_base_old`;
		});
		console.log('Swap complete');

		// Summary
		const countResult = await sql`SELECT COUNT(*) AS total FROM dictionary.char_base`;
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

		console.log(`\n=== Done ===`);
		console.log(`Total rows: ${Number(countResult[0].total).toLocaleString()}`);
		console.log(`Time: ${elapsed}s`);
	} finally {
		await sql.end();
	}
}

main().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});

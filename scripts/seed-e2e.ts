/**
 * Seeds the dictionary with minimal character data for e2e tests.
 *
 * Inserts 好 and all `exampleChars['meaning']` characters so the
 * component-type explain modal test has data to work with.
 *
 * Usage: npx tsx scripts/seed-e2e.ts
 */
import postgres from 'postgres';
import { exampleChars } from '../src/lib/data/component-type-info.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
	console.error('DATABASE_URL is not set');
	process.exit(1);
}

const sql = postgres(DATABASE_URL);

// Minimal character rows — only the fields required for page render + modal
const chars: Record<
	string,
	{
		codepoint: string;
		gloss: string;
		pinyin: string[];
		strokeCountSimp: number;
		components: object[];
		fragmentsSimp: number[][];
		isVerified: boolean;
	}
> = {
	好: {
		codepoint: 'U+597D',
		gloss: 'good',
		pinyin: ['hǎo'],
		strokeCountSimp: 6,
		components: [
			{ character: '女', type: ['meaning'], hint: null },
			{ character: '子', type: ['meaning'], hint: null }
		],
		fragmentsSimp: [
			[0, 1, 2],
			[3, 4, 5]
		],
		isVerified: true
	},
	女: {
		codepoint: 'U+5973',
		gloss: 'woman',
		pinyin: ['nǚ'],
		strokeCountSimp: 3,
		components: [],
		fragmentsSimp: [],
		isVerified: true
	},
	口: {
		codepoint: 'U+53E3',
		gloss: 'mouth',
		pinyin: ['kǒu'],
		strokeCountSimp: 3,
		components: [],
		fragmentsSimp: [],
		isVerified: true
	},
	心: {
		codepoint: 'U+5FC3',
		gloss: 'heart',
		pinyin: ['xīn'],
		strokeCountSimp: 4,
		components: [],
		fragmentsSimp: [],
		isVerified: true
	},
	金: {
		codepoint: 'U+91D1',
		gloss: 'metal',
		pinyin: ['jīn'],
		strokeCountSimp: 8,
		components: [],
		fragmentsSimp: [],
		isVerified: true
	},
	妈: {
		codepoint: 'U+5988',
		gloss: 'mother',
		pinyin: ['mā'],
		strokeCountSimp: 6,
		components: [
			{ character: '女', type: ['meaning'], hint: null },
			{ character: '马', type: ['sound'], hint: '' }
		],
		fragmentsSimp: [
			[0, 1, 2],
			[3, 4, 5]
		],
		isVerified: true
	},
	媽: {
		codepoint: 'U+5ABD',
		gloss: 'mother',
		pinyin: ['mā'],
		strokeCountSimp: 13,
		components: [
			{ character: '女', type: ['meaning'], hint: null },
			{ character: '馬', type: ['sound'], hint: '' }
		],
		fragmentsSimp: [
			[0, 1, 2],
			[3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
		],
		isVerified: true
	},
	问: {
		codepoint: 'U+95EE',
		gloss: 'ask (about)',
		pinyin: ['wèn'],
		strokeCountSimp: 6,
		components: [
			{ character: '口', type: ['meaning'], hint: null },
			{ character: '门', type: ['sound'], hint: '' }
		],
		fragmentsSimp: [
			[3, 4, 5],
			[0, 1, 2]
		],
		isVerified: true
	},
	問: {
		codepoint: 'U+554F',
		gloss: 'ask (about)',
		pinyin: ['wèn'],
		strokeCountSimp: 11,
		components: [
			{ character: '口', type: ['meaning'], hint: null },
			{ character: '門', type: ['sound'], hint: '' }
		],
		fragmentsSimp: [
			[8, 9, 10],
			[0, 1, 2, 3, 4, 5, 6, 7]
		],
		isVerified: true
	},
	想: {
		codepoint: 'U+60F3',
		gloss: 'think',
		pinyin: ['xiǎng'],
		strokeCountSimp: 13,
		components: [
			{ character: '心', type: ['meaning'], hint: null },
			{ character: '相', type: ['sound'], hint: '' }
		],
		fragmentsSimp: [
			[9, 10, 11, 12],
			[0, 1, 2, 3, 4, 5, 6, 7, 8]
		],
		isVerified: true
	},
	错: {
		codepoint: 'U+9519',
		gloss: 'error',
		pinyin: ['cuò'],
		strokeCountSimp: 13,
		components: [
			{ character: '钅', type: ['meaning'], hint: '钅 is a component form of 金.' },
			{ character: '昔', type: ['sound'], hint: '' }
		],
		fragmentsSimp: [
			[0, 1, 2, 3, 4],
			[5, 6, 7, 8, 9, 10, 11, 12]
		],
		isVerified: true
	},
	錯: {
		codepoint: 'U+932F',
		gloss: 'error',
		pinyin: ['cuò'],
		strokeCountSimp: 16,
		components: [
			{ character: '金', type: ['meaning'], hint: null },
			{ character: '昔', type: ['sound'], hint: '' }
		],
		fragmentsSimp: [
			[0, 1, 2, 3, 4, 5, 6, 7],
			[8, 9, 10, 11, 12, 13, 14, 15]
		],
		isVerified: true
	}
};

// Verify all exampleChars['meaning'] are covered
const meaningChars = exampleChars['meaning'];
const missing = meaningChars.filter((c) => !(c in chars));
if (missing.length > 0) {
	console.error(`Missing character data for: ${missing.join(', ')}`);
	process.exit(1);
}

async function seed() {
	const rows = Object.entries(chars).map(([character, data]) => ({
		character,
		codepoint: data.codepoint,
		gloss: data.gloss,
		pinyin: data.pinyin,
		stroke_count_simp: data.strokeCountSimp,
		stroke_count_trad: data.strokeCountSimp,
		is_verified: data.isVerified,
		components: sql.json(data.components),
		fragments_simp: sql.json(data.fragmentsSimp)
	}));

	await sql`
		INSERT INTO dictionary.char_base ${sql(rows, 'character', 'codepoint', 'gloss', 'pinyin', 'stroke_count_simp', 'stroke_count_trad', 'is_verified', 'components', 'fragments_simp')}
		ON CONFLICT (character) DO NOTHING
	`;

	console.log(`Seeded ${rows.length} characters for e2e tests`);
	await sql.end();
}

seed().catch((err) => {
	console.error(err);
	process.exit(1);
});

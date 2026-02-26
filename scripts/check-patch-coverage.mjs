#!/usr/bin/env node

/**
 * Check patch coverage: ensures new/changed lines meet a minimum coverage threshold.
 *
 * Parses LCOV coverage data and cross-references with `git diff` to compute
 * the percentage of added lines that are covered by tests.
 *
 * Usage: node scripts/check-patch-coverage.mjs --threshold=70 --base=origin/main
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const threshold = parseFloat(getArg(args, '--threshold') ?? '70');
const base = getArg(args, '--base') ?? 'origin/main';
const lcovPath = getArg(args, '--lcov') ?? 'coverage/lcov.info';

// --- Parse LCOV ---

const lcovFile = resolve(process.cwd(), lcovPath);
let lcovContent;
try {
	lcovContent = readFileSync(lcovFile, 'utf-8');
} catch {
	console.error(`Could not read LCOV file: ${lcovFile}`);
	process.exit(1);
}

/** @type {Map<string, Map<number, number>>} file → (line → hit count) */
const coverageMap = new Map();
let currentFile = null;

for (const line of lcovContent.split('\n')) {
	if (line.startsWith('SF:')) {
		// SF lines contain absolute or relative paths; normalize to relative
		currentFile = normalizePath(line.slice(3));
	} else if (line.startsWith('DA:') && currentFile) {
		const [lineNo, hits] = line.slice(3).split(',');
		if (!coverageMap.has(currentFile)) {
			coverageMap.set(currentFile, new Map());
		}
		coverageMap.get(currentFile).set(parseInt(lineNo, 10), parseInt(hits, 10));
	} else if (line === 'end_of_record') {
		currentFile = null;
	}
}

// --- Parse git diff ---

let diffOutput;
try {
	// Three-dot diff uses the merge base — preferred but requires sufficient history
	diffOutput = execSync(`git diff ${base}...HEAD --unified=0 --diff-filter=ACM`, {
		encoding: 'utf-8',
		maxBuffer: 50 * 1024 * 1024
	});
} catch {
	try {
		// Fall back to two-dot diff (direct comparison) in shallow clones
		console.log('Three-dot diff failed, falling back to two-dot diff');
		diffOutput = execSync(`git diff ${base}..HEAD --unified=0 --diff-filter=ACM`, {
			encoding: 'utf-8',
			maxBuffer: 50 * 1024 * 1024
		});
	} catch (e) {
		console.error(`Failed to run git diff: ${e.message}`);
		process.exit(1);
	}
}

/** @type {Map<string, Set<number>>} file → set of added line numbers */
const addedLines = new Map();
let diffFile = null;

for (const line of diffOutput.split('\n')) {
	// +++ b/src/lib/foo.ts
	if (line.startsWith('+++ b/')) {
		diffFile = line.slice(6);
	} else if (line.startsWith('@@ ') && diffFile) {
		// @@ -old,count +new,count @@
		const match = line.match(/\+(\d+)(?:,(\d+))?/);
		if (match) {
			const start = parseInt(match[1], 10);
			const count = match[2] !== undefined ? parseInt(match[2], 10) : 1;
			if (!addedLines.has(diffFile)) {
				addedLines.set(diffFile, new Set());
			}
			const lines = addedLines.get(diffFile);
			for (let i = start; i < start + count; i++) {
				lines.add(i);
			}
		}
	}
}

// --- Cross-reference ---

let covered = 0;
let uncovered = 0;

for (const [file, lines] of addedLines) {
	const fileCoverage = coverageMap.get(file);
	if (!fileCoverage) continue; // file not instrumented — skip

	for (const lineNo of lines) {
		if (!fileCoverage.has(lineNo)) continue; // line not instrumentable (comments, types, etc.)
		if (fileCoverage.get(lineNo) > 0) {
			covered++;
		} else {
			uncovered++;
		}
	}
}

const total = covered + uncovered;

if (total === 0) {
	console.log('Patch coverage: N/A (no instrumentable new lines)');
	process.exit(0);
}

const pct = (covered / total) * 100;
const rounded = Math.round(pct * 100) / 100;

console.log(`Patch coverage: ${rounded}% (${covered}/${total} lines covered)`);

if (rounded < threshold) {
	console.error(`Below threshold of ${threshold}%`);
	process.exit(1);
}

// --- Helpers ---

function getArg(argv, name) {
	const prefix = name + '=';
	const arg = argv.find((a) => a.startsWith(prefix));
	return arg ? arg.slice(prefix.length) : undefined;
}

function normalizePath(p) {
	// LCOV may have absolute paths — make relative to cwd
	const cwd = process.cwd().replace(/\\/g, '/');
	let normalized = p.replace(/\\/g, '/');
	if (normalized.startsWith(cwd + '/')) {
		normalized = normalized.slice(cwd.length + 1);
	}
	return normalized;
}

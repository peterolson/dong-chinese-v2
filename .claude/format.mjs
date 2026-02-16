/**
 * PostToolUse hook: runs prettier on files written/edited by Claude.
 * Reads the hook payload from stdin (JSON) and extracts the file path.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { extname } from 'node:path';

const FORMATTABLE = new Set([
	'.ts', '.js', '.mjs', '.cjs',
	'.svelte', '.html', '.css',
	'.json', '.md', '.yaml', '.yml'
]);

let input = '';
for await (const chunk of process.stdin) {
	input += chunk;
}

const payload = JSON.parse(input);
const filePath = payload.tool_input?.file_path;

if (!filePath || !existsSync(filePath)) {
	process.exit(0);
}

if (!FORMATTABLE.has(extname(filePath).toLowerCase())) {
	process.exit(0);
}

try {
	execSync(`npx prettier --write "${filePath}"`, {
		stdio: ['ignore', 'ignore', 'pipe']
	});
} catch {
	// Don't block Claude if prettier fails
	process.exit(0);
}

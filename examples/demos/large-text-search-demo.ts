/**
 * Large Text Search Demo
 *
 * Demonstrates incremental search through a large generated text buffer.
 * Type to build a search query, Enter to search, n/N for next/prev match.
 * Press Escape to clear, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/large-text-search-demo.ts
 * @module demos/large-text-search
 */
import { search, createSearchCache, updateSearchQuery, searchWithCache, getMatchStatus } from '../../src/utils/textSearch';

// Generate a large text body (~10k lines)
const WORDS = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
const textLines: string[] = [];
for (let i = 0; i < 10000; i++) {
	const w1 = WORDS[i % WORDS.length]!;
	const w2 = WORDS[(i * 3 + 1) % WORDS.length]!;
	textLines.push(`[${String(i + 1).padStart(5)}] ${w1} ${w2} lorem ipsum`);
}
const TEXT = textLines.join('\n');
const cache = createSearchCache();

let query = '';
let matchIndex = 0;

function render(): void {
	const status = getMatchStatus(cache);
	const lines: string[] = ['\x1b[2J\x1b[H'];
	lines.push('\x1b[1m  Large Text Search Demo\x1b[0m\n');
	lines.push('  Type to search  |  Enter = search  |  n/N = next/prev  |  Esc = clear  |  q = quit\n');
	lines.push('  ───────────────────────────────────────────────────────────────────────────────────\n\n');

	lines.push(`  Query: \x1b[33m${query || '(empty)'}\x1b[0m\n`);
	lines.push(`  Matches: ${status.total}  |  Current: ${status.total > 0 ? matchIndex + 1 : 0}/${status.total}  |  Complete: ${status.complete ? 'yes' : 'no'}\n\n`);

	// Show context around current match
	if (status.total > 0) {
		const result = search(TEXT, query, { caseSensitive: false });
		const matches = result.matches;
		if (matches.length > 0) {
			const m = matches[matchIndex % matches.length]!;
			lines.push(`  \x1b[4mMatch at line ${m.line + 1}, column ${m.column + 1}:\x1b[0m\n`);
			// Show surrounding lines
			const matchLine = m.line;
			for (let l = Math.max(0, matchLine - 2); l <= Math.min(textLines.length - 1, matchLine + 2); l++) {
				const prefix = l === matchLine ? '\x1b[32m> ' : '  ';
				const suffix = l === matchLine ? '\x1b[0m' : '';
				lines.push(`  ${prefix}${textLines[l]}${suffix}\n`);
			}
		}
	} else if (query.length > 0) {
		lines.push('  \x1b[2mNo matches found.\x1b[0m\n');
	}

	lines.push(`\n  \x1b[2mText buffer: ${textLines.length.toLocaleString()} lines, ${TEXT.length.toLocaleString()} chars\x1b[0m\n`);
	process.stdout.write(lines.join(''));
}

function doSearch(): void {
	if (query.length === 0) return;
	updateSearchQuery(cache, TEXT, query, { caseSensitive: false });
	searchWithCache(cache, TEXT);
	matchIndex = 0;
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03') { shutdown(); return; }
		if (ch === 'q' && query.length === 0) { shutdown(); return; }

		const status = getMatchStatus(cache);
		if (ch === '\x1b') { query = ''; matchIndex = 0; }
		else if (ch === '\r') { doSearch(); }
		else if (ch === 'n' && query.length > 0) { matchIndex = (matchIndex + 1) % Math.max(1, status.total); }
		else if (ch === 'N' && query.length > 0) { matchIndex = (matchIndex - 1 + Math.max(1, status.total)) % Math.max(1, status.total); }
		else if (ch === '\x7f' || ch === '\b') { query = query.slice(0, -1); }
		else if (ch.length === 1 && ch.charCodeAt(0) >= 32) { query += ch; }
		render();
	});
}

function shutdown(): void {
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();

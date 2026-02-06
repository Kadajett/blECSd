/**
 * List Widget Demo
 *
 * Demonstrates a scrollable list with keyboard selection and search filtering.
 * Use j/k or arrow keys to navigate, / to search, Enter to select, q to quit.
 *
 * Run: npx tsx examples/demos/list-demo.ts
 * @module demos/list
 */

export {};

const ALL_ITEMS = [
	'Apple', 'Banana', 'Cherry', 'Date', 'Elderberry',
	'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon',
	'Mango', 'Nectarine', 'Orange', 'Papaya', 'Quince',
	'Raspberry', 'Strawberry', 'Tangerine', 'Ugli Fruit', 'Watermelon',
];

let selectedIdx = 0;
let scrollOffset = 0;
let searchQuery = '';
let searching = false;
const VISIBLE = 10;

function filteredItems(): string[] {
	if (!searchQuery) return [...ALL_ITEMS];
	const q = searchQuery.toLowerCase();
	return ALL_ITEMS.filter((item) => item.toLowerCase().includes(q));
}

function render(): void {
	const items = filteredItems();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push('\x1b[1m  List Widget Demo\x1b[0m\n');
	out.push('  j/k = navigate  |  / = search  |  Enter = select  |  q = quit\n');
	out.push('  ──────────────────────────────────────────────────────────\n\n');

	if (searching) {
		out.push(`  Search: \x1b[33m${searchQuery}_\x1b[0m\n\n`);
	}

	const maxScroll = Math.max(0, items.length - VISIBLE);
	scrollOffset = Math.min(scrollOffset, maxScroll);
	const visibleSlice = items.slice(scrollOffset, scrollOffset + VISIBLE);

	out.push('  ┌────────────────────────┐\n');
	for (let i = 0; i < VISIBLE; i++) {
		const globalIdx = scrollOffset + i;
		const item = visibleSlice[i];
		if (!item) {
			out.push('  │                        │\n');
			continue;
		}
		const isSel = globalIdx === selectedIdx;
		const prefix = isSel ? '>' : ' ';
		const fg = isSel ? '\x1b[1;33m' : '\x1b[0m';
		const padded = `${prefix} ${item}`.padEnd(24);
		out.push(`  │${fg}${padded}\x1b[0m│\n`);
	}
	out.push('  └────────────────────────┘\n');

	out.push(`\n  ${items.length} items  |  Selected: \x1b[32m${items[selectedIdx] || '(none)'}\x1b[0m\n`);
	if (items.length > VISIBLE) {
		out.push(`  Showing ${scrollOffset + 1}-${Math.min(scrollOffset + VISIBLE, items.length)} of ${items.length}\n`);
	}

	process.stdout.write(out.join(''));
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		const items = filteredItems();

		if (searching) {
			if (ch === '\x1b' || ch === '\r') {
				searching = false;
			} else if (ch === '\x7f') {
				searchQuery = searchQuery.slice(0, -1);
				selectedIdx = 0;
				scrollOffset = 0;
			} else if (ch.length === 1 && ch >= ' ') {
				searchQuery += ch;
				selectedIdx = 0;
				scrollOffset = 0;
			}
		} else {
			if (ch === '\x03' || ch === 'q') { shutdown(); return; }
			if (ch === '/') { searching = true; searchQuery = ''; }
			else if (ch === 'j' || ch === '\x1b[B') {
				selectedIdx = Math.min(items.length - 1, selectedIdx + 1);
				if (selectedIdx >= scrollOffset + VISIBLE) scrollOffset++;
			} else if (ch === 'k' || ch === '\x1b[A') {
				selectedIdx = Math.max(0, selectedIdx - 1);
				if (selectedIdx < scrollOffset) scrollOffset--;
			}
		}
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

/**
 * Table Demo
 *
 * Demonstrates a multi-column Table with headers, row navigation,
 * and dynamic data manipulation.
 *
 * Run: npx tsx examples/demos/table-demo.ts
 * @module demos/table
 */
import { createWorld, addEntity } from 'blecsd';
import { attachTableBehavior, setHeaders, appendRow, getData, getDataRows, renderTableLines, getColumns, removeRow, setTableDisplay } from 'blecsd/components';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo, parseArrowKey } from './demo-utils';

const world = createWorld();
const table = addEntity(world);
attachTableBehavior(world, table);

// Configure display
setTableDisplay(table, { borderStyle: 'single', headerStyle: 'bold', padding: 1, zebra: true });

// Set headers
setHeaders(world, table, [
	{ key: 'name', label: 'Name', width: 15, align: 'left' },
	{ key: 'role', label: 'Role', width: 12, align: 'left' },
	{ key: 'level', label: 'Level', width: 8, align: 'right' },
	{ key: 'status', label: 'Status', width: 10, align: 'center' },
]);

// Add sample data
const sampleData = [
	['Alice', 'Engineer', '42', 'Active'],
	['Bob', 'Designer', '35', 'Active'],
	['Charlie', 'Manager', '28', 'Away'],
	['Diana', 'Engineer', '51', 'Active'],
	['Eve', 'Analyst', '19', 'Offline'],
	['Frank', 'Intern', '5', 'Active'],
	['Grace', 'Lead', '67', 'Away'],
];
for (const row of sampleData) appendRow(world, table, row);

let selectedRow = 0;
let sortAsc = true;

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Table Demo') + '\n');
	const rows = getDataRows(table);
	out.push(`  Rows: \x1b[36m${rows.length}\x1b[0m  Selected: \x1b[33m${selectedRow + 1}\x1b[0m\n`);
	out.push('  ' + '\u2500'.repeat(Math.min(width - 4, 55)) + '\n\n');

	// Render table lines
	const lines = renderTableLines(table, Math.min(width - 4, 55));
	for (let i = 0; i < lines.length; i++) {
		const isDataRow = i > 2 && i < lines.length - 1; // Skip header+separator rows
		const dataIdx = i - 3;
		const highlight = isDataRow && dataIdx === selectedRow ? '\x1b[7m' : '';
		out.push(`  ${highlight}${lines[i]}\x1b[0m\n`);
	}

	out.push(`\n  \x1b[90mPress 'a' to add row, 'd' to delete selected, 'r' to randomize\x1b[0m\n`);
	out.push(moveTo(height, 1) + formatHelpBar('[Up/Down] Navigate  [a] Add  [d] Delete  [r] Random  [q] Quit'));
	process.stdout.write(out.join(''));
}

function randomName(): string {
	const names = ['Hank', 'Iris', 'Jack', 'Kate', 'Leo', 'Mia', 'Noah', 'Zara'];
	return names[Math.floor(Math.random() * names.length)]!;
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const dir = parseArrowKey(data);
	const rows = getDataRows(table);
	if (dir === 'up') selectedRow = Math.max(0, selectedRow - 1);
	if (dir === 'down') selectedRow = Math.min(rows.length - 1, selectedRow + 1);
	if (ch === 'a') {
		const roles = ['Engineer', 'Designer', 'Manager', 'Analyst'];
		const statuses = ['Active', 'Away', 'Offline'];
		appendRow(world, table, [randomName(), roles[Math.random() * 4 | 0]!, String(Math.random() * 99 | 0), statuses[Math.random() * 3 | 0]!]);
	}
	if (ch === 'd' && rows.length > 0) { removeRow(world, table, selectedRow); selectedRow = Math.min(selectedRow, rows.length - 2); }
	if (ch === 'r') {
		// Re-randomize all levels
		const data = getDataRows(table);
		// Remove all and re-add with random levels
		while (getDataRows(table).length > 0) removeRow(world, table, 0);
		for (const row of data) {
			const cells = row.map((c) => c.text ?? '');
			cells[2] = String(Math.random() * 99 | 0);
			appendRow(world, table, cells);
		}
	}
	render();
});

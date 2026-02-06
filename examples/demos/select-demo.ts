/**
 * Select Widget Demo
 *
 * Demonstrates a dropdown select with keyboard navigation.
 * Tab to switch selects, Enter to open/close, arrows to navigate, q to exit.
 *
 * Run: npx tsx examples/demos/select-demo.ts
 * @module demos/select
 */
import {
	createWorld, createSelectEntity, attachSelectBehavior,
	setSelectOptions, openSelect, closeSelect, isSelectOpen,
	getSelectedValue, getSelectedLabel, getSelectOptions,
	highlightNext, highlightPrev, selectHighlighted, toggleSelect,
	getHighlightedIndex, onSelectChange, getSelectState,
} from 'blecsd';
import type { World, SelectOption } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey } from './demo-utils';

const world = createWorld() as World;

const selects = [
	{
		eid: createSelectEntity(world, { x: 4, y: 5, width: 25 }),
		label: 'Color',
		options: [
			{ value: 'red', label: 'Red' }, { value: 'green', label: 'Green' },
			{ value: 'blue', label: 'Blue' }, { value: 'yellow', label: 'Yellow' },
		] as SelectOption[],
	},
	{
		eid: createSelectEntity(world, { x: 4, y: 10, width: 25 }),
		label: 'Size',
		options: [
			{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' },
			{ value: 'lg', label: 'Large' }, { value: 'xl', label: 'Extra Large' },
		] as SelectOption[],
	},
];

for (const sel of selects) {
	attachSelectBehavior(world, sel.eid);
	setSelectOptions(world, sel.eid, sel.options);
}

let focusIdx = 0;
let lastChange = '';

onSelectChange(selects[0]!.eid, (val) => { lastChange = `Color: ${val}`; });
onSelectChange(selects[1]!.eid, (val) => { lastChange = `Size: ${val}`; });

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Select Widget Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab = switch  |  Enter = open/close  |  Up/Down = navigate  |  q = quit\x1b[0m');

	for (let i = 0; i < selects.length; i++) {
		const sel = selects[i]!;
		const focused = i === focusIdx;
		const open = isSelectOpen(world, sel.eid);
		const selected = getSelectedLabel(world, sel.eid) ?? '(none)';
		const hlIdx = getHighlightedIndex(world, sel.eid);
		const row = 5 + i * 5 + (i > 0 && isSelectOpen(world, selects[0]!.eid) ? selects[0]!.options.length + 1 : 0);
		const border = focused ? '\x1b[1;33m' : '\x1b[0m';
		const arrow = open ? '▲' : '▼';

		out.push(moveTo(row - 1, 4) + `\x1b[1m${sel.label}\x1b[0m`);
		out.push(moveTo(row, 4) + `${border}┌${'─'.repeat(23)}┐\x1b[0m`);
		out.push(moveTo(row + 1, 4) + `${border}│\x1b[0m ${selected.padEnd(20)} ${arrow} ${border}│\x1b[0m`);
		out.push(moveTo(row + 2, 4) + `${border}└${'─'.repeat(23)}┘\x1b[0m`);

		if (open) {
			for (let j = 0; j < sel.options.length; j++) {
				const opt = sel.options[j]!;
				const hl = j === hlIdx ? '\x1b[46;30m' : '\x1b[0m';
				out.push(moveTo(row + 3 + j, 5) + `${hl} ${opt.label.padEnd(22)}\x1b[0m`);
			}
		}
	}

	if (lastChange) out.push(moveTo(20, 4) + `\x1b[32mLast: ${lastChange}\x1b[0m`);
	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Switch  [Enter] Toggle  [Up/Down] Navigate  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const eid = selects[focusIdx]!.eid;
	if (ch === '\t') { if (isSelectOpen(world, eid)) closeSelect(world, eid); focusIdx = (focusIdx + 1) % selects.length; }
	else if (ch === '\r') { if (isSelectOpen(world, eid)) { selectHighlighted(world, eid); closeSelect(world, eid); } else openSelect(world, eid); }
	else if (ch === '\x1b[A') highlightPrev(world, eid);
	else if (ch === '\x1b[B') highlightNext(world, eid);
	else if (ch === '\x1b' && data.length === 1) closeSelect(world, eid);
	render();
});

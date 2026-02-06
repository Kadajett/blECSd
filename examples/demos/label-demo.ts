/**
 * Label Demo
 *
 * Demonstrates labels attached to UI elements with different positions.
 * Tab to cycle elements, arrow keys to change label position, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/label-demo.ts
 * @module demos/label
 */
import {
	createWorld, addEntity, addComponent, setLabel, getLabel,
	getLabelText, getLabelPosition, setLabelPosition, setLabelOffset,
	hasLabel, removeLabel, Label, LabelPosition, Position, setPosition,
	Dimensions, setDimensions, Border, setBorder,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle } from './demo-utils';

const world = createWorld() as World;

// Create elements with labels
const elements = [
	{ eid: addEntity(world) as Entity, name: 'Text Input', labelText: 'Username' },
	{ eid: addEntity(world) as Entity, name: 'Password', labelText: 'Password' },
	{ eid: addEntity(world) as Entity, name: 'Button', labelText: 'Submit' },
	{ eid: addEntity(world) as Entity, name: 'Checkbox', labelText: 'Remember me' },
];

const positions: readonly number[] = [LabelPosition.TopLeft, LabelPosition.BottomLeft, LabelPosition.Left, LabelPosition.Right];
const posNames = ['TopLeft', 'BottomLeft', 'Left', 'Right'] as const;

// Setup each element with position, dimensions, border, and label
for (let i = 0; i < elements.length; i++) {
	const el = elements[i]!;
	addComponent(world, el.eid, Position);
	addComponent(world, el.eid, Dimensions);
	addComponent(world, el.eid, Border);
	setPosition(world, el.eid, 6, 5 + i * 5);
	setDimensions(world, el.eid, 20, 3);
	setBorder(world, el.eid, { type: 0 });
	setLabel(world, el.eid, el.labelText, { position: LabelPosition.TopLeft, offsetX: 0, offsetY: 0 });
}

let focusIdx = 0;

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Label Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab = cycle  |  Up/Down = position  |  +/- = offset\x1b[0m');

	for (let i = 0; i < elements.length; i++) {
		const el = elements[i]!;
		const focused = i === focusIdx;
		const label = getLabel(world, el.eid);
		const labelText = getLabelText(world, el.eid) ?? '';
		const labelPos = getLabelPosition(world, el.eid);
		const posName = posNames[positions.indexOf(labelPos)] ?? 'TopLeft';
		const row = 5 + i * 5;
		const col = 6;
		const border = focused ? '\x1b[1;33m' : '\x1b[90m';
		const indicator = focused ? '\x1b[33m>\x1b[0m ' : '  ';

		// Draw label based on position
		const lblColor = '\x1b[36m';
		if (posName === 'TopLeft') out.push(moveTo(row - 1, col) + `${lblColor}${labelText}\x1b[0m`);
		if (posName === 'Left') out.push(moveTo(row + 1, col - labelText.length - 2) + `${lblColor}${labelText}\x1b[0m`);

		// Draw box
		out.push(moveTo(row, col - 2) + indicator);
		out.push(moveTo(row, col) + `${border}┌${'─'.repeat(18)}┐\x1b[0m`);
		out.push(moveTo(row + 1, col) + `${border}│\x1b[0m ${el.name.padEnd(17)}${border}│\x1b[0m`);
		out.push(moveTo(row + 2, col) + `${border}└${'─'.repeat(18)}┘\x1b[0m`);

		if (posName === 'BottomLeft') out.push(moveTo(row + 3, col) + `${lblColor}${labelText}\x1b[0m`);
		if (posName === 'Right') out.push(moveTo(row + 1, col + 22) + `${lblColor}${labelText}\x1b[0m`);

		// Show position info
		out.push(moveTo(row + 1, col + 30) + `\x1b[90mpos: ${posName}  offset: ${label?.offsetX ?? 0},${label?.offsetY ?? 0}\x1b[0m`);
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Cycle  [Up/Down] Position  [+/-] Offset  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }

setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	const ch = data.toString();
	if (ch === '\x03' || ch === 'q') { shutdown(); return; }
	if (ch === '\t') focusIdx = (focusIdx + 1) % elements.length;
	const el = elements[focusIdx]!;
	const currentPos = getLabelPosition(world, el.eid);
	const idx = positions.indexOf(currentPos);
	if (ch === '\x1b[A') setLabelPosition(world, el.eid, positions[(idx + positions.length - 1) % positions.length]!);
	if (ch === '\x1b[B') setLabelPosition(world, el.eid, positions[(idx + 1) % positions.length]!);
	if (ch === '+' || ch === '=') setLabelOffset(world, el.eid, (getLabel(world, el.eid)?.offsetX ?? 0) + 1, 0);
	if (ch === '-') setLabelOffset(world, el.eid, (getLabel(world, el.eid)?.offsetX ?? 0) - 1, 0);
	render();
});

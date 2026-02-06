/**
 * Slider Widget Demo
 *
 * Demonstrates horizontal sliders with value display.
 * Tab to cycle, arrows to adjust, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/slider-demo.ts
 * @module demos/slider
 */
import {
	createWorld, createSliderEntity, attachSliderBehavior,
	setSliderValue, getSliderValue, getSliderPercentage,
	incrementSlider, decrementSlider, setSliderRange,
	setSliderStep, renderSliderString, onSliderChange,
} from 'blecsd';
import type { World } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey, parseArrowKey } from './demo-utils';

const world = createWorld() as World;

const sliders = [
	{ eid: createSliderEntity(world, { x: 4, y: 6, width: 30, min: 0, max: 100, value: 50, step: 1 }), label: 'Volume', unit: '%' },
	{ eid: createSliderEntity(world, { x: 4, y: 9, width: 30, min: 0, max: 255, value: 128, step: 5 }), label: 'Brightness', unit: '' },
	{ eid: createSliderEntity(world, { x: 4, y: 12, width: 30, min: -50, max: 50, value: 0, step: 1 }), label: 'Balance', unit: '' },
	{ eid: createSliderEntity(world, { x: 4, y: 15, width: 30, min: 1, max: 10, value: 5, step: 1 }), label: 'Speed', unit: 'x' },
];

for (const sl of sliders) attachSliderBehavior(world, sl.eid);

let focusIdx = 0;
let lastChange = '';

for (const sl of sliders) {
	onSliderChange(sl.eid, (val) => { lastChange = `${sl.label}: ${val}`; });
}

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('Slider Widget Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab = switch  |  Left/Right = adjust  |  Home/End = min/max  |  q = quit\x1b[0m');

	for (let i = 0; i < sliders.length; i++) {
		const sl = sliders[i]!;
		const focused = i === focusIdx;
		const val = getSliderValue(world, sl.eid);
		const pct = getSliderPercentage(world, sl.eid);
		const bar = renderSliderString(sl.eid, 25);
		const row = 6 + i * 3;
		const color = focused ? '\x1b[1;33m' : '\x1b[0m';
		const indicator = focused ? '>' : ' ';

		out.push(moveTo(row, 2) + `${color}${indicator} ${sl.label.padEnd(12)}\x1b[0m`);
		out.push(moveTo(row + 1, 4) + `${bar}  ${val}${sl.unit} (${Math.round(pct)}%)`);
	}

	if (lastChange) out.push(moveTo(19, 4) + `\x1b[32mLast: ${lastChange}\x1b[0m`);
	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Switch  [Left/Right] Adjust  [Home/End] Min/Max  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const eid = sliders[focusIdx]!.eid;
	if (ch === '\t') focusIdx = (focusIdx + 1) % sliders.length;
	const arrow = parseArrowKey(data);
	if (arrow === 'right') incrementSlider(world, eid);
	if (arrow === 'left') decrementSlider(world, eid);
	if (ch === '\x1b[H') setSliderValue(world, eid, -50); // home - set to min
	if (ch === '\x1b[F') setSliderValue(world, eid, 255); // end - set to max
	render();
});

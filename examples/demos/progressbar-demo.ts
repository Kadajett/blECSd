/**
 * ProgressBar Widget Demo
 *
 * Demonstrates animated progress bar filling with controls.
 * Arrow keys to adjust, space to auto-fill, r to reset, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/progressbar-demo.ts
 * @module demos/progressbar
 */
import {
	createWorld, createProgressBarEntity, setProgress, getProgress,
	getProgressPercentage, isProgressComplete, incrementProgress,
	decrementProgress, resetProgress, setProgressBarDisplay,
	attachProgressBarBehavior, onProgressComplete, renderProgressString,
	setProgressRange, completeProgress,
} from 'blecsd';
import type { World } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle } from './demo-utils';

const world = createWorld() as World;

// Create three progress bars with different styles
const bars = [
	{ eid: createProgressBarEntity(world, { value: 0, min: 0, max: 100, x: 4, y: 5, width: 40 }), label: 'Download', auto: false },
	{ eid: createProgressBarEntity(world, { value: 0, min: 0, max: 100, x: 4, y: 8, width: 40 }), label: 'Install', auto: false },
	{ eid: createProgressBarEntity(world, { value: 0, min: 0, max: 100, x: 4, y: 11, width: 40 }), label: 'Build', auto: false },
];

for (const bar of bars) {
	attachProgressBarBehavior(world, bar.eid);
	onProgressComplete(bar.eid, () => { bar.auto = false; });
}

let focusIdx = 0;

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('ProgressBar Widget Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mTab = switch  |  Left/Right = adjust  |  Space = auto-fill  |  r = reset\x1b[0m');

	for (let i = 0; i < bars.length; i++) {
		const bar = bars[i]!;
		const pct = getProgressPercentage(world, bar.eid);
		const done = isProgressComplete(world, bar.eid);
		const focused = i === focusIdx;
		const indicator = focused ? '>' : ' ';
		const barStr = renderProgressString(bar.eid, 30);
		const status = done ? '\x1b[32m DONE\x1b[0m' : bar.auto ? '\x1b[36m AUTO\x1b[0m' : '';
		const row = 5 + i * 3;
		const color = focused ? '\x1b[1;33m' : '\x1b[0m';
		out.push(moveTo(row, 2) + `${color}${indicator} ${bar.label.padEnd(10)}\x1b[0m`);
		out.push(moveTo(row + 1, 4) + `${barStr}  ${Math.round(pct)}%${status}`);
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Tab] Switch  [Left/Right] Adjust  [Space] Auto  [r] Reset  [q] Quit'));
	process.stdout.write(out.join(''));
}

let timer: ReturnType<typeof setInterval>;

function shutdown(): void {
	clearInterval(timer);
	shutdownTerminal();
	process.exit(0);
}

setupTerminal();
setupSignalHandlers(shutdown);
render();

// Auto-fill timer
timer = setInterval(() => {
	let changed = false;
	for (const bar of bars) {
		if (bar.auto && !isProgressComplete(world, bar.eid)) {
			incrementProgress(world, bar.eid, 1 + Math.random() * 2);
			changed = true;
		}
	}
	if (changed) render();
}, 80);

process.stdin.on('data', (data: Buffer) => {
	const ch = data.toString();
	if (ch === '\x03' || ch === 'q') { shutdown(); return; }
	if (ch === '\t') focusIdx = (focusIdx + 1) % bars.length;
	if (ch === '\x1b[C') incrementProgress(world, bars[focusIdx]!.eid, 5);
	if (ch === '\x1b[D') decrementProgress(world, bars[focusIdx]!.eid, 5);
	if (ch === ' ') bars[focusIdx]!.auto = !bars[focusIdx]!.auto;
	if (ch === 'r') { resetProgress(world, bars[focusIdx]!.eid); bars[focusIdx]!.auto = false; }
	render();
});

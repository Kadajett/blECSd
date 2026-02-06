/**
 * Event Bus Demo
 *
 * Demonstrates type-safe event emission and subscription.
 * Press number keys to emit events, see listeners react in real-time.
 *
 * Run: npx tsx examples/demos/event-bus-demo.ts
 * @module demos/event-bus
 */
import { createEventBus } from 'blecsd';
import type { Unsubscribe } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

// Define typed events
interface DemoEvents {
	'player:moved': { x: number; y: number };
	'item:collected': { name: string; value: number };
	'score:changed': { score: number };
	'timer:tick': { elapsed: number };
}

const bus = createEventBus<DemoEvents>();
const log: string[] = [];
let score = 0;
let ticks = 0;

// Subscribe to events
const unsubs: Unsubscribe[] = [];
unsubs.push(bus.on('player:moved', (e) => { log.push(`\x1b[36mPlayer moved to (${e.x}, ${e.y})\x1b[0m`); }));
unsubs.push(bus.on('item:collected', (e) => { log.push(`\x1b[33mCollected ${e.name} (+${e.value})\x1b[0m`); score += e.value; bus.emit('score:changed', { score }); }));
unsubs.push(bus.on('score:changed', (e) => { log.push(`\x1b[32mScore updated: ${e.score}\x1b[0m`); }));
unsubs.push(bus.on('timer:tick', (e) => { log.push(`\x1b[90mTick ${e.elapsed}s\x1b[0m`); }));

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Event Bus Demo') + '\n');
	out.push(`  Score: \x1b[32m${score}\x1b[0m  |  Events fired: \x1b[36m${ticks}\x1b[0m\n`);
	out.push('  \u2500'.padEnd(width - 2, '\u2500') + '\n');
	out.push('  \x1b[1mKeys:\x1b[0m\n');
	out.push('  [1] Emit player:moved    [2] Emit item:collected\n');
	out.push('  [3] Emit timer:tick       [c] Clear log\n\n');
	out.push('  \x1b[1mEvent Log:\x1b[0m\n');
	const maxLog = Math.min(log.length, height - 12);
	const start = Math.max(0, log.length - maxLog);
	for (let i = start; i < log.length; i++) out.push(`    ${log[i]}\n`);
	out.push(moveTo(height, 1) + formatHelpBar('[1-3] Emit events  [c] Clear  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { unsubs.forEach((u) => u()); shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	if (ch === '1') { ticks++; bus.emit('player:moved', { x: Math.floor(Math.random() * 80), y: Math.floor(Math.random() * 24) }); }
	if (ch === '2') { ticks++; bus.emit('item:collected', { name: ['Gem', 'Coin', 'Star'][Math.floor(Math.random() * 3)]!, value: Math.floor(Math.random() * 50) + 10 }); }
	if (ch === '3') { ticks++; bus.emit('timer:tick', { elapsed: ++ticks }); }
	if (ch === 'c') { log.length = 0; }
	render();
});

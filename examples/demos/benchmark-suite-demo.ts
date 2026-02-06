/**
 * Benchmark Suite Demo
 *
 * Demonstrates performance benchmarks for core ECS operations.
 * Measures entity creation, component access, query performance, and more.
 *
 * Run: npx tsx examples/demos/benchmark-suite-demo.ts
 * @module demos/benchmark-suite
 */
import {
	createWorld, addEntity, removeEntity, addComponent, removeComponent, hasComponent,
	Position, setPosition, getPosition,
	Velocity, setVelocity,
	Renderable, setStyle,
	Dimensions, setDimensions,
	queryRenderable,
} from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, formatHelpBar, formatTitle, isQuitKey, getTerminalSize, moveTo } from './demo-utils';

interface BenchResult { name: string; ops: number; time: number; count: number }
let results: BenchResult[] = [];
let running = false;
let currentBench = '';

function bench(name: string, count: number, fn: () => void): BenchResult {
	currentBench = name;
	const start = performance.now();
	fn();
	const elapsed = performance.now() - start;
	return { name, ops: Math.round(count / (elapsed / 1000)), time: elapsed, count };
}

function runBenchmarks(): void {
	running = true;
	results = [];
	render();

	// 1. Entity creation
	const w1 = createWorld();
	results.push(bench('Create entities', 10000, () => {
		for (let i = 0; i < 10000; i++) addEntity(w1);
	}));

	// 2. Add components
	const w2 = createWorld();
	const eids2: number[] = [];
	for (let i = 0; i < 5000; i++) eids2.push(addEntity(w2));
	results.push(bench('Add Position component', 5000, () => {
		for (const eid of eids2) { addComponent(w2, eid, Position); setPosition(w2, eid, 0, 0); }
	}));

	// 3. Component access (read)
	results.push(bench('Read Position (5000)', 5000, () => {
		for (const eid of eids2) getPosition(w2, eid);
	}));

	// 4. Component access (write)
	results.push(bench('Write Position (5000)', 5000, () => {
		for (const eid of eids2) setPosition(w2, eid, Math.random() * 100, Math.random() * 100);
	}));

	// 5. Query performance
	const w3 = createWorld();
	for (let i = 0; i < 10000; i++) {
		const eid = addEntity(w3);
		addComponent(w3, eid, Position);
		addComponent(w3, eid, Renderable);
		if (i % 2 === 0) addComponent(w3, eid, Velocity);
		if (i % 3 === 0) addComponent(w3, eid, Dimensions);
	}
	results.push(bench('Query renderable (10K)', 100, () => {
		for (let i = 0; i < 100; i++) queryRenderable(w3);
	}));

	// 6. hasComponent check
	results.push(bench('hasComponent (10K)', 10000, () => {
		for (let i = 1; i <= 10000; i++) hasComponent(w3, i, Velocity);
	}));

	// 7. Entity removal
	const w4 = createWorld();
	const eids4: number[] = [];
	for (let i = 0; i < 5000; i++) {
		const eid = addEntity(w4);
		addComponent(w4, eid, Position);
		eids4.push(eid);
	}
	results.push(bench('Remove entities (5000)', 5000, () => {
		for (const eid of eids4) removeEntity(w4, eid);
	}));

	// 8. Mixed workload
	const w5 = createWorld();
	results.push(bench('Mixed ops (create+set+query)', 2000, () => {
		for (let i = 0; i < 2000; i++) {
			const eid = addEntity(w5);
			addComponent(w5, eid, Position);
			addComponent(w5, eid, Renderable);
			setPosition(w5, eid, i, i);
			setStyle(w5, eid, { fg: 0xffffffff });
		}
		queryRenderable(w5);
	}));

	running = false;
	currentBench = '';
}

function render(): void {
	const { width, height } = getTerminalSize();
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push(formatTitle('Benchmark Suite Demo') + '\n');
	out.push(`  Status: ${running ? `\x1b[33mRunning: ${currentBench}\x1b[0m` : '\x1b[32mIdle\x1b[0m'}\n`);
	out.push('  ' + '\u2500'.repeat(Math.min(width - 4, 70)) + '\n\n');

	if (results.length === 0) {
		out.push('  \x1b[90mPress [r] to run benchmarks\x1b[0m\n');
	} else {
		out.push('  \x1b[1mResults:\x1b[0m\n\n');
		const maxOps = Math.max(...results.map((r) => r.ops));
		for (const r of results) {
			const barLen = Math.max(1, Math.floor(r.ops / maxOps * 25));
			const bar = '\x1b[32m' + '\u2588'.repeat(barLen) + '\x1b[0m';
			out.push(`  ${r.name.padEnd(30)} ${String(r.ops).padStart(12)} ops/s  ${r.time.toFixed(1).padStart(8)}ms  ${bar}\n`);
		}
		out.push(`\n  \x1b[90mTotal time: ${results.reduce((s, r) => s + r.time, 0).toFixed(1)}ms\x1b[0m\n`);
	}

	out.push(moveTo(height, 1) + formatHelpBar('[r] Run benchmarks  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);
render();

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	if (data.toString() === 'r' && !running) { runBenchmarks(); }
	render();
});

#!/usr/bin/env node
/** Scheduler Demo - phase-ordered system execution.
 * Run: npx tsx examples/demos/scheduler-demo.ts | Quit: q or Ctrl+C */
import { createWorld, createScheduler, LoopPhase, getDeltaTime } from 'blecsd';
import type { World, System } from 'blecsd';

const stdout = process.stdout;
const height = stdout.rows ?? 24;
stdout.write('\x1b[?1049h\x1b[?25l');
const world = createWorld() as World;
const scheduler = createScheduler();

// Track execution order
const log: string[] = [];
let frameCount = 0, totalDt = 0;
const phaseNames = ['INPUT', 'EARLY_UPDATE', 'UPDATE', 'LATE_UPDATE', 'PHYSICS', 'LAYOUT', 'RENDER', 'POST_RENDER'];
const phaseColors = ['31', '33', '32', '36', '35', '34', '37', '90'];
const enabled: boolean[] = [true, true, true, true, true, true];

function makeSystem(phase: LoopPhase, name: string): System {
	return (w: World): World => {
		const dt = getDeltaTime();
		log.push(`[${name}] dt=${dt.toFixed(3)}s`);
		if (log.length > 12) log.shift();
		return w;
	};
}

// Register systems (can't register to INPUT, skip index 0)
const systems: { phase: LoopPhase; name: string; sys: System }[] = [];
for (let i = 1; i <= 6; i++) {
	const name = phaseNames[i]!;
	const sys = makeSystem(i as LoopPhase, name);
	systems.push({ phase: i as LoopPhase, name, sys });
	scheduler.registerSystem(i as LoopPhase, sys);
}

let paused = false, sel = 0;

function render(): void {
	stdout.write('\x1b[H\x1b[2J');
	stdout.write('\x1b[1;3H\x1b[1;36mScheduler Demo\x1b[0m');
	stdout.write(`\x1b[2;3H\x1b[90mFrame: ${frameCount} | Total: ${totalDt.toFixed(2)}s | ${paused ? 'PAUSED' : 'RUNNING'}\x1b[0m`);
	// Phase pipeline
	stdout.write('\x1b[4;3H\x1b[90mPhase pipeline (fixed order):\x1b[0m');
	stdout.write(`\x1b[5;3H\x1b[${phaseColors[0]}m${phaseNames[0]} (protected)\x1b[0m`);
	for (let i = 0; i < systems.length; i++) {
		const s = systems[i]!;
		const pi = s.phase;
		const marker = i === sel ? '\x1b[33m> ' : '  ';
		const en = enabled[i]! ? `\x1b[${phaseColors[pi]}m` : '\x1b[90m';
		const tag = enabled[i]! ? '' : ' [OFF]';
		stdout.write(`\x1b[${6 + i};3H${marker}${en}${s.name}${tag}\x1b[0m`);
	}
	// Execution log
	stdout.write('\x1b[13;3H\x1b[90mExecution log:\x1b[0m');
	for (let i = 0; i < log.length; i++) stdout.write(`\x1b[${14 + i};5H\x1b[90m${log[i]}\x1b[0m`);
	stdout.write(`\x1b[${Math.min(height - 1, 28)};1H\x1b[33m[Up/Down] Select  [Space] Toggle  [p] Pause  [s] Step  [q] Quit\x1b[0m`);
}

function step(): void {
	frameCount++;
	const dt = 1 / 60;
	totalDt += dt;
	scheduler.run(world, dt);
}

render();
const timer = setInterval(() => { if (!paused) { step(); render(); } }, 500);
process.stdin.setRawMode?.(true);
process.stdin.resume();
process.stdin.on('data', (data: Buffer) => {
	const key = data.toString();
	if (key === 'q' || key === 'Q' || key === '\x03') { clearInterval(timer); stdout.write('\x1b[?25h\x1b[?1049l'); process.exit(0); }
	if (key === '\x1b[A' || key === 'k') sel = (sel - 1 + systems.length) % systems.length;
	if (key === '\x1b[B' || key === 'j') sel = (sel + 1) % systems.length;
	if (key === ' ') {
		enabled[sel] = !enabled[sel];
		if (enabled[sel]) scheduler.registerSystem(systems[sel]!.phase, systems[sel]!.sys);
		else scheduler.unregisterSystem(systems[sel]!.sys);
	}
	if (key === 'p') paused = !paused;
	if (key === 's') { step(); render(); }
	render();
});

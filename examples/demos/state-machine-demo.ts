/**
 * State Machine Demo
 *
 * Demonstrates entity state transitions with visual state diagram.
 * Arrow keys to navigate transitions, Enter to transition, r to reset, q to exit.
 *
 * Run: npx tsx examples/demos/state-machine-demo.ts
 * @module demos/state-machine
 */
import {
	createWorld, addEntity, attachStateMachine, getState, getPreviousState,
	sendEvent,
} from 'blecsd';
import type { World, Entity } from 'blecsd';
import { setupTerminal, shutdownTerminal, setupSignalHandlers, clearScreen, formatHelpBar, moveTo, getTerminalSize, formatTitle, isQuitKey, parseArrowKey, startLoop } from './demo-utils';

const world = createWorld() as World;

type States = 'idle' | 'walking' | 'running' | 'jumping' | 'falling' | 'crouching';
type Events = 'walk' | 'run' | 'jump' | 'land' | 'crouch' | 'stop' | 'slow';

const STATE_COLORS: Record<string, number> = { idle: 37, walking: 32, running: 33, jumping: 36, falling: 31, crouching: 35 };

// Valid transitions per state (event → target state)
const TRANSITIONS: Record<string, Array<{ event: Events; target: States }>> = {
	idle: [{ event: 'walk', target: 'walking' }, { event: 'jump', target: 'jumping' }, { event: 'crouch', target: 'crouching' }],
	walking: [{ event: 'stop', target: 'idle' }, { event: 'run', target: 'running' }, { event: 'jump', target: 'jumping' }],
	running: [{ event: 'slow', target: 'walking' }, { event: 'jump', target: 'jumping' }],
	jumping: [{ event: 'land', target: 'falling' }],
	falling: [{ event: 'land', target: 'idle' }],
	crouching: [{ event: 'stop', target: 'idle' }],
};

const eid = addEntity(world) as Entity;
attachStateMachine(world, eid, {
	initial: 'idle' as States,
	states: {
		idle: { on: { walk: 'walking', jump: 'jumping', crouch: 'crouching' } },
		walking: { on: { stop: 'idle', run: 'running', jump: 'jumping' } },
		running: { on: { slow: 'walking', jump: 'jumping' } },
		jumping: { on: { land: 'falling' } },
		falling: { on: { land: 'idle' } },
		crouching: { on: { stop: 'idle' } },
	},
} as const);

let selectedTransition = 0;
let history: string[] = [];
let elapsed = 0;

function getCurrentTransitions(): Array<{ event: Events; target: States }> {
	const state = getState(world, eid);
	return TRANSITIONS[state] ?? [];
}

function doTransition(event: Events): void {
	const current = getState(world, eid);
	sendEvent(world, eid, event);
	const next = getState(world, eid);
	if (next !== current) {
		history.unshift(`${current} --${event}--> ${next}`);
		if (history.length > 8) history.pop();
		selectedTransition = 0;
		elapsed = 0;
	}
}

function render(): void {
	const { height } = getTerminalSize();
	const out: string[] = [clearScreen()];
	out.push(moveTo(1, 1) + formatTitle('State Machine Demo'));
	out.push(moveTo(2, 3) + '\x1b[90mUp/Down = select  |  Enter = transition  |  r = reset  |  q = quit\x1b[0m');

	const current = getState(world, eid);
	const prev = getPreviousState(world, eid);
	const color = STATE_COLORS[current] ?? 37;

	out.push(moveTo(4, 3) + `\x1b[1mCurrent State: \x1b[${color}m${current}\x1b[0m`);
	out.push(moveTo(5, 3) + `\x1b[90mPrevious: ${prev || 'none'}  |  Time: ${elapsed.toFixed(1)}s\x1b[0m`);

	// State diagram
	out.push(moveTo(7, 3) + '\x1b[1mState Diagram\x1b[0m');
	const positions: Record<string, { x: number; y: number }> = {
		idle: { x: 20, y: 9 }, walking: { x: 8, y: 12 }, running: { x: 32, y: 12 },
		jumping: { x: 20, y: 15 }, falling: { x: 20, y: 18 }, crouching: { x: 44, y: 9 },
	};

	for (const [name, pos] of Object.entries(positions)) {
		const active = name === current;
		const c = STATE_COLORS[name] ?? 37;
		const style = active ? `\x1b[1;${c}m` : `\x1b[${c}m`;
		const box = active ? `[${name}]` : ` ${name} `;
		out.push(moveTo(pos.y, pos.x) + `${style}${box}\x1b[0m`);
	}

	// Available transitions
	const transitions = getCurrentTransitions();
	out.push(moveTo(7, 56) + '\x1b[1mTransitions\x1b[0m');
	if (transitions.length === 0) {
		out.push(moveTo(8, 56) + '\x1b[90m(none available)\x1b[0m');
	} else {
		for (let i = 0; i < transitions.length; i++) {
			const t = transitions[i]!;
			const sel = i === selectedTransition;
			const indicator = sel ? '\x1b[33m>\x1b[0m' : ' ';
			const tc = STATE_COLORS[t.target] ?? 37;
			out.push(moveTo(8 + i, 56) + `${indicator} \x1b[90m${t.event}\x1b[0m -> \x1b[${tc}m${t.target}\x1b[0m`);
		}
	}

	// History
	out.push(moveTo(14, 56) + '\x1b[1mHistory\x1b[0m');
	for (let i = 0; i < history.length; i++) {
		out.push(moveTo(15 + i, 56) + `\x1b[90m${history[i]}\x1b[0m`);
	}

	out.push(moveTo(height, 1) + formatHelpBar('[Up/Down] Select  [Enter] Transition  [r] Reset  [q] Quit'));
	process.stdout.write(out.join(''));
}

function shutdown(): void { stop(); shutdownTerminal(); process.exit(0); }
setupTerminal();
setupSignalHandlers(shutdown);

const stop = startLoop(() => { elapsed += 1 / 30; render(); }, 30);

process.stdin.on('data', (data: Buffer) => {
	if (isQuitKey(data)) { shutdown(); return; }
	const ch = data.toString();
	const transitions = getCurrentTransitions();
	const arrow = parseArrowKey(data);
	if (arrow === 'up') selectedTransition = Math.max(0, selectedTransition - 1);
	if (arrow === 'down') selectedTransition = Math.min(transitions.length - 1, selectedTransition + 1);
	if (ch === '\r' && transitions.length > 0) doTransition(transitions[selectedTransition]!.event);
	if (ch === 'r') {
		attachStateMachine(world, eid, {
			initial: 'idle' as States,
			states: {
				idle: { on: { walk: 'walking', jump: 'jumping', crouch: 'crouching' } },
				walking: { on: { stop: 'idle', run: 'running', jump: 'jumping' } },
				running: { on: { slow: 'walking', jump: 'jumping' } },
				jumping: { on: { land: 'falling' } },
				falling: { on: { land: 'idle' } },
				crouching: { on: { stop: 'idle' } },
			},
		} as const);
		selectedTransition = 0; elapsed = 0; history = [];
	}
});

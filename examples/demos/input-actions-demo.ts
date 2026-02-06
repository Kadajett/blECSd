/**
 * Input Actions Demo
 *
 * Demonstrates semantic input action bindings using InputActionManager.
 * Maps physical keys to logical actions (jump, move_left, etc.).
 * Press mapped keys to see action states, r to rebind, q or Ctrl+C to exit.
 *
 * Run: npx tsx examples/demos/input-actions-demo.ts
 * @module demos/input-actions
 */

import { InputActionManager, ActionPresets } from '../../src/core/inputActions';
import type { ActionBinding, ActionState } from '../../src/core/inputActions';

const manager = new InputActionManager();

// Register platformer preset bindings
for (const binding of ActionPresets.platformer) {
	manager.register(binding);
}

const actionLog: string[] = [];
let activeKeys = new Set<string>();
let presetName = 'platformer';

// Listen for action state changes
manager.onAny((action, state) => {
	if (state.justActivated) {
		actionLog.push(`\x1b[32m+ ${action}\x1b[0m`);
		if (actionLog.length > 10) actionLog.shift();
	} else if (state.justDeactivated) {
		actionLog.push(`\x1b[31m- ${action}\x1b[0m`);
		if (actionLog.length > 10) actionLog.shift();
	}
});

function render(): void {
	const out: string[] = ['\x1b[2J\x1b[H'];
	out.push('\x1b[1m  Input Actions Demo\x1b[0m\n');
	out.push(`  Preset: \x1b[33m${presetName}\x1b[0m  |  p = switch preset  |  q = quit\n`);
	out.push('  ──────────────────────────────────────────────────────\n\n');

	// Show registered bindings
	out.push('  \x1b[4mRegistered Actions:\x1b[0m\n');
	const bindings = manager.getBindings();
	for (const b of bindings) {
		const state = manager.getState(b.action);
		const active = state?.active ? '\x1b[1;32mACTIVE\x1b[0m' : '\x1b[2minactive\x1b[0m';
		const keys = b.keys.join(', ');
		out.push(`  ${b.action.padEnd(14)} [${keys.padEnd(16)}] ${active}\n`);
	}

	// Show action log
	out.push('\n  \x1b[4mAction Log:\x1b[0m\n');
	if (actionLog.length === 0) {
		out.push('  \x1b[2m(press action keys to see events)\x1b[0m\n');
	} else {
		for (const entry of actionLog) {
			out.push(`  ${entry}\n`);
		}
	}

	// Controls
	out.push('\n  \x1b[4mKeys:\x1b[0m\n');
	out.push('  a/left = move_left  |  d/right = move_right\n');
	out.push('  w/up/space = jump   |  s/down = crouch\n');
	out.push('  j/enter = attack\n');

	process.stdout.write(out.join(''));
}

function switchPreset(): void {
	manager.clearAll();
	if (presetName === 'platformer') {
		presetName = 'topDown';
		for (const b of ActionPresets.topDown) {
			manager.register(b);
		}
	} else {
		presetName = 'platformer';
		for (const b of ActionPresets.platformer) {
			manager.register(b);
		}
	}
}

function main(): void {
	process.stdout.write('\x1b[?1049h\x1b[?25l');
	process.stdin.setRawMode(true);
	process.stdin.resume();
	render();

	process.stdin.on('data', (data: Buffer) => {
		const ch = data.toString();
		if (ch === '\x03' || ch === 'q') { shutdown(); return; }

		if (ch === 'p') {
			switchPreset();
		} else {
			// Simulate key press/release for the action manager
			const keyName = resolveKeyName(ch);
			if (keyName) {
				if (!activeKeys.has(keyName)) {
					activeKeys.add(keyName);
					// Simulate activation by checking bindings
					const bindings = manager.getBindings();
					for (const b of bindings) {
						if (b.keys.includes(keyName)) {
							manager.activateAction(b.action);
						}
					}
					// Auto-deactivate after a short delay
					setTimeout(() => {
						activeKeys.delete(keyName);
						const bs = manager.getBindings();
						for (const b of bs) {
							if (b.keys.includes(keyName)) {
								manager.deactivateAction(b.action);
							}
						}
						render();
					}, 200);
				}
			}
		}
		render();
	});
}

function resolveKeyName(ch: string): string | null {
	if (ch === '\x1b[A') return 'up';
	if (ch === '\x1b[B') return 'down';
	if (ch === '\x1b[C') return 'right';
	if (ch === '\x1b[D') return 'left';
	if (ch === ' ') return 'space';
	if (ch === '\r') return 'enter';
	if (ch.length === 1 && ch >= 'a' && ch <= 'z') return ch;
	return null;
}

function shutdown(): void {
	process.stdin.setRawMode(false);
	process.stdout.write('\x1b[?25h\x1b[?1049l');
	process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
main();

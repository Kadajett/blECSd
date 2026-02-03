/**
 * Keyboard input state management for the Doom game loop.
 *
 * Sets up raw stdin and tracks which keys are currently held down
 * per-frame using the blecsd key parser.
 *
 * @module game/input
 */

import { parseKeyBuffer, type KeyEvent, type KeyName } from 'blecsd';

/** Set of currently pressed key names. */
export interface InputState {
	readonly keys: Set<KeyName>;
	readonly ctrl: boolean;
	readonly shift: boolean;
}

/** Mutable state for input tracking between frames. */
interface InputTracker {
	keys: Set<KeyName>;
	ctrl: boolean;
	shift: boolean;
	buffer: Buffer | null;
}

const tracker: InputTracker = {
	keys: new Set(),
	ctrl: false,
	shift: false,
	buffer: null,
};

/**
 * Set up raw stdin for keyboard input.
 * Must be called once at startup.
 *
 * @example
 * ```typescript
 * setupInput();
 * // In frame loop:
 * const input = pollInput();
 * if (input.keys.has('w')) { // move forward }
 * ```
 */
export function setupInput(): void {
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(true);
	}
	process.stdin.resume();
	process.stdin.setEncoding('utf8');

	process.stdin.on('data', (data: Buffer | string) => {
		const buf = typeof data === 'string' ? Buffer.from(data) : data;
		tracker.buffer = buf;

		const events = parseKeyBuffer(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));

		// Update held keys
		for (const event of events) {
			tracker.keys.add(event.name);
			if (event.ctrl) tracker.ctrl = true;
			if (event.shift) tracker.shift = true;
		}
	});
}

/**
 * Poll current input state and clear the per-frame buffer.
 * Call once per frame before processing input.
 *
 * @returns Current input state (keys pressed this frame)
 */
export function pollInput(): InputState {
	const state: InputState = {
		keys: new Set(tracker.keys),
		ctrl: tracker.ctrl,
		shift: tracker.shift,
	};

	// Clear for next frame
	tracker.keys.clear();
	tracker.ctrl = false;
	tracker.shift = false;
	tracker.buffer = null;

	return state;
}

/**
 * Clean up input (restore terminal state).
 */
export function cleanupInput(): void {
	if (process.stdin.isTTY) {
		process.stdin.setRawMode(false);
	}
	process.stdin.pause();
}

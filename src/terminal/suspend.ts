/**
 * Terminal Suspend/Resume Handling
 *
 * Provides SIGTSTP (Ctrl+Z) suspend and SIGCONT resume handling
 * for terminal applications.
 *
 * @module terminal/suspend
 * @internal
 */

import type { Writable } from 'node:stream';
import { cursor, mouse, screen } from './ansi';

/**
 * State saved before suspending.
 */
export interface SuspendState {
	/** Whether the terminal was in alternate buffer mode */
	wasAlternateBuffer: boolean;
	/** Whether mouse tracking was enabled */
	wasMouseEnabled: boolean;
	/** Whether raw mode was enabled */
	wasRawMode: boolean;
	/** Custom state data from onSuspend callback */
	customState?: unknown;
}

/**
 * Options for creating a SuspendManager.
 */
export interface SuspendManagerOptions {
	/**
	 * The output stream to write escape sequences to.
	 * @default process.stdout
	 */
	output?: Writable;

	/**
	 * The input stream for raw mode control.
	 * @default process.stdin
	 */
	input?: NodeJS.ReadStream;

	/**
	 * Called before suspending. Return custom state to preserve.
	 */
	onSuspend?: () => unknown;

	/**
	 * Called after resuming with the preserved state.
	 */
	onResume?: (state: SuspendState) => void;

	/**
	 * Whether the terminal is currently in alternate buffer mode.
	 * The manager will track this after initial setup.
	 * @default false
	 */
	isAlternateBuffer?: boolean;

	/**
	 * Whether mouse tracking is currently enabled.
	 * The manager will track this after initial setup.
	 * @default false
	 */
	isMouseEnabled?: boolean;
}

/**
 * SuspendManager interface for type-safe access.
 */
export interface SuspendManager {
	readonly enabled: boolean;
	isAlternateBuffer: boolean;
	isMouseEnabled: boolean;
	enable(): void;
	disable(): void;
	suspend(callback?: () => void): void;
	setAlternateBuffer(inAlternateBuffer: boolean): void;
	setMouseEnabled(mouseEnabled: boolean): void;
}

/**
 * Create a suspend manager for terminal suspend (SIGTSTP) and resume (SIGCONT) handling.
 *
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * import { createSuspendManager } from 'blecsd/terminal';
 *
 * const suspendManager = createSuspendManager({
 *   isAlternateBuffer: true,
 *   isMouseEnabled: true,
 *   onSuspend: () => {
 *     return { cursorPosition: { x: 10, y: 5 } };
 *   },
 *   onResume: (state) => {
 *     screen.render();
 *   },
 * });
 *
 * suspendManager.enable();
 * suspendManager.suspend();
 * suspendManager.disable();
 * ```
 */
export function createSuspendManager(options: SuspendManagerOptions = {}): SuspendManager {
	const output = options.output ?? process.stdout;
	const input = (options.input ?? process.stdin) as NodeJS.ReadStream;
	const onSuspendCallback = options.onSuspend;
	const onResumeCallback = options.onResume;
	let sigtstpHandler: (() => void) | null = null;
	let sigcontHandler: (() => void) | null = null;
	let enabled = false;

	function writeToOutput(data: string): void {
		output.write(data);
	}

	function prepareForSuspend(): SuspendState {
		const customState = onSuspendCallback?.();

		const state: SuspendState = {
			wasAlternateBuffer: mgr.isAlternateBuffer,
			wasMouseEnabled: mgr.isMouseEnabled,
			wasRawMode: input.isRaw ?? false,
			customState,
		};

		if (mgr.isAlternateBuffer) {
			writeToOutput(screen.alternateOff());
		}
		writeToOutput(cursor.show());
		if (mgr.isMouseEnabled) {
			writeToOutput(mouse.disableAll());
		}
		if (input.setRawMode && state.wasRawMode) {
			input.setRawMode(false);
		}
		input.pause();

		return state;
	}

	function handleResume(state: SuspendState): void {
		input.resume();
		if (input.setRawMode && state.wasRawMode) {
			input.setRawMode(true);
		}
		if (state.wasAlternateBuffer) {
			writeToOutput(screen.alternateOn());
		}
		if (state.wasMouseEnabled) {
			writeToOutput(mouse.enableNormal());
		}
		onResumeCallback?.(state);
	}

	const mgr: SuspendManager = {
		get enabled(): boolean {
			return enabled;
		},
		isAlternateBuffer: options.isAlternateBuffer ?? false,
		isMouseEnabled: options.isMouseEnabled ?? false,
		enable(): void {
			if (enabled) {
				return;
			}
			sigtstpHandler = () => {
				mgr.suspend();
			};
			process.on('SIGTSTP', sigtstpHandler);
			enabled = true;
		},
		disable(): void {
			if (!enabled) {
				return;
			}
			if (sigtstpHandler) {
				process.removeListener('SIGTSTP', sigtstpHandler);
				sigtstpHandler = null;
			}
			if (sigcontHandler) {
				process.removeListener('SIGCONT', sigcontHandler);
				sigcontHandler = null;
			}
			enabled = false;
		},
		suspend(callback?: () => void): void {
			const state = prepareForSuspend();
			sigcontHandler = () => {
				handleResume(state);
				if (callback) {
					callback();
				}
			};
			process.once('SIGCONT', sigcontHandler);
			process.kill(process.pid, 'SIGTSTP');
		},
		setAlternateBuffer(inAlternateBuffer: boolean): void {
			mgr.isAlternateBuffer = inAlternateBuffer;
		},
		setMouseEnabled(mouseEnabled: boolean): void {
			mgr.isMouseEnabled = mouseEnabled;
		},
	};

	return mgr;
}

/**
 * Create escape sequences for the suspend operation.
 *
 * This namespace provides the raw escape sequences used during
 * suspend/resume, for cases where you need more control than
 * SuspendManager provides.
 *
 * @example
 * ```typescript
 * import { suspendSequences } from 'blecsd/terminal';
 *
 * // Get all sequences to prepare for suspend
 * const seq = suspendSequences.prepareForSuspend(true, true);
 * process.stdout.write(seq);
 * ```
 */
export const suspendSequences = {
	/**
	 * Get escape sequences to prepare terminal for suspend.
	 *
	 * @param isAlternateBuffer - Whether currently in alternate buffer
	 * @param isMouseEnabled - Whether mouse tracking is enabled
	 * @returns Combined escape sequence string
	 */
	prepareForSuspend(isAlternateBuffer: boolean, isMouseEnabled: boolean): string {
		let seq = '';

		if (isAlternateBuffer) {
			seq += screen.alternateOff();
		}

		seq += cursor.show();

		if (isMouseEnabled) {
			seq += mouse.disableAll();
		}

		return seq;
	},

	/**
	 * Get escape sequences to restore terminal after resume.
	 *
	 * @param wasAlternateBuffer - Whether was in alternate buffer
	 * @param wasMouseEnabled - Whether mouse tracking was enabled
	 * @returns Combined escape sequence string
	 */
	restoreAfterResume(wasAlternateBuffer: boolean, wasMouseEnabled: boolean): string {
		let seq = '';

		if (wasAlternateBuffer) {
			seq += screen.alternateOn();
		}

		if (wasMouseEnabled) {
			seq += mouse.enableNormal();
		}

		return seq;
	},
} as const;

/**
 * Simple one-shot suspend function.
 *
 * For simple cases where you just need to suspend and resume
 * without a full SuspendManager.
 *
 * @param options - Suspend options
 * @returns Promise that resolves when resumed
 *
 * @example
 * ```typescript
 * import { suspend } from 'blecsd/terminal';
 *
 * // Simple suspend
 * await suspend({
 *   isAlternateBuffer: true,
 *   isMouseEnabled: false,
 * });
 * console.log('Resumed!');
 * ```
 */
export function suspend(options: {
	output?: Writable;
	input?: NodeJS.ReadStream;
	isAlternateBuffer?: boolean;
	isMouseEnabled?: boolean;
}): Promise<void> {
	return new Promise((resolve) => {
		const output = options.output ?? process.stdout;
		const input = (options.input ?? process.stdin) as NodeJS.ReadStream;
		const isAlt = options.isAlternateBuffer ?? false;
		const isMouse = options.isMouseEnabled ?? false;

		// Save raw mode state
		const wasRawMode = input.isRaw ?? false;

		// Prepare for suspend
		output.write(suspendSequences.prepareForSuspend(isAlt, isMouse));

		// Exit raw mode
		if (input.setRawMode && wasRawMode) {
			input.setRawMode(false);
		}
		input.pause();

		// Handle resume
		const onCont = (): void => {
			// Resume input
			input.resume();
			if (input.setRawMode && wasRawMode) {
				input.setRawMode(true);
			}

			// Restore terminal
			output.write(suspendSequences.restoreAfterResume(isAlt, isMouse));

			resolve();
		};

		process.once('SIGCONT', onCont);

		// Actually suspend
		process.kill(process.pid, 'SIGTSTP');
	});
}

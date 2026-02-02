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
 * Manages terminal suspend (SIGTSTP) and resume (SIGCONT) handling.
 *
 * When the user presses Ctrl+Z, the terminal application should:
 * 1. Save the current terminal state
 * 2. Exit alternate screen buffer
 * 3. Show the cursor
 * 4. Disable mouse tracking
 * 5. Exit raw mode
 * 6. Actually suspend the process
 *
 * When the process resumes (fg command), it should:
 * 1. Re-enter raw mode
 * 2. Re-enter alternate screen buffer (if was in it)
 * 3. Re-enable mouse tracking (if was enabled)
 * 4. Restore the cursor
 * 5. Re-render the screen
 *
 * @example
 * ```typescript
 * import { SuspendManager } from 'blecsd/terminal';
 *
 * const suspendManager = new SuspendManager({
 *   isAlternateBuffer: true,
 *   isMouseEnabled: true,
 *   onSuspend: () => {
 *     // Save any custom application state
 *     return { cursorPosition: { x: 10, y: 5 } };
 *   },
 *   onResume: (state) => {
 *     // Restore application state and re-render
 *     screen.render();
 *   },
 * });
 *
 * // Enable suspend handling
 * suspendManager.enable();
 *
 * // Later, to manually trigger suspend (e.g., from a key binding)
 * suspendManager.suspend();
 *
 * // When done, disable the handler
 * suspendManager.disable();
 * ```
 */
export class SuspendManager {
	private output: Writable;
	private input: NodeJS.ReadStream;
	private onSuspendCallback?: (() => unknown) | undefined;
	private onResumeCallback?: ((state: SuspendState) => void) | undefined;
	private sigtstpHandler: (() => void) | null = null;
	private sigcontHandler: (() => void) | null = null;
	private _enabled = false;

	/** Whether the terminal is in alternate buffer mode */
	isAlternateBuffer: boolean;

	/** Whether mouse tracking is enabled */
	isMouseEnabled: boolean;

	/**
	 * Create a new SuspendManager.
	 *
	 * @param options - Configuration options
	 */
	constructor(options: SuspendManagerOptions = {}) {
		this.output = options.output ?? process.stdout;
		this.input = (options.input ?? process.stdin) as NodeJS.ReadStream;
		this.onSuspendCallback = options.onSuspend;
		this.onResumeCallback = options.onResume;
		this.isAlternateBuffer = options.isAlternateBuffer ?? false;
		this.isMouseEnabled = options.isMouseEnabled ?? false;
	}

	/**
	 * Check if suspend handling is currently enabled.
	 */
	get enabled(): boolean {
		return this._enabled;
	}

	/**
	 * Enable SIGTSTP and SIGCONT signal handlers.
	 *
	 * Once enabled, pressing Ctrl+Z will trigger the suspend flow.
	 *
	 * @example
	 * ```typescript
	 * const manager = new SuspendManager();
	 * manager.enable();
	 * // Now Ctrl+Z will properly suspend the application
	 * ```
	 */
	enable(): void {
		if (this._enabled) {
			return;
		}

		this.sigtstpHandler = () => {
			this.suspend();
		};

		process.on('SIGTSTP', this.sigtstpHandler);
		this._enabled = true;
	}

	/**
	 * Disable SIGTSTP and SIGCONT signal handlers.
	 *
	 * @example
	 * ```typescript
	 * manager.disable();
	 * // Ctrl+Z will no longer trigger suspend
	 * ```
	 */
	disable(): void {
		if (!this._enabled) {
			return;
		}

		if (this.sigtstpHandler) {
			process.removeListener('SIGTSTP', this.sigtstpHandler);
			this.sigtstpHandler = null;
		}

		if (this.sigcontHandler) {
			process.removeListener('SIGCONT', this.sigcontHandler);
			this.sigcontHandler = null;
		}

		this._enabled = false;
	}

	/**
	 * Manually trigger a suspend.
	 *
	 * This performs the suspend flow and sends SIGTSTP to the process.
	 * Useful for implementing a custom "suspend" key binding.
	 *
	 * @param callback - Optional callback called after resume
	 *
	 * @example
	 * ```typescript
	 * // In a key handler
	 * if (key === 'ctrl+z') {
	 *   manager.suspend(() => {
	 *     console.log('Resumed from suspend');
	 *   });
	 * }
	 * ```
	 */
	suspend(callback?: () => void): void {
		// Prepare for suspend
		const state = this.prepareForSuspend();

		// Register SIGCONT handler for resume
		this.sigcontHandler = () => {
			this.handleResume(state);
			if (callback) {
				callback();
			}
		};

		process.once('SIGCONT', this.sigcontHandler);

		// Actually suspend the process
		process.kill(process.pid, 'SIGTSTP');
	}

	/**
	 * Prepare the terminal for suspend.
	 *
	 * This saves the terminal state and restores it to a "normal" state
	 * suitable for the shell.
	 *
	 * @returns The saved state
	 */
	private prepareForSuspend(): SuspendState {
		// Get custom state from callback
		const customState = this.onSuspendCallback?.();

		// Save current state
		const state: SuspendState = {
			wasAlternateBuffer: this.isAlternateBuffer,
			wasMouseEnabled: this.isMouseEnabled,
			wasRawMode: this.input.isRaw ?? false,
			customState,
		};

		// Exit alternate buffer if in it
		if (this.isAlternateBuffer) {
			this.write(screen.alternateOff());
		}

		// Show cursor
		this.write(cursor.show());

		// Disable mouse tracking
		if (this.isMouseEnabled) {
			this.write(mouse.disableAll());
		}

		// Exit raw mode
		if (this.input.setRawMode && state.wasRawMode) {
			this.input.setRawMode(false);
		}

		// Pause input
		this.input.pause();

		return state;
	}

	/**
	 * Handle resume after SIGCONT.
	 *
	 * @param state - The saved state from before suspend
	 */
	private handleResume(state: SuspendState): void {
		// Resume input
		this.input.resume();

		// Re-enable raw mode
		if (this.input.setRawMode && state.wasRawMode) {
			this.input.setRawMode(true);
		}

		// Re-enter alternate buffer
		if (state.wasAlternateBuffer) {
			this.write(screen.alternateOn());
		}

		// Re-enable mouse tracking
		if (state.wasMouseEnabled) {
			this.write(mouse.enableNormal());
		}

		// Call the resume callback
		this.onResumeCallback?.(state);
	}

	/**
	 * Write to the output stream.
	 */
	private write(data: string): void {
		this.output.write(data);
	}

	/**
	 * Update the alternate buffer state.
	 *
	 * Call this when entering or exiting the alternate buffer
	 * so the manager knows the current state.
	 *
	 * @param inAlternateBuffer - Whether now in alternate buffer
	 *
	 * @example
	 * ```typescript
	 * process.stdout.write(screen.alternateBuffer.enter());
	 * manager.setAlternateBuffer(true);
	 * ```
	 */
	setAlternateBuffer(inAlternateBuffer: boolean): void {
		this.isAlternateBuffer = inAlternateBuffer;
	}

	/**
	 * Update the mouse tracking state.
	 *
	 * Call this when enabling or disabling mouse tracking
	 * so the manager knows the current state.
	 *
	 * @param mouseEnabled - Whether mouse tracking is enabled
	 *
	 * @example
	 * ```typescript
	 * process.stdout.write(mouse.enable());
	 * manager.setMouseEnabled(true);
	 * ```
	 */
	setMouseEnabled(mouseEnabled: boolean): void {
		this.isMouseEnabled = mouseEnabled;
	}
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

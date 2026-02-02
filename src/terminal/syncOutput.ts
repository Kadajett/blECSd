/**
 * Synchronized Output Mode
 *
 * Prevents screen tearing and flicker during rapid game updates.
 * Essential for smooth 60fps rendering.
 *
 * @module terminal/syncOutput
 * @internal This module is internal and not exported from the main package.
 */

import type { Writable } from 'node:stream';
import { sync } from './ansi';

/**
 * Options for SynchronizedOutput
 */
export interface SyncOutputOptions {
	/**
	 * Whether synchronized output is supported by the terminal.
	 * If false, sync markers are omitted (no-op mode).
	 * Default: true (assume supported)
	 */
	supported?: boolean;

	/**
	 * Whether to automatically wrap writes in sync markers.
	 * Default: false
	 */
	autoSync?: boolean;
}

/**
 * SynchronizedOutput manages synchronized output mode for flicker-free rendering.
 *
 * In synchronized mode, the terminal buffers all output until the end marker
 * is received, then displays the entire frame at once. This prevents partial
 * frames from being displayed, eliminating tearing and flicker.
 *
 * @example
 * ```typescript
 * const syncOut = new SynchronizedOutput(process.stdout);
 *
 * // Manual frame rendering
 * syncOut.beginFrame();
 * // ... write frame content ...
 * syncOut.endFrame();
 *
 * // Or render a complete frame
 * syncOut.renderFrame(() => {
 *   process.stdout.write(clearScreen);
 *   process.stdout.write(renderGameState());
 * });
 * ```
 */
export class SynchronizedOutput {
	private output: Writable;
	private _supported: boolean;
	private _autoSync: boolean;
	private _inFrame = false;

	/**
	 * Create a new SynchronizedOutput instance.
	 *
	 * @param output - Output stream to write to
	 * @param options - Configuration options
	 */
	constructor(output: Writable, options: SyncOutputOptions = {}) {
		this.output = output;
		this._supported = options.supported ?? true;
		this._autoSync = options.autoSync ?? false;
	}

	/**
	 * Whether synchronized output is supported.
	 */
	get supported(): boolean {
		return this._supported;
	}

	/**
	 * Set whether synchronized output is supported.
	 * Use this after capability detection.
	 */
	set supported(value: boolean) {
		this._supported = value;
	}

	/**
	 * Whether auto-sync is enabled.
	 */
	get autoSync(): boolean {
		return this._autoSync;
	}

	/**
	 * Set auto-sync mode.
	 */
	set autoSync(value: boolean) {
		this._autoSync = value;
	}

	/**
	 * Whether currently in a synchronized frame.
	 */
	get inFrame(): boolean {
		return this._inFrame;
	}

	/**
	 * Begin a synchronized frame.
	 * All output will be buffered until endFrame() is called.
	 *
	 * @example
	 * ```typescript
	 * syncOut.beginFrame();
	 * // ... render frame ...
	 * syncOut.endFrame();
	 * ```
	 */
	beginFrame(): void {
		if (!this._supported || this._inFrame) {
			return;
		}

		this.output.write(sync.begin());
		this._inFrame = true;
	}

	/**
	 * End a synchronized frame.
	 * Buffered output is flushed to the screen.
	 *
	 * @example
	 * ```typescript
	 * syncOut.endFrame();
	 * ```
	 */
	endFrame(): void {
		if (!this._supported || !this._inFrame) {
			return;
		}

		this.output.write(sync.end());
		this._inFrame = false;
	}

	/**
	 * Execute a render function within a synchronized frame.
	 * Automatically begins and ends the frame.
	 *
	 * @param renderFn - Function that performs rendering
	 *
	 * @example
	 * ```typescript
	 * syncOut.renderFrame(() => {
	 *   process.stdout.write(screen.clear());
	 *   process.stdout.write(renderGameState());
	 * });
	 * ```
	 */
	renderFrame(renderFn: () => void): void {
		this.beginFrame();
		try {
			renderFn();
		} finally {
			this.endFrame();
		}
	}

	/**
	 * Execute an async render function within a synchronized frame.
	 *
	 * @param renderFn - Async function that performs rendering
	 *
	 * @example
	 * ```typescript
	 * await syncOut.renderFrameAsync(async () => {
	 *   await drawComplexScene();
	 * });
	 * ```
	 */
	async renderFrameAsync(renderFn: () => Promise<void>): Promise<void> {
		this.beginFrame();
		try {
			await renderFn();
		} finally {
			this.endFrame();
		}
	}

	/**
	 * Write content wrapped in sync markers.
	 * Convenience method for single-write frames.
	 *
	 * @param content - Content to write
	 *
	 * @example
	 * ```typescript
	 * syncOut.writeFrame(frameContent);
	 * ```
	 */
	writeFrame(content: string): void {
		if (!this._supported) {
			this.output.write(content);
			return;
		}

		this.output.write(sync.wrap(content));
	}

	/**
	 * Write content, optionally wrapping in sync markers if autoSync is enabled.
	 *
	 * @param content - Content to write
	 */
	write(content: string): void {
		if (this._autoSync && this._supported && !this._inFrame) {
			this.writeFrame(content);
		} else {
			this.output.write(content);
		}
	}

	/**
	 * Get the begin sync marker (or empty string if not supported).
	 *
	 * @returns Sync begin marker
	 */
	getBeginMarker(): string {
		return this._supported ? sync.begin() : '';
	}

	/**
	 * Get the end sync marker (or empty string if not supported).
	 *
	 * @returns Sync end marker
	 */
	getEndMarker(): string {
		return this._supported ? sync.end() : '';
	}
}

/**
 * Check if running in kitty terminal.
 */
function isKitty(): boolean {
	const term = process.env['TERM'] ?? '';
	return term === 'xterm-kitty' || process.env['KITTY_WINDOW_ID'] !== undefined;
}

/**
 * Check if running in foot terminal.
 */
function isFoot(): boolean {
	const term = process.env['TERM'] ?? '';
	return term === 'foot' || term === 'foot-extra';
}

/**
 * Check if running in contour terminal.
 */
function isContour(): boolean {
	return process.env['TERMINAL_VERSION_STRING']?.includes('contour') ?? false;
}

/**
 * Check if running in WezTerm.
 */
function isWezTerm(): boolean {
	return process.env['TERM_PROGRAM'] === 'WezTerm';
}

/**
 * Check if running in iTerm2 3.5+.
 */
function isITerm2WithSync(): boolean {
	if (process.env['TERM_PROGRAM'] !== 'iTerm.app') {
		return false;
	}

	const version = process.env['TERM_PROGRAM_VERSION'];
	if (!version) {
		return false;
	}

	const major = Number.parseInt(version.split('.')[0] ?? '0', 10);
	const minor = Number.parseInt(version.split('.')[1] ?? '0', 10);
	return major > 3 || (major === 3 && minor >= 5);
}

/**
 * Check if running in mintty.
 */
function isMintty(): boolean {
	return process.env['TERM_PROGRAM'] === 'mintty';
}

/**
 * Detect if synchronized output is likely supported.
 *
 * Checks for known terminals that support DEC 2026:
 * - kitty
 * - foot
 * - contour
 * - WezTerm
 * - iTerm2 (3.5+)
 * - mintty (3.6+)
 *
 * Note: This is a heuristic. For accurate detection,
 * use terminal capability queries (DA2/DA3).
 *
 * @returns true if sync output is likely supported
 */
export function isSyncOutputSupported(): boolean {
	if (isKitty()) return true;
	if (isFoot()) return true;
	if (isContour()) return true;
	if (isWezTerm()) return true;
	if (isITerm2WithSync()) return true;
	if (isMintty()) return true;

	// Default: assume not supported (safe fallback)
	return false;
}

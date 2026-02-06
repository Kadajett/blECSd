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
 * SynchronizedOutput interface for type-safe access.
 */
export interface SynchronizedOutput {
	supported: boolean;
	autoSync: boolean;
	readonly inFrame: boolean;
	beginFrame(): void;
	endFrame(): void;
	renderFrame(renderFn: () => void): void;
	renderFrameAsync(renderFn: () => Promise<void>): Promise<void>;
	writeFrame(content: string): void;
	write(content: string): void;
	getBeginMarker(): string;
	getEndMarker(): string;
}

/**
 * Create a new SynchronizedOutput instance for flicker-free rendering.
 *
 * In synchronized mode, the terminal buffers all output until the end marker
 * is received, then displays the entire frame at once.
 *
 * @param output - Output stream to write to
 * @param options - Configuration options
 *
 * @example
 * ```typescript
 * const syncOut = createSynchronizedOutput(process.stdout);
 *
 * syncOut.beginFrame();
 * // ... write frame content ...
 * syncOut.endFrame();
 *
 * syncOut.renderFrame(() => {
 *   process.stdout.write(clearScreen);
 *   process.stdout.write(renderGameState());
 * });
 * ```
 */
export function createSynchronizedOutput(
	output: Writable,
	options: SyncOutputOptions = {},
): SynchronizedOutput {
	let supported = options.supported ?? true;
	let autoSyncEnabled = options.autoSync ?? false;
	let inFrame = false;

	const syncOut: SynchronizedOutput = {
		get supported(): boolean {
			return supported;
		},
		set supported(value: boolean) {
			supported = value;
		},
		get autoSync(): boolean {
			return autoSyncEnabled;
		},
		set autoSync(value: boolean) {
			autoSyncEnabled = value;
		},
		get inFrame(): boolean {
			return inFrame;
		},
		beginFrame(): void {
			if (!supported || inFrame) {
				return;
			}
			output.write(sync.begin());
			inFrame = true;
		},
		endFrame(): void {
			if (!supported || !inFrame) {
				return;
			}
			output.write(sync.end());
			inFrame = false;
		},
		renderFrame(renderFn: () => void): void {
			syncOut.beginFrame();
			try {
				renderFn();
			} finally {
				syncOut.endFrame();
			}
		},
		async renderFrameAsync(renderFn: () => Promise<void>): Promise<void> {
			syncOut.beginFrame();
			try {
				await renderFn();
			} finally {
				syncOut.endFrame();
			}
		},
		writeFrame(content: string): void {
			if (!supported) {
				output.write(content);
				return;
			}
			output.write(sync.wrap(content));
		},
		write(content: string): void {
			if (autoSyncEnabled && supported && !inFrame) {
				syncOut.writeFrame(content);
			} else {
				output.write(content);
			}
		},
		getBeginMarker(): string {
			return supported ? sync.begin() : '';
		},
		getEndMarker(): string {
			return supported ? sync.end() : '';
		},
	};

	return syncOut;
}

/**
 * Check if running in kitty terminal.
 */
function isKitty(): boolean {
	const term = process.env.TERM ?? '';
	return term === 'xterm-kitty' || process.env.KITTY_WINDOW_ID !== undefined;
}

/**
 * Check if running in foot terminal.
 */
function isFoot(): boolean {
	const term = process.env.TERM ?? '';
	return term === 'foot' || term === 'foot-extra';
}

/**
 * Check if running in contour terminal.
 */
function isContour(): boolean {
	return process.env.TERMINAL_VERSION_STRING?.includes('contour') ?? false;
}

/**
 * Check if running in WezTerm.
 */
function isWezTerm(): boolean {
	return process.env.TERM_PROGRAM === 'WezTerm';
}

/**
 * Check if running in iTerm2 3.5+.
 */
function isITerm2WithSync(): boolean {
	if (process.env.TERM_PROGRAM !== 'iTerm.app') {
		return false;
	}

	const version = process.env.TERM_PROGRAM_VERSION;
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
	return process.env.TERM_PROGRAM === 'mintty';
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

/**
 * Screen Buffer Management
 *
 * Manages alternate screen buffer state and ensures proper cleanup on exit.
 *
 * @module terminal/screenBuffer
 * @internal This module is internal and not exported from the main package.
 */

import type { Writable } from 'node:stream';
import { screen } from './ansi';

/**
 * Callback for cleanup operations
 */
export type CleanupCallback = () => void;

/**
 * ScreenBuffer manages alternate screen buffer state and cleanup.
 *
 * Ensures the terminal is properly restored when:
 * - The program exits normally
 * - The program receives SIGINT (Ctrl+C)
 * - An uncaught exception occurs
 *
 * @example
 * ```typescript
 * const buffer = new ScreenBuffer(process.stdout);
 * buffer.enterAlternateScreen();
 * // ... do work ...
 * buffer.exitAlternateScreen();
 * ```
 */
export class ScreenBuffer {
	private output: Writable;
	private _isAlternate = false;
	private cleanupHandlers: Set<CleanupCallback> = new Set();
	private boundCleanup: () => void;
	private signalHandlersInstalled = false;

	/**
	 * Create a new ScreenBuffer.
	 *
	 * @param output - Writable stream for terminal output (usually process.stdout)
	 */
	constructor(output: Writable) {
		this.output = output;
		this.boundCleanup = this.cleanup.bind(this);
	}

	/**
	 * Whether currently in alternate screen buffer.
	 */
	get isAlternate(): boolean {
		return this._isAlternate;
	}

	/**
	 * Enter alternate screen buffer.
	 * Installs cleanup handlers to ensure restoration on exit.
	 *
	 * @example
	 * ```typescript
	 * buffer.enterAlternateScreen();
	 * // Screen content is saved, now using alternate buffer
	 * ```
	 */
	enterAlternateScreen(): void {
		if (this._isAlternate) {
			return;
		}

		this.write(screen.enterAlt());
		this._isAlternate = true;
		this.installSignalHandlers();
	}

	/**
	 * Exit alternate screen buffer.
	 * Restores the original screen content.
	 *
	 * @example
	 * ```typescript
	 * buffer.exitAlternateScreen();
	 * // Original screen content is restored
	 * ```
	 */
	exitAlternateScreen(): void {
		if (!this._isAlternate) {
			return;
		}

		this.write(screen.exitAlt());
		this._isAlternate = false;
	}

	/**
	 * Register a cleanup callback to run when exiting alternate screen.
	 * Useful for restoring cursor visibility, colors, etc.
	 *
	 * @param callback - Cleanup function to call
	 * @returns Unsubscribe function
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = buffer.onCleanup(() => {
	 *   console.log('Cleaning up...');
	 * });
	 * ```
	 */
	onCleanup(callback: CleanupCallback): () => void {
		this.cleanupHandlers.add(callback);
		return () => {
			this.cleanupHandlers.delete(callback);
		};
	}

	/**
	 * Perform cleanup and exit alternate screen.
	 * Called automatically on signals and process exit.
	 */
	cleanup(): void {
		// Run registered cleanup handlers
		for (const handler of this.cleanupHandlers) {
			try {
				handler();
			} catch {
				// Ignore errors during cleanup
			}
		}

		// Exit alternate screen if active
		if (this._isAlternate) {
			this.exitAlternateScreen();
		}
	}

	/**
	 * Destroy the screen buffer and remove signal handlers.
	 * Call this when done with the buffer.
	 */
	destroy(): void {
		this.cleanup();
		this.removeSignalHandlers();
		this.cleanupHandlers.clear();
	}

	/**
	 * Write data to the output stream.
	 */
	private write(data: string): void {
		this.output.write(data);
	}

	/**
	 * Install signal handlers for cleanup.
	 */
	private installSignalHandlers(): void {
		if (this.signalHandlersInstalled) {
			return;
		}

		// Handle Ctrl+C
		process.on('SIGINT', this.boundCleanup);

		// Handle termination
		process.on('SIGTERM', this.boundCleanup);

		// Handle process exit
		process.on('exit', this.boundCleanup);

		// Handle uncaught exceptions
		process.on('uncaughtException', (error) => {
			this.cleanup();
			// Re-throw after cleanup so error is reported
			throw error;
		});

		// Handle unhandled promise rejections
		process.on('unhandledRejection', (reason) => {
			this.cleanup();
			// Re-throw after cleanup
			throw reason;
		});

		this.signalHandlersInstalled = true;
	}

	/**
	 * Remove signal handlers.
	 */
	private removeSignalHandlers(): void {
		if (!this.signalHandlersInstalled) {
			return;
		}

		process.off('SIGINT', this.boundCleanup);
		process.off('SIGTERM', this.boundCleanup);
		process.off('exit', this.boundCleanup);
		// Note: uncaughtException and unhandledRejection handlers cannot be easily removed
		// because we use inline functions. This is acceptable for our use case.

		this.signalHandlersInstalled = false;
	}
}

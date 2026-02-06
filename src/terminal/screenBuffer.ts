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
 * ScreenBuffer interface for type-safe access.
 */
export interface ScreenBuffer {
	readonly isAlternate: boolean;
	enterAlternateScreen(): void;
	exitAlternateScreen(): void;
	onCleanup(callback: CleanupCallback): () => void;
	cleanup(): void;
	destroy(): void;
}

/**
 * Create a screen buffer manager for alternate screen buffer state and cleanup.
 *
 * Ensures the terminal is properly restored on exit, SIGINT, or exceptions.
 *
 * @param output - Writable stream for terminal output (usually process.stdout)
 *
 * @example
 * ```typescript
 * const buffer = createScreenBuffer(process.stdout);
 * buffer.enterAlternateScreen();
 * // ... do work ...
 * buffer.exitAlternateScreen();
 * ```
 */
export function createScreenBuffer(output: Writable): ScreenBuffer {
	let isAlternate = false;
	const cleanupHandlers = new Set<CleanupCallback>();
	let signalHandlersInstalled = false;

	function writeToOutput(data: string): void {
		output.write(data);
	}

	function doCleanup(): void {
		for (const handler of cleanupHandlers) {
			try {
				handler();
			} catch {
				// Ignore errors during cleanup
			}
		}
		if (isAlternate) {
			writeToOutput(screen.exitAlt());
			isAlternate = false;
		}
	}

	function installSignalHandlers(): void {
		if (signalHandlersInstalled) {
			return;
		}
		process.on('SIGINT', doCleanup);
		process.on('SIGTERM', doCleanup);
		process.on('exit', doCleanup);
		process.on('uncaughtException', (error) => {
			doCleanup();
			throw error;
		});
		process.on('unhandledRejection', (reason) => {
			doCleanup();
			throw reason;
		});
		signalHandlersInstalled = true;
	}

	function removeSignalHandlers(): void {
		if (!signalHandlersInstalled) {
			return;
		}
		process.off('SIGINT', doCleanup);
		process.off('SIGTERM', doCleanup);
		process.off('exit', doCleanup);
		signalHandlersInstalled = false;
	}

	return {
		get isAlternate(): boolean {
			return isAlternate;
		},
		enterAlternateScreen(): void {
			if (isAlternate) {
				return;
			}
			writeToOutput(screen.enterAlt());
			isAlternate = true;
			installSignalHandlers();
		},
		exitAlternateScreen(): void {
			if (!isAlternate) {
				return;
			}
			writeToOutput(screen.exitAlt());
			isAlternate = false;
		},
		onCleanup(callback: CleanupCallback): () => void {
			cleanupHandlers.add(callback);
			return () => {
				cleanupHandlers.delete(callback);
			};
		},
		cleanup(): void {
			doCleanup();
		},
		destroy(): void {
			doCleanup();
			removeSignalHandlers();
			cleanupHandlers.clear();
		},
	};
}

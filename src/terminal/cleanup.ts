/**
 * Terminal Cleanup and Signal Handling
 *
 * Global cleanup coordinator for terminal applications.
 * Ensures terminal is properly restored on exit, signals, or errors.
 *
 * @module terminal/cleanup
 * @internal This module is internal and not exported from the main package.
 */

import type { Writable } from 'node:stream';
import { cursor, screen, style } from './ansi';

/**
 * Cleanup callback function type
 */
export type CleanupHandler = () => void | Promise<void>;

/**
 * Exit reason for cleanup
 */
export type ExitReason =
	| 'exit'
	| 'SIGINT'
	| 'SIGTERM'
	| 'SIGQUIT'
	| 'SIGHUP'
	| 'uncaughtException'
	| 'unhandledRejection';

/**
 * Options for exit handler callbacks
 */
export interface ExitInfo {
	/** Why cleanup was triggered */
	reason: ExitReason;
	/** Exit code (if applicable) */
	code?: number;
	/** Error that triggered cleanup (if applicable) */
	error?: Error;
}

/**
 * Exit handler callback type
 */
export type ExitHandler = (info: ExitInfo) => void | Promise<void>;

/**
 * Registered instance information
 */
interface RegisteredInstance {
	id: string;
	output: Writable;
	cleanup: CleanupHandler;
}

/**
 * CleanupManager interface for type-safe access.
 */
export interface CleanupManager {
	readonly instanceCount: number;
	readonly hasCleanedUp: boolean;
	register(id: string, output: Writable, cleanup: CleanupHandler): void;
	unregister(id: string): void;
	onExit(handler: ExitHandler): () => void;
	runCleanup(reason: ExitReason, error?: Error): Promise<void>;
	runCleanupSync(reason: ExitReason, error?: Error): void;
}

// =============================================================================
// CLEANUP MANAGER SINGLETON (module-level state, no class)
// =============================================================================

let cleanupInstance: CleanupManager | null = null;

function restoreTerminal(output: Writable): void {
	try {
		output.write(screen.alternateOff());
		output.write(cursor.show());
		output.write(style.reset());
		output.write('\n');
	} catch {
		// Ignore write errors during cleanup
	}
}

function createCleanupManager(): CleanupManager {
	const instances = new Map<string, RegisteredInstance>();
	const exitHandlers = new Set<ExitHandler>();
	let signalHandlersInstalled = false;
	let cleanupRun = false;

	function runCleanupSync(reason: ExitReason, error?: Error): void {
		if (cleanupRun) {
			return;
		}
		cleanupRun = true;

		const exitInfo: ExitInfo = error !== undefined ? { reason, error } : { reason };

		for (const handler of exitHandlers) {
			try {
				handler(exitInfo);
			} catch {
				// Ignore errors
			}
		}

		for (const instance of instances.values()) {
			try {
				restoreTerminal(instance.output);
				instance.cleanup();
			} catch {
				// Ignore errors
			}
		}
	}

	const handleSigint = (): void => {
		runCleanupSync('SIGINT');
		process.exit(130);
	};
	const handleSigterm = (): void => {
		runCleanupSync('SIGTERM');
		process.exit(143);
	};
	const handleSigquit = (): void => {
		runCleanupSync('SIGQUIT');
		process.exit(131);
	};
	const handleSighup = (): void => {
		runCleanupSync('SIGHUP');
		process.exit(129);
	};
	const handleExit = (): void => {
		runCleanupSync('exit');
	};
	const handleUncaughtException = (error: Error): void => {
		runCleanupSync('uncaughtException', error);
		throw error;
	};
	const handleUnhandledRejection = (reason: unknown): void => {
		const error = reason instanceof Error ? reason : new Error(String(reason));
		runCleanupSync('unhandledRejection', error);
	};

	function installSignalHandlers(): void {
		if (signalHandlersInstalled) {
			return;
		}
		process.on('SIGINT', handleSigint);
		process.on('SIGTERM', handleSigterm);
		process.on('SIGQUIT', handleSigquit);
		process.on('SIGHUP', handleSighup);
		process.on('exit', handleExit);
		process.on('uncaughtException', handleUncaughtException);
		process.on('unhandledRejection', handleUnhandledRejection);
		signalHandlersInstalled = true;
	}

	function removeSignalHandlers(): void {
		if (!signalHandlersInstalled) {
			return;
		}
		process.off('SIGINT', handleSigint);
		process.off('SIGTERM', handleSigterm);
		process.off('SIGQUIT', handleSigquit);
		process.off('SIGHUP', handleSighup);
		process.off('exit', handleExit);
		process.off('uncaughtException', handleUncaughtException);
		process.off('unhandledRejection', handleUnhandledRejection);
		signalHandlersInstalled = false;
	}

	return {
		get instanceCount(): number {
			return instances.size;
		},
		get hasCleanedUp(): boolean {
			return cleanupRun;
		},
		register(id: string, output: Writable, cleanup: CleanupHandler): void {
			instances.set(id, { id, output, cleanup });
			if (!signalHandlersInstalled) {
				installSignalHandlers();
			}
		},
		unregister(id: string): void {
			instances.delete(id);
			if (instances.size === 0) {
				removeSignalHandlers();
			}
		},
		onExit(handler: ExitHandler): () => void {
			exitHandlers.add(handler);
			return () => {
				exitHandlers.delete(handler);
			};
		},
		async runCleanup(reason: ExitReason, error?: Error): Promise<void> {
			if (cleanupRun) {
				return;
			}
			cleanupRun = true;

			const exitInfo: ExitInfo = error !== undefined ? { reason, error } : { reason };

			for (const handler of exitHandlers) {
				try {
					await handler(exitInfo);
				} catch {
					// Ignore errors during exit handlers
				}
			}

			for (const instance of instances.values()) {
				try {
					restoreTerminal(instance.output);
					await instance.cleanup();
				} catch {
					// Ignore errors during cleanup
				}
			}
		},
		runCleanupSync,
	};
}

/**
 * CleanupManager singleton access and management.
 *
 * Coordinates terminal cleanup across multiple Program instances.
 * Ensures terminal is restored on exit, signals, or errors.
 *
 * @example
 * ```typescript
 * CleanupManager.instance.register('program-1', process.stdout, () => {
 *   // Custom cleanup for this instance
 * });
 *
 * CleanupManager.instance.onExit((info) => {
 *   console.log('Exiting:', info.reason);
 * });
 *
 * CleanupManager.instance.unregister('program-1');
 * ```
 */
export const CleanupManager = {
	/** Get the singleton instance. */
	get instance(): CleanupManager {
		if (!cleanupInstance) {
			cleanupInstance = createCleanupManager();
		}
		return cleanupInstance;
	},
	/** Reset the singleton (for testing). */
	reset(): void {
		cleanupInstance = null;
	},
};

/**
 * Convenience function to register for cleanup.
 *
 * @param id - Unique identifier
 * @param output - Output stream
 * @param cleanup - Cleanup callback
 *
 * @example
 * ```typescript
 * registerForCleanup('my-program', process.stdout, () => {
 *   // cleanup logic
 * });
 * ```
 */
export function registerForCleanup(id: string, output: Writable, cleanup: CleanupHandler): void {
	CleanupManager.instance.register(id, output, cleanup);
}

/**
 * Convenience function to unregister from cleanup.
 *
 * @param id - Instance identifier
 */
export function unregisterFromCleanup(id: string): void {
	CleanupManager.instance.unregister(id);
}

/**
 * Convenience function to add exit handler.
 *
 * @param handler - Exit handler callback
 * @returns Unsubscribe function
 */
export function onExit(handler: ExitHandler): () => void {
	return CleanupManager.instance.onExit(handler);
}

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
 * CleanupManager is a singleton that coordinates terminal cleanup
 * across multiple Program instances.
 *
 * It ensures that:
 * - Terminal is restored on normal exit
 * - Terminal is restored on Ctrl+C (SIGINT)
 * - Terminal is restored on kill signals (SIGTERM, SIGQUIT, SIGHUP)
 * - Terminal is restored on uncaught exceptions
 * - Cleanup runs only once even with multiple instances
 * - All registered instances are cleaned up
 *
 * @example
 * ```typescript
 * // Register a program instance
 * CleanupManager.instance.register('program-1', process.stdout, () => {
 *   // Custom cleanup for this instance
 * });
 *
 * // Add exit handler
 * CleanupManager.instance.onExit((info) => {
 *   console.log('Exiting:', info.reason);
 * });
 *
 * // Unregister when done
 * CleanupManager.instance.unregister('program-1');
 * ```
 */
export class CleanupManager {
	private static _instance: CleanupManager | null = null;

	/**
	 * Get the singleton instance
	 */
	static get instance(): CleanupManager {
		if (!CleanupManager._instance) {
			CleanupManager._instance = new CleanupManager();
		}
		return CleanupManager._instance;
	}

	/**
	 * Reset the singleton (for testing)
	 */
	static reset(): void {
		if (CleanupManager._instance) {
			CleanupManager._instance.removeSignalHandlers();
			CleanupManager._instance.instances.clear();
			CleanupManager._instance.exitHandlers.clear();
			CleanupManager._instance.cleanupRun = false;
		}
		CleanupManager._instance = null;
	}

	private instances = new Map<string, RegisteredInstance>();
	private exitHandlers = new Set<ExitHandler>();
	private signalHandlersInstalled = false;
	private cleanupRun = false;

	private constructor() {
		// Private constructor for singleton
	}

	/**
	 * Number of registered instances
	 */
	get instanceCount(): number {
		return this.instances.size;
	}

	/**
	 * Whether cleanup has already been run
	 */
	get hasCleanedUp(): boolean {
		return this.cleanupRun;
	}

	/**
	 * Register a program instance for cleanup.
	 *
	 * @param id - Unique identifier for this instance
	 * @param output - Output stream to write cleanup sequences to
	 * @param cleanup - Custom cleanup function for this instance
	 *
	 * @example
	 * ```typescript
	 * CleanupManager.instance.register('my-program', process.stdout, () => {
	 *   // Custom cleanup logic
	 * });
	 * ```
	 */
	register(id: string, output: Writable, cleanup: CleanupHandler): void {
		this.instances.set(id, { id, output, cleanup });

		// Install signal handlers on first registration
		if (!this.signalHandlersInstalled) {
			this.installSignalHandlers();
		}
	}

	/**
	 * Unregister a program instance.
	 *
	 * @param id - Instance identifier to unregister
	 */
	unregister(id: string): void {
		this.instances.delete(id);

		// Remove signal handlers when no instances remain
		if (this.instances.size === 0) {
			this.removeSignalHandlers();
		}
	}

	/**
	 * Add an exit handler that runs during cleanup.
	 * Handler receives information about why cleanup was triggered.
	 *
	 * @param handler - Exit handler callback
	 * @returns Unsubscribe function
	 *
	 * @example
	 * ```typescript
	 * const unsubscribe = CleanupManager.instance.onExit((info) => {
	 *   console.log('Exit reason:', info.reason);
	 *   if (info.error) {
	 *     console.error('Error:', info.error);
	 *   }
	 * });
	 * ```
	 */
	onExit(handler: ExitHandler): () => void {
		this.exitHandlers.add(handler);
		return () => {
			this.exitHandlers.delete(handler);
		};
	}

	/**
	 * Run cleanup for all registered instances.
	 * Safe to call multiple times - only runs once.
	 *
	 * @param reason - Why cleanup was triggered
	 * @param error - Error that caused cleanup (if applicable)
	 */
	async runCleanup(reason: ExitReason, error?: Error): Promise<void> {
		// Prevent multiple cleanup runs
		if (this.cleanupRun) {
			return;
		}
		this.cleanupRun = true;

		const exitInfo: ExitInfo = { reason, error };

		// Run exit handlers first
		for (const handler of this.exitHandlers) {
			try {
				await handler(exitInfo);
			} catch {
				// Ignore errors during exit handlers
			}
		}

		// Clean up all registered instances
		for (const instance of this.instances.values()) {
			try {
				// Write terminal restoration sequences
				this.restoreTerminal(instance.output);

				// Run custom cleanup
				await instance.cleanup();
			} catch {
				// Ignore errors during cleanup
			}
		}
	}

	/**
	 * Run cleanup synchronously (for exit handler where async isn't supported)
	 */
	runCleanupSync(reason: ExitReason, error?: Error): void {
		if (this.cleanupRun) {
			return;
		}
		this.cleanupRun = true;

		const exitInfo: ExitInfo = { reason, error };

		// Run exit handlers (synchronously)
		for (const handler of this.exitHandlers) {
			try {
				handler(exitInfo);
			} catch {
				// Ignore errors
			}
		}

		// Clean up all instances
		for (const instance of this.instances.values()) {
			try {
				this.restoreTerminal(instance.output);
				instance.cleanup();
			} catch {
				// Ignore errors
			}
		}
	}

	/**
	 * Write terminal restoration sequences.
	 */
	private restoreTerminal(output: Writable): void {
		try {
			// Exit alternate screen
			output.write(screen.alternateOff());
			// Show cursor
			output.write(cursor.show());
			// Reset styles
			output.write(style.reset());
			// Move to new line (avoid prompt overwrite)
			output.write('\n');
		} catch {
			// Ignore write errors during cleanup
		}
	}

	/**
	 * Install global signal handlers.
	 */
	private installSignalHandlers(): void {
		if (this.signalHandlersInstalled) {
			return;
		}

		// Ctrl+C
		process.on('SIGINT', this.handleSigint);

		// kill
		process.on('SIGTERM', this.handleSigterm);

		// Ctrl+\ (quit)
		process.on('SIGQUIT', this.handleSigquit);

		// Terminal closed
		process.on('SIGHUP', this.handleSighup);

		// Process exit (last resort)
		process.on('exit', this.handleExit);

		// Uncaught exceptions
		process.on('uncaughtException', this.handleUncaughtException);

		// Unhandled promise rejections
		process.on('unhandledRejection', this.handleUnhandledRejection);

		this.signalHandlersInstalled = true;
	}

	/**
	 * Remove global signal handlers.
	 */
	private removeSignalHandlers(): void {
		if (!this.signalHandlersInstalled) {
			return;
		}

		process.off('SIGINT', this.handleSigint);
		process.off('SIGTERM', this.handleSigterm);
		process.off('SIGQUIT', this.handleSigquit);
		process.off('SIGHUP', this.handleSighup);
		process.off('exit', this.handleExit);
		process.off('uncaughtException', this.handleUncaughtException);
		process.off('unhandledRejection', this.handleUnhandledRejection);

		this.signalHandlersInstalled = false;
	}

	// Arrow functions to preserve `this` binding
	private handleSigint = (): void => {
		this.runCleanupSync('SIGINT');
		process.exit(130); // 128 + SIGINT (2)
	};

	private handleSigterm = (): void => {
		this.runCleanupSync('SIGTERM');
		process.exit(143); // 128 + SIGTERM (15)
	};

	private handleSigquit = (): void => {
		this.runCleanupSync('SIGQUIT');
		process.exit(131); // 128 + SIGQUIT (3)
	};

	private handleSighup = (): void => {
		this.runCleanupSync('SIGHUP');
		process.exit(129); // 128 + SIGHUP (1)
	};

	private handleExit = (): void => {
		this.runCleanupSync('exit');
	};

	private handleUncaughtException = (error: Error): void => {
		this.runCleanupSync('uncaughtException', error);
		// Re-throw to crash the process with the error
		throw error;
	};

	private handleUnhandledRejection = (reason: unknown): void => {
		const error = reason instanceof Error ? reason : new Error(String(reason));
		this.runCleanupSync('unhandledRejection', error);
		// Let Node.js handle the rejection (may crash in newer versions)
	};
}

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

/**
 * Concurrent rendering with worker thread pool.
 *
 * Provides a lightweight worker pool abstraction for offloading
 * heavy text processing (syntax highlighting, search, diffing)
 * to background threads. Gracefully degrades on single-core systems
 * or environments without worker support.
 *
 * @module systems/workerPool
 */

import { z } from 'zod';

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for WorkerPoolConfig validation.
 */
export const WorkerPoolConfigSchema = z.object({
	maxWorkers: z.number().int().positive(),
	taskTimeout: z.number().positive(),
	enabled: z.boolean(),
});

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration for the worker pool.
 */
export interface WorkerPoolConfig {
	/** Maximum number of worker threads (default: navigator.hardwareConcurrency - 1 or 2) */
	readonly maxWorkers: number;
	/** Task timeout in milliseconds (default: 5000) */
	readonly taskTimeout: number;
	/** Whether to enable the pool (false = run everything synchronously) */
	readonly enabled: boolean;
}

/**
 * Priority levels for tasks.
 */
export type TaskPriority = 'high' | 'normal' | 'low';

/**
 * A task to be executed in the pool.
 */
export interface PoolTask<TInput = unknown> {
	/** Unique task ID */
	readonly id: string;
	/** Task type identifier */
	readonly type: string;
	/** Input data for the task */
	readonly input: TInput;
	/** Task priority */
	readonly priority: TaskPriority;
	/** Timestamp when task was queued */
	readonly queuedAt: number;
}

/**
 * Result of a completed pool task.
 */
export interface TaskResult<TOutput = unknown> {
	/** Task ID */
	readonly id: string;
	/** Task type */
	readonly type: string;
	/** Output data (undefined if cancelled or failed) */
	readonly output: TOutput | undefined;
	/** Whether the task was cancelled */
	readonly cancelled: boolean;
	/** Error message if failed */
	readonly error: string | undefined;
	/** Execution time in milliseconds */
	readonly durationMs: number;
}

/**
 * Worker pool statistics.
 */
export interface PoolStats {
	/** Number of active workers */
	readonly activeWorkers: number;
	/** Number of idle workers */
	readonly idleWorkers: number;
	/** Tasks currently queued */
	readonly queuedTasks: number;
	/** Tasks currently running */
	readonly runningTasks: number;
	/** Total tasks completed */
	readonly completedTasks: number;
	/** Total tasks cancelled */
	readonly cancelledTasks: number;
	/** Total tasks failed */
	readonly failedTasks: number;
	/** Average task duration in ms */
	readonly avgDurationMs: number;
	/** Whether the pool is enabled */
	readonly enabled: boolean;
}

/**
 * A synchronous task handler for fallback execution.
 */
export type SyncHandler<TInput = unknown, TOutput = unknown> = (input: TInput) => TOutput;

/**
 * Worker pool state object.
 */
export interface WorkerPoolState {
	/** Pool configuration */
	readonly config: WorkerPoolConfig;
	/** Current pool statistics */
	readonly stats: PoolStats;
}

// =============================================================================
// INTERNAL STATE
// =============================================================================

interface TaskEntry {
	task: PoolTask;
	resolve: (result: TaskResult) => void;
	handler: SyncHandler;
	timerHandle: ReturnType<typeof setTimeout> | null;
}

interface MutablePoolState {
	config: WorkerPoolConfig;
	queue: TaskEntry[];
	running: Map<string, TaskEntry>;
	handlers: Map<string, SyncHandler>;
	completedCount: number;
	cancelledCount: number;
	failedCount: number;
	totalDurationMs: number;
}

// =============================================================================
// DEFAULTS
// =============================================================================

function getDefaultMaxWorkers(): number {
	// In Node.js, use os.cpus() count - 1, minimum 1
	try {
		// biome-ignore lint/suspicious/noExplicitAny: runtime detection
		const os = (globalThis as any).require?.('os');
		if (os?.cpus) return Math.max(1, os.cpus().length - 1);
	} catch {
		// Ignore - not in Node or require not available
	}
	return 2;
}

const DEFAULT_POOL_CONFIG: WorkerPoolConfig = {
	maxWorkers: getDefaultMaxWorkers(),
	taskTimeout: 5000,
	enabled: true,
};

// =============================================================================
// POOL MANAGEMENT
// =============================================================================

let poolState: MutablePoolState | null = null;
let nextTaskId = 0;

/**
 * Creates and initializes the worker pool.
 *
 * In this implementation, the pool uses synchronous fallback handlers
 * running on the main thread with a priority queue. True worker thread
 * support can be added when node:worker_threads integration is needed.
 *
 * @param config - Optional pool configuration
 * @returns Pool state
 *
 * @example
 * ```typescript
 * import { createWorkerPool, registerTaskHandler, submitTask } from 'blecsd';
 *
 * createWorkerPool({ maxWorkers: 4 });
 * registerTaskHandler('highlight', (input) => highlightSync(input));
 * const result = await submitTask('highlight', sourceCode);
 * ```
 */
export function createWorkerPool(config?: Partial<WorkerPoolConfig>): WorkerPoolState {
	const merged = { ...DEFAULT_POOL_CONFIG, ...config };
	const validatedConfig = WorkerPoolConfigSchema.parse(merged);
	poolState = {
		config: validatedConfig,
		queue: [],
		running: new Map(),
		handlers: new Map(),
		completedCount: 0,
		cancelledCount: 0,
		failedCount: 0,
		totalDurationMs: 0,
	};
	return getWorkerPoolState();
}

/**
 * Registers a synchronous handler for a task type.
 * This handler will be used to process tasks of the given type.
 *
 * @param type - Task type identifier
 * @param handler - Synchronous processing function
 *
 * @example
 * ```typescript
 * import { registerTaskHandler } from 'blecsd';
 *
 * registerTaskHandler('search', (input: { query: string; text: string }) => {
 *   return input.text.indexOf(input.query);
 * });
 * ```
 */
export function registerTaskHandler<TInput = unknown, TOutput = unknown>(
	type: string,
	handler: SyncHandler<TInput, TOutput>,
): void {
	if (!poolState) return;
	poolState.handlers.set(type, handler as SyncHandler);
}

/**
 * Submits a task to the worker pool.
 * Returns a promise that resolves when the task completes.
 *
 * @param type - Task type (must have a registered handler)
 * @param input - Input data for the task
 * @param priority - Task priority (default: 'normal')
 * @returns Promise resolving to the task result
 *
 * @example
 * ```typescript
 * import { submitTask } from 'blecsd';
 *
 * const result = await submitTask('highlight', { code: 'const x = 1;', lang: 'js' });
 * if (!result.cancelled && !result.error) {
 *   console.log(result.output);
 * }
 * ```
 */
export function submitTask<TInput = unknown, TOutput = unknown>(
	type: string,
	input: TInput,
	priority: TaskPriority = 'normal',
): Promise<TaskResult<TOutput>> {
	if (!poolState || !poolState.config.enabled) {
		return executeSynchronously<TInput, TOutput>(type, input);
	}

	const id = `task-${nextTaskId++}`;
	const task: PoolTask = { id, type, input, priority, queuedAt: Date.now() };

	return new Promise<TaskResult<TOutput>>((resolve) => {
		if (!poolState) {
			resolve({
				id,
				type,
				output: undefined,
				cancelled: false,
				error: 'Worker pool not initialized',
				durationMs: 0,
			});
			return;
		}

		const handler = poolState.handlers.get(type);
		if (!handler) {
			resolve({
				id,
				type,
				output: undefined,
				cancelled: false,
				error: `No handler registered for task type: ${type}`,
				durationMs: 0,
			});
			return;
		}

		const entry: TaskEntry = {
			task,
			resolve: resolve as (r: TaskResult) => void,
			handler,
			timerHandle: null,
		};

		// Insert by priority
		const priorityOrder = { high: 0, normal: 1, low: 2 };
		const entryPri = priorityOrder[priority];
		let insertIdx = poolState.queue.length;
		for (let i = 0; i < poolState.queue.length; i++) {
			const queueEntry = poolState.queue[i];
			if (queueEntry && priorityOrder[queueEntry.task.priority] > entryPri) {
				insertIdx = i;
				break;
			}
		}
		poolState.queue.splice(insertIdx, 0, entry);

		// Process queue on next microtask
		queueMicrotask(() => processQueue());
	});
}

/**
 * Cancels a pending task by ID.
 *
 * @param taskId - ID of the task to cancel
 * @returns Whether the task was found and cancelled
 */
export function cancelTask(taskId: string): boolean {
	if (!poolState) return false;

	const queueIdx = poolState.queue.findIndex((e) => e.task.id === taskId);
	if (queueIdx >= 0) {
		const [entry] = poolState.queue.splice(queueIdx, 1);
		if (!entry) return false;
		entry.resolve({
			id: taskId,
			type: entry.task.type,
			output: undefined,
			cancelled: true,
			error: undefined,
			durationMs: 0,
		});
		poolState.cancelledCount++;
		return true;
	}

	return false;
}

/**
 * Cancels all pending tasks of a given type.
 *
 * @param type - Task type to cancel
 * @returns Number of tasks cancelled
 */
export function cancelAllOfType(type: string): number {
	if (!poolState) return 0;

	let count = 0;
	const remaining: TaskEntry[] = [];
	for (const entry of poolState.queue) {
		if (entry.task.type === type) {
			entry.resolve({
				id: entry.task.id,
				type,
				output: undefined,
				cancelled: true,
				error: undefined,
				durationMs: 0,
			});
			count++;
		} else {
			remaining.push(entry);
		}
	}
	poolState.queue = remaining;
	poolState.cancelledCount += count;
	return count;
}

/**
 * Gets the current worker pool state and statistics.
 *
 * @returns Current pool state
 */
export function getWorkerPoolState(): WorkerPoolState {
	if (!poolState) {
		return {
			config: DEFAULT_POOL_CONFIG,
			stats: {
				activeWorkers: 0,
				idleWorkers: 0,
				queuedTasks: 0,
				runningTasks: 0,
				completedTasks: 0,
				cancelledTasks: 0,
				failedTasks: 0,
				avgDurationMs: 0,
				enabled: false,
			},
		};
	}

	const totalCompleted = poolState.completedCount + poolState.failedCount;
	return {
		config: poolState.config,
		stats: {
			activeWorkers: poolState.running.size,
			idleWorkers: Math.max(0, poolState.config.maxWorkers - poolState.running.size),
			queuedTasks: poolState.queue.length,
			runningTasks: poolState.running.size,
			completedTasks: poolState.completedCount,
			cancelledTasks: poolState.cancelledCount,
			failedTasks: poolState.failedCount,
			avgDurationMs: totalCompleted > 0 ? poolState.totalDurationMs / totalCompleted : 0,
			enabled: poolState.config.enabled,
		},
	};
}

/**
 * Destroys the worker pool and cancels all pending tasks.
 */
export function destroyWorkerPool(): void {
	if (!poolState) return;

	// Cancel all queued tasks
	for (const entry of poolState.queue) {
		entry.resolve({
			id: entry.task.id,
			type: entry.task.type,
			output: undefined,
			cancelled: true,
			error: undefined,
			durationMs: 0,
		});
	}

	// Clear running task timers
	for (const entry of poolState.running.values()) {
		if (entry.timerHandle) clearTimeout(entry.timerHandle);
	}

	poolState = null;
	nextTaskId = 0;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

function executeSynchronously<TInput, TOutput>(
	type: string,
	input: TInput,
): Promise<TaskResult<TOutput>> {
	const id = `sync-${nextTaskId++}`;
	const handler = poolState?.handlers.get(type);
	if (!handler) {
		return Promise.resolve({
			id,
			type,
			output: undefined,
			cancelled: false,
			error: `No handler registered for task type: ${type}`,
			durationMs: 0,
		});
	}

	const start = performance.now();
	try {
		const output = handler(input) as TOutput;
		return Promise.resolve({
			id,
			type,
			output,
			cancelled: false,
			error: undefined,
			durationMs: performance.now() - start,
		});
	} catch (err) {
		return Promise.resolve({
			id,
			type,
			output: undefined,
			cancelled: false,
			error: err instanceof Error ? err.message : String(err),
			durationMs: performance.now() - start,
		});
	}
}

function setupTaskTimeout(entry: TaskEntry, timeout: number): void {
	if (timeout <= 0) return;

	entry.timerHandle = setTimeout(() => {
		if (!poolState) return;
		poolState.running.delete(entry.task.id);
		poolState.failedCount++;
		entry.resolve({
			id: entry.task.id,
			type: entry.task.type,
			output: undefined,
			cancelled: false,
			error: `Task timed out after ${timeout}ms`,
			durationMs: timeout,
		});
	}, timeout);
}

function completeTaskSuccessfully(entry: TaskEntry, output: unknown, duration: number): void {
	if (!poolState) return;
	if (!poolState.running.has(entry.task.id)) return;

	if (entry.timerHandle) clearTimeout(entry.timerHandle);

	poolState.running.delete(entry.task.id);
	poolState.completedCount++;
	poolState.totalDurationMs += duration;
	entry.resolve({
		id: entry.task.id,
		type: entry.task.type,
		output,
		cancelled: false,
		error: undefined,
		durationMs: duration,
	});
}

function completeTaskWithError(entry: TaskEntry, err: unknown, duration: number): void {
	if (!poolState) return;
	if (!poolState.running.has(entry.task.id)) return;

	if (entry.timerHandle) clearTimeout(entry.timerHandle);

	poolState.running.delete(entry.task.id);
	poolState.failedCount++;
	poolState.totalDurationMs += duration;
	entry.resolve({
		id: entry.task.id,
		type: entry.task.type,
		output: undefined,
		cancelled: false,
		error: err instanceof Error ? err.message : String(err),
		durationMs: duration,
	});
}

function executeTask(entry: TaskEntry): void {
	if (!poolState) return;

	setupTaskTimeout(entry, poolState.config.taskTimeout);

	const start = performance.now();
	try {
		const output = entry.handler(entry.task.input);
		const duration = performance.now() - start;
		completeTaskSuccessfully(entry, output, duration);
	} catch (err) {
		const duration = performance.now() - start;
		completeTaskWithError(entry, err, duration);
	}
}

function processQueue(): void {
	if (!poolState) return;

	while (poolState.queue.length > 0 && poolState.running.size < poolState.config.maxWorkers) {
		const entry = poolState.queue.shift();
		if (!entry) break;

		poolState.running.set(entry.task.id, entry);
		executeTask(entry);
	}
}

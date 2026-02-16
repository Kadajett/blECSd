/**
 * Worker pool namespace.
 *
 * @example
 * ```typescript
 * import { workerPool } from 'blecsd/systems';
 * const pool = workerPool.create({ maxWorkers: 4 });
 * workerPool.registerHandler(pool, 'processData', handler);
 * const taskId = await workerPool.submit(pool, 'processData', data);
 * workerPool.cancel(pool, taskId);
 * workerPool.destroy(pool);
 * ```
 */
import {
	cancelAllOfType,
	cancelTask,
	createWorkerPool,
	destroyWorkerPool,
	getWorkerPoolState,
	registerTaskHandler,
	submitTask,
} from '../workerPool';

export const workerPool = Object.freeze({
	create: createWorkerPool,
	destroy: destroyWorkerPool,
	submit: submitTask,
	cancel: cancelTask,
	cancelAllOfType,
	registerHandler: registerTaskHandler,
	getState: getWorkerPoolState,
});

export type WorkerPoolModule = typeof workerPool;

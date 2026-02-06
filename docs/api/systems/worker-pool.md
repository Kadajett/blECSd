# Worker Pool System API

Concurrent task processing with a priority queue, synchronous fallback handlers, and graceful degradation.

## Overview

The worker pool handles:
- Priority-based task queuing (high, normal, low)
- Synchronous fallback execution on the main thread
- Task timeouts with configurable limits
- Task cancellation (by ID or by type)
- Pool statistics and monitoring
- Graceful degradation when worker threads are unavailable

## Quick Start

```typescript
import {
  createWorkerPool,
  registerTaskHandler,
  submitTask,
} from 'blecsd';

createWorkerPool({ maxWorkers: 4 });

registerTaskHandler('highlight', (input: { code: string }) => {
  return highlightSyntax(input.code);
});

const result = await submitTask('highlight', { code: 'const x = 1;' });
if (!result.error) {
  console.log(result.output);
}
```

## Types

### WorkerPoolConfig

```typescript
interface WorkerPoolConfig {
  /** Maximum number of worker threads (default: cpuCount - 1 or 2) */
  readonly maxWorkers: number;
  /** Task timeout in milliseconds (default: 5000) */
  readonly taskTimeout: number;
  /** Whether to enable the pool (false = run everything synchronously) */
  readonly enabled: boolean;
}
```

### TaskPriority

```typescript
type TaskPriority = 'high' | 'normal' | 'low';
```

### PoolTask

```typescript
interface PoolTask<TInput = unknown> {
  readonly id: string;
  readonly type: string;
  readonly input: TInput;
  readonly priority: TaskPriority;
  readonly queuedAt: number;
}
```

### TaskResult

```typescript
interface TaskResult<TOutput = unknown> {
  readonly id: string;
  readonly type: string;
  readonly output: TOutput | undefined;
  readonly cancelled: boolean;
  readonly error: string | undefined;
  readonly durationMs: number;
}
```

### PoolStats

```typescript
interface PoolStats {
  readonly activeWorkers: number;
  readonly idleWorkers: number;
  readonly queuedTasks: number;
  readonly runningTasks: number;
  readonly completedTasks: number;
  readonly cancelledTasks: number;
  readonly failedTasks: number;
  readonly avgDurationMs: number;
  readonly enabled: boolean;
}
```

### SyncHandler

```typescript
type SyncHandler<TInput = unknown, TOutput = unknown> = (input: TInput) => TOutput;
```

### WorkerPoolState

```typescript
interface WorkerPoolState {
  readonly config: WorkerPoolConfig;
  readonly stats: PoolStats;
}
```

## Functions

### createWorkerPool

Creates and initializes the worker pool. Uses synchronous fallback handlers on the main thread with a priority queue.

```typescript
function createWorkerPool(config?: Partial<WorkerPoolConfig>): WorkerPoolState
```

```typescript
import { createWorkerPool } from 'blecsd';

createWorkerPool({
  maxWorkers: 4,
  taskTimeout: 5000,
  enabled: true,
});
```

### registerTaskHandler

Registers a synchronous handler for a task type.

```typescript
function registerTaskHandler<TInput = unknown, TOutput = unknown>(
  type: string,
  handler: SyncHandler<TInput, TOutput>,
): void
```

```typescript
import { registerTaskHandler } from 'blecsd';

registerTaskHandler('search', (input: { query: string; text: string }) => {
  return input.text.indexOf(input.query);
});

registerTaskHandler('diff', (input: { a: string; b: string }) => {
  return computeDiff(input.a, input.b);
});
```

### submitTask

Submits a task to the worker pool. Returns a promise that resolves when the task completes.

```typescript
function submitTask<TInput = unknown, TOutput = unknown>(
  type: string,
  input: TInput,
  priority?: TaskPriority,
): Promise<TaskResult<TOutput>>
```

**Parameters:**
- `type` - Task type (must have a registered handler)
- `input` - Input data for the task
- `priority` - Task priority (default: `'normal'`)

**Returns:** Promise resolving to `TaskResult`.

<!-- blecsd-doccheck:ignore -->
```typescript
import { submitTask } from 'blecsd';

// Normal priority
const result = await submitTask('highlight', { code: sourceCode, lang: 'ts' });

// High priority (processed before normal/low)
const urgent = await submitTask('search', { query, text }, 'high');

// Check result
if (result.cancelled) {
  console.log('Task was cancelled');
} else if (result.error) {
  console.error(`Task failed: ${result.error}`);
} else {
  console.log(`Completed in ${result.durationMs}ms`, result.output);
}
```

### cancelTask

Cancels a pending task by ID.

```typescript
function cancelTask(taskId: string): boolean
```

**Returns:** Whether the task was found and cancelled.

### cancelAllOfType

Cancels all pending tasks of a given type.

```typescript
function cancelAllOfType(type: string): number
```

**Returns:** Number of tasks cancelled.

```typescript
import { cancelAllOfType } from 'blecsd';

// Cancel all pending search tasks when query changes
const cancelled = cancelAllOfType('search');
console.log(`Cancelled ${cancelled} search tasks`);
```

### getWorkerPoolState

Gets the current worker pool state and statistics.

```typescript
function getWorkerPoolState(): WorkerPoolState
```

```typescript
import { getWorkerPoolState } from 'blecsd';

const { stats } = getWorkerPoolState();
console.log(`Active: ${stats.activeWorkers}, Queued: ${stats.queuedTasks}`);
console.log(`Completed: ${stats.completedTasks}, Failed: ${stats.failedTasks}`);
console.log(`Avg duration: ${stats.avgDurationMs.toFixed(1)}ms`);
```

### destroyWorkerPool

Destroys the worker pool and cancels all pending tasks.

```typescript
function destroyWorkerPool(): void
```

## Usage Example

Complete worker pool setup for text processing tasks:

```typescript
import {
  createWorkerPool,
  registerTaskHandler,
  submitTask,
  cancelAllOfType,
  getWorkerPoolState,
  destroyWorkerPool,
} from 'blecsd';

// Initialize pool
createWorkerPool({
  maxWorkers: 4,
  taskTimeout: 3000,
});

// Register handlers for different task types
registerTaskHandler('highlight', (input: { code: string; lang: string }) => {
  // Syntax highlighting logic
  return applyHighlighting(input.code, input.lang);
});

registerTaskHandler('search', (input: { query: string; lines: string[] }) => {
  // Search through lines
  return input.lines
    .map((line, i) => ({ line: i, text: line }))
    .filter((entry) => entry.text.includes(input.query));
});

registerTaskHandler('diff', (input: { before: string; after: string }) => {
  return computeLineDiff(input.before, input.after);
});

// Submit tasks with priorities
async function onFileOpen(code: string, lang: string) {
  const result = await submitTask('highlight', { code, lang }, 'high');
  if (!result.error && !result.cancelled) {
    applyHighlightedOutput(result.output);
  }
}

async function onSearch(query: string, lines: string[]) {
  // Cancel previous search tasks
  cancelAllOfType('search');

  const result = await submitTask('search', { query, lines }, 'normal');
  if (!result.cancelled && !result.error) {
    displaySearchResults(result.output);
  }
}

// Monitor pool health
setInterval(() => {
  const { stats } = getWorkerPoolState();
  if (stats.queuedTasks > 10) {
    console.warn(`Task queue backing up: ${stats.queuedTasks} pending`);
  }
}, 1000);

// Cleanup on exit
process.on('exit', () => {
  destroyWorkerPool();
});
```

/**
 * Convenience helpers for wiring up the blECSd render pipeline.
 *
 * The render pipeline requires three separate initialization steps
 * (`setOutputStream`, `setOutputBuffer`, `setRenderBuffer`) before
 * `renderSystem` or `outputSystem` will produce any output.  Forgetting
 * any of those steps causes both systems to silently no-op, resulting in
 * a black screen that is hard to diagnose.
 *
 * `createRenderPipeline` consolidates all three steps into a single call
 * and returns a `destroy` helper that cleans up the global state.
 *
 * @example
 * ```typescript
 * import { createProgram } from 'blecsd/terminal';
 * import { createWorld, createScreenEntity } from 'blecsd/core';
 * import { createRenderPipeline, layoutSystem, renderSystem, outputSystem } from 'blecsd/systems';
 *
 * const cols = process.stdout.columns ?? 80;
 * const rows = process.stdout.rows ?? 24;
 *
 * const program = createProgram();
 * await program.init();
 *
 * const world = createWorld();
 * createScreenEntity(world, { width: cols, height: rows });
 *
 * const pipeline = createRenderPipeline({ output: process.stdout, width: cols, height: rows });
 *
 * function render(): void {
 *   layoutSystem(world);
 *   renderSystem(world);
 *   outputSystem(world);
 * }
 *
 * render();
 *
 * process.on('exit', () => {
 *   pipeline.destroy();
 *   program.destroy();
 * });
 * ```
 *
 * @module systems/renderPipeline
 */

import type { Writable } from 'node:stream';
import type { DirtyTracker } from '../core/dirtyTracking';
import { createDirtyTracker } from '../core/dirtyTracking';
import type { DoubleBufferData } from '../terminal/screen/doubleBuffer';
import { createDoubleBuffer, getBackBuffer } from '../terminal/screen/doubleBuffer';
import {
	clearOutputBuffer,
	clearOutputStream,
	setOutputBuffer,
	setOutputStream,
} from './outputSystem';
import { clearRenderBuffer, setRenderBuffer } from './renderSystem';

/**
 * Configuration for {@link createRenderPipeline}.
 */
export interface RenderPipelineConfig {
	/** Writable stream to flush terminal output to (typically `process.stdout`). */
	output: Writable;
	/** Terminal width in columns. */
	width: number;
	/** Terminal height in rows. */
	height: number;
}

/**
 * The object returned by {@link createRenderPipeline}.
 */
export interface RenderPipeline {
	/** The double buffer used for output diffing. */
	doubleBuffer: DoubleBufferData;
	/** The dirty tracker used by the render system. */
	dirtyTracker: DirtyTracker;
	/**
	 * Tears down the pipeline by clearing all global state set during
	 * initialization.  Call this on process exit (or whenever you are done
	 * rendering) to avoid leaking module-level state across tests or
	 * hot-reloads.
	 */
	destroy(): void;
}

/**
 * Creates and wires up the blECSd render pipeline in a single call.
 *
 * Internally this performs:
 * 1. `setOutputStream(config.output)` — where to write terminal bytes
 * 2. `createDoubleBuffer(width, height)` + `setOutputBuffer(db)` — what
 *    `outputSystem` diffs against
 * 3. `createDirtyTracker(width, height)` + `setRenderBuffer(tracker, back)`
 *    — what `renderSystem` writes into
 *
 * @param config - Pipeline configuration
 * @returns An object containing the allocated buffers and a `destroy` helper
 *
 * @example
 * ```typescript
 * import { createRenderPipeline } from 'blecsd/systems';
 *
 * const pipeline = createRenderPipeline({
 *   output: process.stdout,
 *   width: process.stdout.columns ?? 80,
 *   height: process.stdout.rows ?? 24,
 * });
 *
 * // Later:
 * pipeline.destroy();
 * ```
 */
export function createRenderPipeline(config: RenderPipelineConfig): RenderPipeline {
	const { output, width, height } = config;

	// Step 1: output stream
	setOutputStream(output);

	// Step 2: double buffer for output diffing
	const doubleBuffer = createDoubleBuffer(width, height);
	setOutputBuffer(doubleBuffer);

	// Step 3: dirty tracker + back buffer for render system
	const dirtyTracker = createDirtyTracker(width, height);
	setRenderBuffer(dirtyTracker, getBackBuffer(doubleBuffer));

	function destroy(): void {
		clearOutputStream();
		clearOutputBuffer();
		clearRenderBuffer();
	}

	return { doubleBuffer, dirtyTracker, destroy };
}

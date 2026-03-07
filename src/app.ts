/**
 * Application helpers — high-level DX utilities for common blECSd patterns.
 *
 * These eliminate the boilerplate that every terminal app needs:
 * render-pipeline wiring, signal-safe shutdown, and full app bootstrap.
 *
 * @module app
 * @packageDocumentation
 */

import type { Writable } from 'node:stream';
import { createDirtyTracker } from './core/dirtyTracking';
import { createScreenEntity } from './core/entities/factories';
import type { World } from './core/types';
import { createWorld } from './core/world';
import {
	cleanup,
	layoutSystem,
	outputSystem,
	renderSystem,
	setOutputBuffer,
	setOutputStream,
	setRenderBuffer,
} from './systems/index';
import type { Program, ProgramConfig } from './terminal/program';
import { createProgram } from './terminal/program';
import { createDoubleBuffer, getBackBuffer } from './terminal/screen/doubleBuffer';

// ─── createRenderPipeline ────────────────────────────────────────────────────

/**
 * Options for {@link createRenderPipeline}.
 */
export interface RenderPipelineOptions {
	/** Terminal columns. Defaults to `stream.columns` or `$COLUMNS` or 80. */
	cols?: number;
	/** Terminal rows. Defaults to `stream.rows` or `$LINES` or 24. */
	rows?: number;
}

/**
 * Handle returned by {@link createRenderPipeline}.
 */
export interface RenderPipeline {
	/** Terminal column count used. */
	readonly cols: number;
	/** Terminal row count used. */
	readonly rows: number;
}

/**
 * Wire up the full output → double-buffer → dirty-tracker render pipeline
 * in a single call.
 *
 * Replaces the 5-line setup dance:
 * ```ts
 * setOutputStream(process.stdout);
 * const db = createDoubleBuffer(cols, rows);
 * setOutputBuffer(db);
 * setRenderBuffer(createDirtyTracker(cols, rows), getBackBuffer(db));
 * ```
 *
 * Usage:
 * ```ts
 * import { createRenderPipeline } from 'blecsd';
 * const { cols, rows } = createRenderPipeline(process.stdout);
 * ```
 */
export function createRenderPipeline(
	stream: Writable & { columns?: number; rows?: number },
	options: RenderPipelineOptions = {},
): RenderPipeline {
	const cols = options.cols ?? stream.columns ?? Number(process.env.COLUMNS ?? 80);
	const rows = options.rows ?? stream.rows ?? Number(process.env.LINES ?? 24);

	setOutputStream(stream);
	const doubleBuffer = createDoubleBuffer(cols, rows);
	setOutputBuffer(doubleBuffer);
	setRenderBuffer(createDirtyTracker(cols, rows), getBackBuffer(doubleBuffer));

	return { cols, rows };
}

// ─── onShutdown ──────────────────────────────────────────────────────────────

/**
 * Options for {@link onShutdown}.
 */
export interface ShutdownOptions {
	/** Program instance to destroy on shutdown. */
	program?: Program | null;
	/** Exit code. Defaults to 0. */
	exitCode?: number;
	/** Additional cleanup callback invoked before `process.exit`. */
	onBeforeExit?: () => void;
}

/**
 * Register SIGINT/SIGTERM handlers that cleanly tear down a blECSd world.
 *
 * Handles: cursor restore, alternate-screen exit, program destruction,
 * and idempotent guard against double-shutdown.
 *
 * Returns a `shutdown` function you can also call manually (e.g. on "q" key).
 *
 * Usage:
 * ```ts
 * import { onShutdown } from 'blecsd';
 * const shutdown = onShutdown(world, { program });
 * // later: shutdown();
 * ```
 */
export function onShutdown(_world: World, options: ShutdownOptions = {}): () => void {
	let isShuttingDown = false;

	const shutdown = (): void => {
		if (isShuttingDown) return;
		isShuttingDown = true;

		options.onBeforeExit?.();
		cleanup();
		options.program?.destroy();
		process.exit(options.exitCode ?? 0);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);

	return shutdown;
}

// ─── renderToString ──────────────────────────────────────────────────────────

/**
 * Run one layout → render → output cycle on a world and capture the
 * ANSI output as a string instead of writing to a stream.
 *
 * Useful for headless testing or snapshot comparisons.
 *
 * **Note:** This sets up a temporary render pipeline, renders one frame,
 * and returns the captured output. It does *not* disturb any previously
 * configured pipeline.
 *
 * Usage:
 * ```ts
 * import { renderToString } from 'blecsd';
 * const frame = renderToString(world, 80, 24);
 * ```
 */
export function renderToString(world: World, cols = 80, rows = 24): string {
	let captured = '';

	// Create a fake writable that collects output
	const fakeStream = {
		columns: cols,
		rows,
		write(chunk: string | Uint8Array): boolean {
			captured += typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
			return true;
		},
	} as Writable & { columns: number; rows: number };

	// Temporarily wire the pipeline to our collector
	setOutputStream(fakeStream);
	const doubleBuffer = createDoubleBuffer(cols, rows);
	setOutputBuffer(doubleBuffer);
	setRenderBuffer(createDirtyTracker(cols, rows), getBackBuffer(doubleBuffer));

	layoutSystem(world);
	renderSystem(world);
	outputSystem(world);

	return captured;
}

// ─── createApp ───────────────────────────────────────────────────────────────

/**
 * Options for {@link createApp}.
 */
export interface AppOptions {
	/** Terminal columns override. */
	cols?: number;
	/** Terminal rows override. */
	rows?: number;
	/** Target FPS for the render loop. 0 = manual rendering only. Default: 0. */
	fps?: number;
	/** Whether to use fullscreen (alternate screen). Default: true. */
	fullscreen?: boolean;
	/** Additional program config passed to `createProgram`. */
	programOptions?: ProgramConfig;
}

/**
 * Handle returned by {@link createApp}.
 */
export interface App {
	/** The ECS world. */
	readonly world: World;
	/** The terminal program (input handling). */
	readonly program: Program;
	/** Terminal column count. */
	readonly cols: number;
	/** Terminal row count. */
	readonly rows: number;
	/** Run one render frame (layout → render → output). */
	render(): void;
	/** Gracefully shut down and exit. */
	shutdown(): void;
	/** Start the render loop (if fps > 0). Returns a stop function. */
	start(): () => void;
}

/**
 * Full application bootstrap in a single call.
 *
 * Creates a world, wires the render pipeline, sets up a program for input,
 * registers shutdown handlers, and optionally starts a render loop.
 *
 * Usage:
 * ```ts
 * import { createApp } from 'blecsd';
 *
 * const app = await createApp({ fullscreen: true, fps: 30 });
 * // ... add entities, register key handlers on app.program ...
 * app.start();
 * ```
 */
export async function createApp(options: AppOptions = {}): Promise<App> {
	const world = createWorld();

	const stream = process.stdout as Writable & {
		columns?: number;
		rows?: number;
	};
	const pipelineOpts: RenderPipelineOptions = {};
	if (options.cols !== undefined) pipelineOpts.cols = options.cols;
	if (options.rows !== undefined) pipelineOpts.rows = options.rows;
	const { cols, rows } = createRenderPipeline(stream, pipelineOpts);

	createScreenEntity(world, { width: cols, height: rows });

	const program = createProgram({
		useAlternateScreen: options.fullscreen ?? true,
		...options.programOptions,
	});
	await program.init();

	const shutdownFn = onShutdown(world, { program });

	const render = (): void => {
		layoutSystem(world);
		renderSystem(world);
		outputSystem(world);
	};

	const start = (): (() => void) => {
		const fps = options.fps ?? 0;
		if (fps <= 0) return () => {};
		const interval = setInterval(render, Math.round(1000 / fps));
		return () => clearInterval(interval);
	};

	return {
		world,
		program,
		cols,
		rows,
		render,
		shutdown: shutdownFn,
		start,
	};
}

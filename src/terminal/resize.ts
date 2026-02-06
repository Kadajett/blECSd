/**
 * Terminal Resize Handling
 *
 * Provides resize event handling that connects terminal resize events
 * to the ECS world, updating Screen dimensions, buffers, and layout.
 *
 * @module terminal/resize
 *
 * @example
 * ```typescript
 * import {
 *   createResizeHandler,
 *   enableResizeHandling,
 *   disableResizeHandling,
 *   getResizeEventBus,
 * } from 'blecsd';
 *
 * const program = createProgram();
 * const world = createWorld();
 * const screen = createScreenEntity(world, { width: 80, height: 24 });
 *
 * // Create resize handler
 * const handler = createResizeHandler(world);
 *
 * // Enable resize handling
 * enableResizeHandling(program, handler);
 *
 * // Listen for resize events
 * getResizeEventBus().on('resize', ({ width, height }) => {
 *   console.log(`Resized to ${width}x${height}`);
 * });
 *
 * // When done
 * disableResizeHandling(program, handler);
 * ```
 */

import { getScreen, getScreenSize, resizeScreen } from '../components/screen';
import { createEventBus, type EventBus } from '../core/events';
import type { World } from '../core/types';
import { invalidateAllLayouts } from '../systems/layoutSystem';
import { getOutputBuffer, setOutputBuffer } from '../systems/outputSystem';
import { markAllDirty } from '../systems/renderSystem';
import type { Program, ResizeEvent } from './program';
import { resizeDoubleBuffer } from './screen/doubleBuffer';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Resize event data.
 */
export interface ResizeEventData {
	/** New width in columns */
	readonly width: number;
	/** New height in rows */
	readonly height: number;
	/** Previous width */
	readonly previousWidth: number;
	/** Previous height */
	readonly previousHeight: number;
}

/**
 * Resize event map for type-safe event handling.
 */
export interface ResizeEventMap {
	resize: ResizeEventData;
}

/**
 * Resize handler function type.
 */
export type ResizeHandler = (event: ResizeEvent) => void;

/**
 * Resize handling state.
 */
export interface ResizeHandlerState {
	/** The ECS world being managed */
	readonly world: World;
	/** Last known width */
	lastWidth: number;
	/** Last known height */
	lastHeight: number;
	/** The resize handler function (for removal) */
	readonly handler: ResizeHandler;
}

// =============================================================================
// MODULE STATE
// =============================================================================

/** Event bus for resize events */
let resizeEventBus: EventBus<ResizeEventMap> | null = null;

/** Active resize handlers by world */
const activeHandlers = new WeakMap<World, ResizeHandlerState>();

// =============================================================================
// EVENT BUS
// =============================================================================

/**
 * Gets the resize event bus, creating if needed.
 *
 * @returns The resize event bus
 *
 * @example
 * ```typescript
 * const bus = getResizeEventBus();
 * bus.on('resize', ({ width, height }) => {
 *   console.log(`Terminal resized to ${width}x${height}`);
 * });
 * ```
 */
export function getResizeEventBus(): EventBus<ResizeEventMap> {
	if (!resizeEventBus) {
		resizeEventBus = createEventBus<ResizeEventMap>();
	}
	return resizeEventBus;
}

/**
 * Resets the resize event bus. Used for testing.
 * @internal
 */
export function resetResizeEventBus(): void {
	resizeEventBus = null;
}

// =============================================================================
// RESIZE HANDLING
// =============================================================================

/**
 * Creates a resize handler for the given world.
 *
 * The handler will:
 * 1. Update Screen component dimensions
 * 2. Resize the double buffer
 * 3. Invalidate all layouts
 * 4. Mark all entities dirty
 * 5. Emit a resize event
 *
 * @param world - The ECS world
 * @returns A resize handler state object
 *
 * @example
 * ```typescript
 * import { createResizeHandler, enableResizeHandling } from 'blecsd';
 *
 * const handler = createResizeHandler(world);
 * enableResizeHandling(program, handler);
 * ```
 */
export function createResizeHandler(world: World): ResizeHandlerState {
	// Get initial dimensions from screen
	const screen = getScreen(world);
	let lastWidth = 80;
	let lastHeight = 24;

	if (screen) {
		const size = getScreenSize(world, screen);
		if (size) {
			lastWidth = size.width;
			lastHeight = size.height;
		}
	}

	const handler: ResizeHandler = (event: ResizeEvent) => {
		handleResize(world, event.cols, event.rows, state);
	};

	const state: ResizeHandlerState = {
		world,
		lastWidth,
		lastHeight,
		handler,
	};

	activeHandlers.set(world, state);
	return state;
}

/**
 * Internal resize handling logic.
 */
function handleResize(
	world: World,
	newWidth: number,
	newHeight: number,
	state: ResizeHandlerState,
): void {
	// Skip if dimensions haven't changed
	if (newWidth === state.lastWidth && newHeight === state.lastHeight) {
		return;
	}

	const previousWidth = state.lastWidth;
	const previousHeight = state.lastHeight;

	// Update state
	state.lastWidth = newWidth;
	state.lastHeight = newHeight;

	// 1. Update Screen component dimensions
	const screen = getScreen(world);
	if (screen) {
		resizeScreen(world, screen, newWidth, newHeight);
	}

	// 2. Resize the double buffer
	const db = getOutputBuffer();
	if (db) {
		const newDb = resizeDoubleBuffer(db, newWidth, newHeight);
		setOutputBuffer(newDb);
	}

	// 3. Invalidate all layouts
	invalidateAllLayouts(world);

	// 4. Mark all entities dirty
	markAllDirty(world);

	// 5. Emit resize event
	const bus = getResizeEventBus();
	bus.emit('resize', {
		width: newWidth,
		height: newHeight,
		previousWidth,
		previousHeight,
	});
}

/**
 * Enables resize handling on a program.
 *
 * @param program - The terminal program
 * @param state - The resize handler state from createResizeHandler
 *
 * @example
 * ```typescript
 * const handler = createResizeHandler(world);
 * enableResizeHandling(program, handler);
 * ```
 */
export function enableResizeHandling(program: Program, state: ResizeHandlerState): void {
	program.on('resize', state.handler);
}

/**
 * Disables resize handling on a program.
 *
 * @param program - The terminal program
 * @param state - The resize handler state from createResizeHandler
 *
 * @example
 * ```typescript
 * disableResizeHandling(program, handler);
 * ```
 */
export function disableResizeHandling(program: Program, state: ResizeHandlerState): void {
	program.off('resize', state.handler);
	activeHandlers.delete(state.world);
}

/**
 * Gets the active resize handler for a world.
 *
 * @param world - The ECS world
 * @returns The resize handler state, or undefined if not set up
 */
export function getResizeHandler(world: World): ResizeHandlerState | undefined {
	return activeHandlers.get(world);
}

/**
 * Manually triggers a resize handling.
 * Useful for testing or when terminal size is obtained externally.
 *
 * @param world - The ECS world
 * @param width - New width
 * @param height - New height
 *
 * @example
 * ```typescript
 * // Handle resize from external source
 * triggerResize(world, process.stdout.columns, process.stdout.rows);
 * ```
 */
export function triggerResize(world: World, width: number, height: number): void {
	const state = activeHandlers.get(world);
	if (state) {
		handleResize(world, width, height, state);
	} else {
		// Create temporary state for one-time resize
		const screen = getScreen(world);
		let lastWidth = 80;
		let lastHeight = 24;

		if (screen) {
			const size = getScreenSize(world, screen);
			if (size) {
				lastWidth = size.width;
				lastHeight = size.height;
			}
		}

		const tempState: ResizeHandlerState = {
			world,
			lastWidth,
			lastHeight,
			handler: () => {},
		};

		handleResize(world, width, height, tempState);
	}
}

/**
 * Sets up SIGWINCH signal handler for resize detection.
 * This is an alternative to Program-based resize handling.
 *
 * @param world - The ECS world
 * @returns Cleanup function to remove the handler
 *
 * @example
 * ```typescript
 * const cleanup = setupSigwinchHandler(world);
 *
 * // When done
 * cleanup();
 * ```
 */
export function setupSigwinchHandler(world: World): () => void {
	const handler = (): void => {
		const cols = process.stdout.columns ?? 80;
		const rows = process.stdout.rows ?? 24;
		triggerResize(world, cols, rows);
	};

	process.on('SIGWINCH', handler);

	return () => {
		process.off('SIGWINCH', handler);
	};
}

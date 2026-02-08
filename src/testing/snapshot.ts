/**
 * Snapshot testing utilities for visual regression testing.
 *
 * Provides helpers to render entities to strings and compare against
 * Vitest inline snapshots for visual regression detection.
 *
 * @module testing/snapshot
 *
 * @example
 * ```typescript
 * import { renderToString, renderEntityToString, createTestBuffer } from 'blecsd/testing';
 *
 * const { world, db } = createTestBuffer(40, 10);
 * const entity = addEntity(world);
 * setPosition(world, entity, 0, 0);
 * setDimensions(world, entity, 10, 3);
 * setStyle(world, entity, { bg: '#ff0000' });
 *
 * layoutSystem(world);
 * renderSystem(world);
 *
 * const text = renderToString(db);
 * expect(text).toMatchSnapshot();
 * ```
 */

import { setDimensions } from '../components/dimensions';
import { setPosition } from '../components/position';
import { setStyle } from '../components/renderable';
import { createDirtyTracker, type DirtyTracker } from '../core/dirtyTracking';
import { addEntity, createWorld } from '../core/ecs';
import { createScreenEntity } from '../core/entities';
import type { Entity, World } from '../core/types';
import { layoutSystem } from '../systems/layoutSystem';
import { clearRenderBuffer, renderSystem, setRenderBuffer } from '../systems/renderSystem';
import { createScreenBuffer, getCell, type ScreenBufferData } from '../terminal/screen/cell';
import type { Screenshot } from '../terminal/screen/screenshot';
import { captureRegion, captureScreen, screenshotToText } from '../terminal/screen/screenshot';

/**
 * Result from createTestBuffer — contains all objects needed for render testing.
 */
export interface TestBufferContext {
	/** The ECS world */
	readonly world: World;
	/** The dirty tracker for rendering */
	readonly tracker: DirtyTracker;
	/** The screen buffer for rendering */
	readonly buffer: ScreenBufferData;
	/** The screen entity ID */
	readonly screenEid: Entity;
}

/**
 * Creates a test buffer context with world, double buffer, and screen entity.
 *
 * Sets up all the infrastructure needed for snapshot testing:
 * a world, a screen entity, and a double buffer registered as the render target.
 *
 * @param width - Buffer width in columns
 * @param height - Buffer height in rows
 * @returns A TestBufferContext ready for rendering
 *
 * @example
 * ```typescript
 * import { createTestBuffer } from 'blecsd/testing';
 *
 * const { world, buffer } = createTestBuffer(40, 10);
 * ```
 */
export function createTestBuffer(width: number, height: number): TestBufferContext {
	const world = createWorld() as World;
	const screenEid = createScreenEntity(world, { width, height });
	const tracker = createDirtyTracker(width, height);
	const buffer = createScreenBuffer(width, height);
	setRenderBuffer(tracker, buffer);
	return { world, tracker, buffer, screenEid };
}

/**
 * Renders the current buffer state to a plain text string.
 *
 * Captures the buffer as a screenshot and converts it to text,
 * trimming trailing whitespace per line and trailing empty lines.
 *
 * @param buffer - The screen buffer to capture
 * @returns Plain text representation of the buffer
 *
 * @example
 * ```typescript
 * import { createTestBuffer, renderToString } from 'blecsd/testing';
 *
 * const { world, buffer } = createTestBuffer(40, 10);
 * // ... set up entities, run layout + render ...
 *
 * const text = renderToString(buffer);
 * expect(text).toMatchSnapshot();
 * ```
 */
export function renderToString(buffer: ScreenBufferData): string {
	const screenshot = captureScreen(buffer);
	const text = screenshotToText(screenshot);
	// Trim trailing empty lines
	const lines = text.split('\n');
	while (lines.length > 0 && lines[lines.length - 1]?.trim() === '') {
		lines.pop();
	}
	return lines.join('\n');
}

/**
 * Renders a specific region of the buffer to a plain text string.
 *
 * @param buffer - The screen buffer to capture
 * @param x - Left edge column
 * @param y - Top edge row
 * @param width - Width to capture
 * @param height - Height to capture
 * @returns Plain text representation of the region
 *
 * @example
 * ```typescript
 * import { createTestBuffer, renderRegionToString } from 'blecsd/testing';
 *
 * const { world, buffer } = createTestBuffer(80, 24);
 * // ... render ...
 *
 * const region = renderRegionToString(buffer, 10, 5, 20, 10);
 * expect(region).toMatchSnapshot();
 * ```
 */
export function renderRegionToString(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	height: number,
): string {
	const screenshot = captureRegion(buffer, x, y, width, height);
	return screenshotToText(screenshot);
}

/**
 * Captures a Screenshot from the current buffer state.
 *
 * @param buffer - The screen buffer to capture
 * @returns A Screenshot object for comparison or serialization
 *
 * @example
 * ```typescript
 * import { createTestBuffer, captureTestScreen } from 'blecsd/testing';
 *
 * const { world, buffer } = createTestBuffer(40, 10);
 * // ... render ...
 *
 * const screenshot = captureTestScreen(buffer);
 * expect(screenshot.width).toBe(40);
 * ```
 */
export function captureTestScreen(buffer: ScreenBufferData): Screenshot {
	return captureScreen(buffer);
}

/**
 * Gets the text content of a specific row from the buffer.
 *
 * @param buffer - The screen buffer
 * @param row - Row index (0-based)
 * @returns The text content of the row, trimmed
 *
 * @example
 * ```typescript
 * const row = getRowText(buffer, 0);
 * expect(row).toBe('Hello World');
 * ```
 */
export function getRowText(buffer: ScreenBufferData, row: number): string {
	let text = '';
	for (let x = 0; x < buffer.width; x++) {
		const cell = getCell(buffer, x, row);
		text += cell?.char ?? ' ';
	}
	return text.trimEnd();
}

/**
 * Gets the foreground color of a cell in the buffer.
 *
 * @param buffer - The screen buffer
 * @param x - Column
 * @param y - Row
 * @returns The packed RGBA foreground color, or undefined if out of bounds
 */
export function getCellFg(buffer: ScreenBufferData, x: number, y: number): number | undefined {
	return getCell(buffer, x, y)?.fg;
}

/**
 * Gets the background color of a cell in the buffer.
 *
 * @param buffer - The screen buffer
 * @param x - Column
 * @param y - Row
 * @returns The packed RGBA background color, or undefined if out of bounds
 */
export function getCellBg(buffer: ScreenBufferData, x: number, y: number): number | undefined {
	return getCell(buffer, x, y)?.bg;
}

/**
 * Gets the character at a specific cell in the buffer.
 *
 * @param buffer - The screen buffer
 * @param x - Column
 * @param y - Row
 * @returns The character, or undefined if out of bounds
 */
export function getCellChar(buffer: ScreenBufferData, x: number, y: number): string | undefined {
	return getCell(buffer, x, y)?.char;
}

/**
 * Creates a simple entity with position, dimensions, and style, then runs layout + render.
 *
 * Convenience function for snapshot tests that need a single rendered entity.
 *
 * @param ctx - The test buffer context
 * @param x - X position
 * @param y - Y position
 * @param width - Width in cells
 * @param height - Height in cells
 * @param options - Optional style overrides
 * @returns The entity ID
 *
 * @example
 * ```typescript
 * const { world, db } = createTestBuffer(40, 10);
 * const eid = renderBox(ctx, 5, 2, 10, 3, { bg: '#ff0000' });
 * const text = renderToString(db);
 * ```
 */
export function renderBox(
	ctx: TestBufferContext,
	x: number,
	y: number,
	width: number,
	height: number,
	options?: { fg?: string; bg?: string },
): Entity {
	const entity = addEntity(ctx.world);
	setPosition(ctx.world, entity, x, y);
	setDimensions(ctx.world, entity, width, height);
	if (options) {
		setStyle(ctx.world, entity, options);
	}
	return entity;
}

/**
 * Runs layout and render systems on the world.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * const { world, db } = createTestBuffer(40, 10);
 * // ... add entities ...
 * runRender(world);
 * const text = renderToString(db);
 * ```
 */
export function runRender(world: World): void {
	layoutSystem(world);
	renderSystem(world);
}

/**
 * Cleans up the test render buffer.
 * Call this in afterEach() to avoid leaking state between tests.
 *
 * @example
 * ```typescript
 * afterEach(() => {
 *   cleanupTestBuffer();
 * });
 * ```
 */
export function cleanupTestBuffer(): void {
	clearRenderBuffer();
}

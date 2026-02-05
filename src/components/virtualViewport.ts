/**
 * VirtualViewport Component for Viewport Windowing
 *
 * ECS component that tracks which portion of a large dataset is currently visible.
 * Works with VirtualizedLineStore for text, or any other indexed content.
 *
 * @module components/virtualViewport
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setVirtualViewport, scrollToLine, getVisibleRange } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Configure viewport for a list with 1000 items
 * setVirtualViewport(world, entity, {
 *   totalLineCount: 1000,
 *   visibleLineCount: 25,
 *   overscanBefore: 5,
 *   overscanAfter: 5,
 * });
 *
 * // Scroll to line 500
 * scrollToLine(world, entity, 500);
 *
 * // Get visible range (includes overscan)
 * const range = getVisibleRange(world, entity);
 * // range = { start: 495, end: 530 }
 * ```
 */

import { z } from 'zod';
import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/** Default overscan lines before viewport */
const DEFAULT_OVERSCAN_BEFORE = 5;

/** Default overscan lines after viewport */
const DEFAULT_OVERSCAN_AFTER = 5;

/** Default estimated line height in rows */
const DEFAULT_LINE_HEIGHT = 1;

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Schema for VirtualViewport configuration options.
 *
 * @example
 * ```typescript
 * import { VirtualViewportOptionsSchema } from 'blecsd';
 *
 * const options = VirtualViewportOptionsSchema.parse({
 *   totalLineCount: 10000,
 *   visibleLineCount: 25,
 *   overscanBefore: 5,
 * });
 * ```
 */
export const VirtualViewportOptionsSchema = z.object({
	/** First visible line index */
	firstVisibleLine: z.number().int().nonnegative().optional(),
	/** Number of visible lines */
	visibleLineCount: z.number().int().nonnegative().optional(),
	/** Total line count in content */
	totalLineCount: z.number().int().nonnegative().optional(),
	/** Overscan lines before viewport (0-255) */
	overscanBefore: z.number().int().min(0).max(255).optional(),
	/** Overscan lines after viewport (0-255) */
	overscanAfter: z.number().int().min(0).max(255).optional(),
	/** Estimated line height (1-255) */
	estimatedLineHeight: z.number().int().min(1).max(255).optional(),
	/** Whether lines have variable height */
	isVariableHeight: z.boolean().optional(),
	/** Selected line index (-1 for none) */
	selectedLine: z.number().int().min(-1).optional(),
	/** Cursor line index (-1 for none) */
	cursorLine: z.number().int().min(-1).optional(),
});

/**
 * Schema for visible range output.
 */
export const VisibleRangeSchema = z.object({
	start: z.number().int().nonnegative(),
	end: z.number().int().nonnegative(),
	visibleStart: z.number().int().nonnegative(),
	visibleEnd: z.number().int().nonnegative(),
	count: z.number().int().nonnegative(),
});

/**
 * Schema for scroll info output.
 */
export const ScrollInfoSchema = z.object({
	currentLine: z.number().int().nonnegative(),
	totalLines: z.number().int().nonnegative(),
	viewportSize: z.number().int().nonnegative(),
	maxScrollLine: z.number().int().nonnegative(),
	scrollPercent: z.number().min(0).max(100),
	atTop: z.boolean(),
	atBottom: z.boolean(),
});

// =============================================================================
// COMPONENT DEFINITION
// =============================================================================

/**
 * VirtualViewport component store using SoA (Structure of Arrays).
 *
 * Tracks viewport windowing for virtualized content rendering.
 * Only the visible portion (plus overscan) should be rendered.
 */
export const VirtualViewport = {
	/** First visible line index in the viewport */
	firstVisibleLine: new Uint32Array(DEFAULT_CAPACITY),
	/** Number of lines visible in the viewport */
	visibleLineCount: new Uint32Array(DEFAULT_CAPACITY),
	/** Total number of lines in the content */
	totalLineCount: new Uint32Array(DEFAULT_CAPACITY),
	/** Extra lines to render above viewport for smooth scrolling */
	overscanBefore: new Uint8Array(DEFAULT_CAPACITY),
	/** Extra lines to render below viewport for smooth scrolling */
	overscanAfter: new Uint8Array(DEFAULT_CAPACITY),
	/** Estimated height of each line in rows (for variable height estimation) */
	estimatedLineHeight: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether lines have variable height (0=fixed, 1=variable) */
	isVariableHeight: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether viewport needs re-render (dirty flag) */
	isDirty: new Uint8Array(DEFAULT_CAPACITY),
	/** Selected line index (-1 = none) using Int32 to allow -1 */
	selectedLine: new Int32Array(DEFAULT_CAPACITY),
	/** Cursor line for interactive lists (-1 = none) */
	cursorLine: new Int32Array(DEFAULT_CAPACITY),
};

// =============================================================================
// TYPES
// =============================================================================

/**
 * Configuration options for VirtualViewport.
 */
export interface VirtualViewportOptions {
	/** First visible line index */
	firstVisibleLine?: number;
	/** Number of visible lines */
	visibleLineCount?: number;
	/** Total line count in content */
	totalLineCount?: number;
	/** Overscan lines before viewport */
	overscanBefore?: number;
	/** Overscan lines after viewport */
	overscanAfter?: number;
	/** Estimated line height (for variable height) */
	estimatedLineHeight?: number;
	/** Whether lines have variable height */
	isVariableHeight?: boolean;
	/** Selected line index */
	selectedLine?: number;
	/** Cursor line index */
	cursorLine?: number;
}

/**
 * Visible range including overscan.
 */
export interface VisibleRange {
	/** Start line index (with overscan) */
	readonly start: number;
	/** End line index (exclusive, with overscan) */
	readonly end: number;
	/** First actually visible line (without overscan) */
	readonly visibleStart: number;
	/** Last actually visible line (exclusive, without overscan) */
	readonly visibleEnd: number;
	/** Total lines in range */
	readonly count: number;
}

/**
 * Full viewport data.
 */
export interface VirtualViewportData {
	readonly firstVisibleLine: number;
	readonly visibleLineCount: number;
	readonly totalLineCount: number;
	readonly overscanBefore: number;
	readonly overscanAfter: number;
	readonly estimatedLineHeight: number;
	readonly isVariableHeight: boolean;
	readonly isDirty: boolean;
	readonly selectedLine: number;
	readonly cursorLine: number;
}

/**
 * Scroll position info.
 */
export interface ScrollInfo {
	/** Current line */
	readonly currentLine: number;
	/** Total lines */
	readonly totalLines: number;
	/** Viewport size */
	readonly viewportSize: number;
	/** Maximum scrollable line */
	readonly maxScrollLine: number;
	/** Scroll percentage (0-100) */
	readonly scrollPercent: number;
	/** Whether at top */
	readonly atTop: boolean;
	/** Whether at bottom */
	readonly atBottom: boolean;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Initializes VirtualViewport with defaults.
 */
function initVirtualViewport(eid: Entity): void {
	VirtualViewport.firstVisibleLine[eid] = 0;
	VirtualViewport.visibleLineCount[eid] = 0;
	VirtualViewport.totalLineCount[eid] = 0;
	VirtualViewport.overscanBefore[eid] = DEFAULT_OVERSCAN_BEFORE;
	VirtualViewport.overscanAfter[eid] = DEFAULT_OVERSCAN_AFTER;
	VirtualViewport.estimatedLineHeight[eid] = DEFAULT_LINE_HEIGHT;
	VirtualViewport.isVariableHeight[eid] = 0;
	VirtualViewport.isDirty[eid] = 1;
	VirtualViewport.selectedLine[eid] = -1;
	VirtualViewport.cursorLine[eid] = -1;
}

/**
 * Ensures entity has VirtualViewport component.
 */
function ensureVirtualViewport(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, VirtualViewport)) {
		addComponent(world, eid, VirtualViewport);
		initVirtualViewport(eid);
	}
}

/**
 * Clamps first visible line to valid bounds.
 */
function clampFirstVisibleLine(eid: Entity): void {
	const total = VirtualViewport.totalLineCount[eid] as number;
	const visible = VirtualViewport.visibleLineCount[eid] as number;
	const current = VirtualViewport.firstVisibleLine[eid] as number;

	const maxFirst = Math.max(0, total - visible);
	VirtualViewport.firstVisibleLine[eid] = Math.max(0, Math.min(maxFirst, current));
}

/**
 * Marks viewport as dirty.
 */
function markDirty(eid: Entity): void {
	VirtualViewport.isDirty[eid] = 1;
}

// =============================================================================
// PUBLIC API - SETUP
// =============================================================================

/**
 * Sets up a VirtualViewport on an entity.
 * Input is validated against VirtualViewportOptionsSchema.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Viewport configuration
 * @returns The entity ID for chaining
 * @throws {z.ZodError} If options are invalid
 *
 * @example
 * ```typescript
 * setVirtualViewport(world, entity, {
 *   totalLineCount: 10000,
 *   visibleLineCount: 25,
 * });
 * ```
 */
export function setVirtualViewport(
	world: World,
	eid: Entity,
	options: VirtualViewportOptions,
): Entity {
	// Validate options
	const validated = VirtualViewportOptionsSchema.parse(options);

	ensureVirtualViewport(world, eid);

	if (validated.totalLineCount !== undefined) {
		VirtualViewport.totalLineCount[eid] = validated.totalLineCount;
	}
	if (validated.visibleLineCount !== undefined) {
		VirtualViewport.visibleLineCount[eid] = validated.visibleLineCount;
	}
	if (validated.firstVisibleLine !== undefined) {
		VirtualViewport.firstVisibleLine[eid] = validated.firstVisibleLine;
	}
	if (validated.overscanBefore !== undefined) {
		VirtualViewport.overscanBefore[eid] = validated.overscanBefore;
	}
	if (validated.overscanAfter !== undefined) {
		VirtualViewport.overscanAfter[eid] = validated.overscanAfter;
	}
	if (validated.estimatedLineHeight !== undefined) {
		VirtualViewport.estimatedLineHeight[eid] = validated.estimatedLineHeight;
	}
	if (validated.isVariableHeight !== undefined) {
		VirtualViewport.isVariableHeight[eid] = validated.isVariableHeight ? 1 : 0;
	}
	if (validated.selectedLine !== undefined) {
		VirtualViewport.selectedLine[eid] = validated.selectedLine;
	}
	if (validated.cursorLine !== undefined) {
		VirtualViewport.cursorLine[eid] = validated.cursorLine;
	}

	clampFirstVisibleLine(eid);
	markDirty(eid);

	return eid;
}

/**
 * Gets VirtualViewport data for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Viewport data or undefined if no component
 */
export function getVirtualViewport(world: World, eid: Entity): VirtualViewportData | undefined {
	if (!hasComponent(world, eid, VirtualViewport)) {
		return undefined;
	}

	return {
		firstVisibleLine: VirtualViewport.firstVisibleLine[eid] as number,
		visibleLineCount: VirtualViewport.visibleLineCount[eid] as number,
		totalLineCount: VirtualViewport.totalLineCount[eid] as number,
		overscanBefore: VirtualViewport.overscanBefore[eid] as number,
		overscanAfter: VirtualViewport.overscanAfter[eid] as number,
		estimatedLineHeight: VirtualViewport.estimatedLineHeight[eid] as number,
		isVariableHeight: VirtualViewport.isVariableHeight[eid] === 1,
		isDirty: VirtualViewport.isDirty[eid] === 1,
		selectedLine: VirtualViewport.selectedLine[eid] as number,
		cursorLine: VirtualViewport.cursorLine[eid] as number,
	};
}

/**
 * Checks if entity has VirtualViewport.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if has component
 */
export function hasVirtualViewport(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, VirtualViewport);
}

// =============================================================================
// PUBLIC API - VIEWPORT POSITION
// =============================================================================

/**
 * Sets the first visible line (viewport start).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param lineIndex - Line index to scroll to
 * @returns The entity ID for chaining
 */
export function setViewportStart(world: World, eid: Entity, lineIndex: number): Entity {
	ensureVirtualViewport(world, eid);
	VirtualViewport.firstVisibleLine[eid] = lineIndex;
	clampFirstVisibleLine(eid);
	markDirty(eid);
	return eid;
}

/**
 * Gets the visible range including overscan.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Visible range or undefined if no component
 *
 * @example
 * ```typescript
 * const range = getVisibleRange(world, entity);
 * // Render lines from range.start to range.end
 * const lines = getLineRange(store, range.start, range.end);
 * ```
 */
export function getVisibleRange(world: World, eid: Entity): VisibleRange | undefined {
	if (!hasComponent(world, eid, VirtualViewport)) {
		return undefined;
	}

	const firstVisible = VirtualViewport.firstVisibleLine[eid] as number;
	const visibleCount = VirtualViewport.visibleLineCount[eid] as number;
	const total = VirtualViewport.totalLineCount[eid] as number;
	const overscanBefore = VirtualViewport.overscanBefore[eid] as number;
	const overscanAfter = VirtualViewport.overscanAfter[eid] as number;

	const visibleEnd = Math.min(total, firstVisible + visibleCount);

	const start = Math.max(0, firstVisible - overscanBefore);
	const end = Math.min(total, visibleEnd + overscanAfter);

	return {
		start,
		end,
		visibleStart: firstVisible,
		visibleEnd,
		count: end - start,
	};
}

/**
 * Checks if a line is currently visible (in viewport, not just overscan).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param lineIndex - Line index to check
 * @returns true if line is visible
 */
export function isLineVisible(world: World, eid: Entity, lineIndex: number): boolean {
	if (!hasComponent(world, eid, VirtualViewport)) {
		return false;
	}

	const firstVisible = VirtualViewport.firstVisibleLine[eid] as number;
	const visibleCount = VirtualViewport.visibleLineCount[eid] as number;

	return lineIndex >= firstVisible && lineIndex < firstVisible + visibleCount;
}

/**
 * Checks if a line is in the render range (visible + overscan).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param lineIndex - Line index to check
 * @returns true if line should be rendered
 */
export function isLineInRenderRange(world: World, eid: Entity, lineIndex: number): boolean {
	const range = getVisibleRange(world, eid);
	if (!range) {
		return false;
	}

	return lineIndex >= range.start && lineIndex < range.end;
}

// =============================================================================
// PUBLIC API - SCROLLING
// =============================================================================

/**
 * Scrolls to a specific line, centering it if possible.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param lineIndex - Target line index
 * @returns The entity ID for chaining
 */
export function scrollToLine(world: World, eid: Entity, lineIndex: number): Entity {
	ensureVirtualViewport(world, eid);

	const visibleCount = VirtualViewport.visibleLineCount[eid] as number;

	// Center the line in viewport
	const newFirst = Math.max(0, lineIndex - Math.floor(visibleCount / 2));
	VirtualViewport.firstVisibleLine[eid] = newFirst;

	clampFirstVisibleLine(eid);
	markDirty(eid);

	return eid;
}

/**
 * Scrolls by a number of lines.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param delta - Lines to scroll (positive = down, negative = up)
 * @returns The entity ID for chaining
 */
export function scrollByLines(world: World, eid: Entity, delta: number): Entity {
	ensureVirtualViewport(world, eid);

	const current = VirtualViewport.firstVisibleLine[eid] as number;
	const total = VirtualViewport.totalLineCount[eid] as number;
	const visible = VirtualViewport.visibleLineCount[eid] as number;

	// Calculate new position in JS numbers (signed) before storing to Uint32
	const newValue = current + delta;
	const maxFirst = Math.max(0, total - visible);

	// Clamp and store
	VirtualViewport.firstVisibleLine[eid] = Math.max(0, Math.min(maxFirst, newValue));

	markDirty(eid);

	return eid;
}

/**
 * Scrolls by pages.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param pages - Pages to scroll (positive = down, negative = up)
 * @returns The entity ID for chaining
 */
export function scrollByPages(world: World, eid: Entity, pages: number): Entity {
	ensureVirtualViewport(world, eid);

	const visibleCount = VirtualViewport.visibleLineCount[eid] as number;
	const delta = pages * Math.max(1, visibleCount - 1); // Leave 1 line overlap

	return scrollByLines(world, eid, delta);
}

/**
 * Scrolls to the top.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function scrollToTop(world: World, eid: Entity): Entity {
	return setViewportStart(world, eid, 0);
}

/**
 * Scrolls to the bottom.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function scrollToBottom(world: World, eid: Entity): Entity {
	ensureVirtualViewport(world, eid);

	const total = VirtualViewport.totalLineCount[eid] as number;
	const visible = VirtualViewport.visibleLineCount[eid] as number;

	VirtualViewport.firstVisibleLine[eid] = Math.max(0, total - visible);
	markDirty(eid);

	return eid;
}

/**
 * Gets scroll information.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Scroll info or undefined if no component
 */
export function getScrollInfo(world: World, eid: Entity): ScrollInfo | undefined {
	if (!hasComponent(world, eid, VirtualViewport)) {
		return undefined;
	}

	const current = VirtualViewport.firstVisibleLine[eid] as number;
	const total = VirtualViewport.totalLineCount[eid] as number;
	const visible = VirtualViewport.visibleLineCount[eid] as number;

	const maxScroll = Math.max(0, total - visible);
	const percent = maxScroll > 0 ? (current / maxScroll) * 100 : 0;

	return {
		currentLine: current,
		totalLines: total,
		viewportSize: visible,
		maxScrollLine: maxScroll,
		scrollPercent: Math.min(100, Math.max(0, percent)),
		atTop: current <= 0,
		atBottom: current >= maxScroll,
	};
}

// =============================================================================
// PUBLIC API - CONTENT UPDATES
// =============================================================================

/**
 * Updates the total line count (when content changes).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param totalLines - New total line count
 * @returns The entity ID for chaining
 */
export function setTotalLineCount(world: World, eid: Entity, totalLines: number): Entity {
	ensureVirtualViewport(world, eid);
	VirtualViewport.totalLineCount[eid] = totalLines;
	clampFirstVisibleLine(eid);
	markDirty(eid);
	return eid;
}

/**
 * Updates the viewport size (when container resizes).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param visibleLines - New visible line count
 * @returns The entity ID for chaining
 */
export function setVisibleLineCount(world: World, eid: Entity, visibleLines: number): Entity {
	ensureVirtualViewport(world, eid);
	VirtualViewport.visibleLineCount[eid] = visibleLines;
	clampFirstVisibleLine(eid);
	markDirty(eid);
	return eid;
}

/**
 * Sets overscan values.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param before - Lines to render before viewport
 * @param after - Lines to render after viewport
 * @returns The entity ID for chaining
 */
export function setOverscan(world: World, eid: Entity, before: number, after: number): Entity {
	ensureVirtualViewport(world, eid);
	VirtualViewport.overscanBefore[eid] = before;
	VirtualViewport.overscanAfter[eid] = after;
	markDirty(eid);
	return eid;
}

// =============================================================================
// PUBLIC API - SELECTION / CURSOR (for interactive lists)
// =============================================================================

/**
 * Sets the selected line.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param lineIndex - Selected line (-1 for none)
 * @returns The entity ID for chaining
 */
export function setSelectedLine(world: World, eid: Entity, lineIndex: number): Entity {
	ensureVirtualViewport(world, eid);
	VirtualViewport.selectedLine[eid] = lineIndex;
	markDirty(eid);
	return eid;
}

/**
 * Gets the selected line.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Selected line index or -1 if none
 */
export function getSelectedLine(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, VirtualViewport)) {
		return -1;
	}
	return VirtualViewport.selectedLine[eid] as number;
}

/**
 * Sets the cursor line (for keyboard navigation).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param lineIndex - Cursor line (-1 for none)
 * @returns The entity ID for chaining
 */
export function setCursorLine(world: World, eid: Entity, lineIndex: number): Entity {
	ensureVirtualViewport(world, eid);
	VirtualViewport.cursorLine[eid] = lineIndex;
	markDirty(eid);
	return eid;
}

/**
 * Gets the cursor line.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Cursor line index or -1 if none
 */
export function getCursorLine(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, VirtualViewport)) {
		return -1;
	}
	return VirtualViewport.cursorLine[eid] as number;
}

/**
 * Moves cursor up/down and auto-scrolls to keep it visible.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param delta - Lines to move (negative = up, positive = down)
 * @returns The entity ID for chaining
 */
export function moveCursor(world: World, eid: Entity, delta: number): Entity {
	ensureVirtualViewport(world, eid);

	const total = VirtualViewport.totalLineCount[eid] as number;
	const cursor = VirtualViewport.cursorLine[eid] as number;

	// If no cursor, start at 0
	const currentCursor = cursor < 0 ? 0 : cursor;
	const newCursor = Math.max(0, Math.min(total - 1, currentCursor + delta));

	VirtualViewport.cursorLine[eid] = newCursor;

	// Auto-scroll to keep cursor visible
	ensureCursorVisible(world, eid);

	markDirty(eid);
	return eid;
}

/**
 * Ensures the cursor is visible, scrolling if needed.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function ensureCursorVisible(world: World, eid: Entity): Entity {
	if (!hasComponent(world, eid, VirtualViewport)) {
		return eid;
	}

	const cursor = VirtualViewport.cursorLine[eid] as number;
	if (cursor < 0) {
		return eid;
	}

	const firstVisible = VirtualViewport.firstVisibleLine[eid] as number;
	const visibleCount = VirtualViewport.visibleLineCount[eid] as number;

	// Scroll up if cursor is above viewport
	if (cursor < firstVisible) {
		VirtualViewport.firstVisibleLine[eid] = cursor;
		markDirty(eid);
	}

	// Scroll down if cursor is below viewport
	const lastVisible = firstVisible + visibleCount - 1;
	if (cursor > lastVisible) {
		VirtualViewport.firstVisibleLine[eid] = cursor - visibleCount + 1;
		clampFirstVisibleLine(eid);
		markDirty(eid);
	}

	return eid;
}

// =============================================================================
// PUBLIC API - DIRTY FLAG
// =============================================================================

/**
 * Checks if viewport needs re-render.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if dirty
 */
export function isViewportDirty(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, VirtualViewport)) {
		return false;
	}
	return VirtualViewport.isDirty[eid] === 1;
}

/**
 * Clears the dirty flag after rendering.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function clearViewportDirty(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, VirtualViewport)) {
		VirtualViewport.isDirty[eid] = 0;
	}
	return eid;
}

/**
 * Forces viewport to be dirty (triggers re-render).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function invalidateViewport(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, VirtualViewport)) {
		VirtualViewport.isDirty[eid] = 1;
	}
	return eid;
}

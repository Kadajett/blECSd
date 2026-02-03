/**
 * Render system for drawing entities to the screen buffer.
 * Runs in the RENDER phase after layout computation.
 * @module systems/renderSystem
 */

import { hasComponent, query } from 'bitecs';
import { Border, BorderType, getBorder, hasBorderVisible } from '../components/border';
// getChildren reserved for future tree-based rendering mode
// import { getChildren } from '../components/hierarchy';
import { Position } from '../components/position';
import {
	getStyle,
	isDirty,
	isEffectivelyVisible,
	markClean,
	Renderable,
} from '../components/renderable';
import type { Entity, System, World } from '../core/types';
import type { Cell, ScreenBufferData } from '../terminal/screen/cell';
import { Attr, createCell, fillRect, setCell, writeString } from '../terminal/screen/cell';
import type { DoubleBufferData } from '../terminal/screen/doubleBuffer';
import { getBackBuffer, markDirtyRegion } from '../terminal/screen/doubleBuffer';
import { ComputedLayout, hasComputedLayout } from './layoutSystem';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Render context passed to render functions.
 */
export interface RenderContext {
	/** The ECS world */
	readonly world: World;
	/** The screen buffer to render to */
	readonly buffer: ScreenBufferData;
	/** The double buffer for dirty tracking */
	readonly doubleBuffer: DoubleBufferData;
}

/**
 * Computed bounds for an entity.
 */
interface EntityBounds {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Entity with z-index for sorting.
 */
interface SortedEntity {
	readonly eid: Entity;
	readonly z: number;
}

// =============================================================================
// RENDER HELPER FUNCTIONS
// =============================================================================

/**
 * Converts Renderable style to Cell attributes.
 */
function styleToAttrs(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, Renderable)) {
		return Attr.NONE;
	}

	let attrs = Attr.NONE;
	if (Renderable.bold[eid] === 1) attrs |= Attr.BOLD;
	if (Renderable.underline[eid] === 1) attrs |= Attr.UNDERLINE;
	if (Renderable.blink[eid] === 1) attrs |= Attr.BLINK;
	if (Renderable.inverse[eid] === 1) attrs |= Attr.INVERSE;

	return attrs;
}

/**
 * Gets entity bounds from ComputedLayout.
 */
function getEntityBounds(world: World, eid: Entity): EntityBounds | undefined {
	if (!hasComputedLayout(world, eid)) {
		return undefined;
	}

	return {
		x: ComputedLayout.x[eid] as number,
		y: ComputedLayout.y[eid] as number,
		width: ComputedLayout.width[eid] as number,
		height: ComputedLayout.height[eid] as number,
	};
}

/**
 * Gets border thickness for each side.
 */
function getBorderThickness(
	world: World,
	eid: Entity,
): { top: number; right: number; bottom: number; left: number } {
	if (!hasBorderVisible(world, eid)) {
		return { top: 0, right: 0, bottom: 0, left: 0 };
	}

	return {
		top: Border.top[eid] === 1 ? 1 : 0,
		right: Border.right[eid] === 1 ? 1 : 0,
		bottom: Border.bottom[eid] === 1 ? 1 : 0,
		left: Border.left[eid] === 1 ? 1 : 0,
	};
}

/**
 * Gets the content area (bounds minus border).
 */
function getContentBounds(
	bounds: EntityBounds,
	borderThickness: { top: number; right: number; bottom: number; left: number },
): EntityBounds {
	return {
		x: bounds.x + borderThickness.left,
		y: bounds.y + borderThickness.top,
		width: Math.max(0, bounds.width - borderThickness.left - borderThickness.right),
		height: Math.max(0, bounds.height - borderThickness.top - borderThickness.bottom),
	};
}

// =============================================================================
// RENDER FUNCTIONS
// =============================================================================

/**
 * Renders the background fill for an entity.
 *
 * @param ctx - Render context
 * @param eid - Entity ID
 * @param bounds - Entity bounds
 *
 * @example
 * ```typescript
 * import { renderBackground } from 'blecsd';
 *
 * renderBackground(ctx, entity, bounds);
 * ```
 */
export function renderBackground(ctx: RenderContext, eid: Entity, bounds: EntityBounds): void {
	const { world, buffer } = ctx;

	const style = getStyle(world, eid);
	if (!style) {
		return;
	}

	// Skip if transparent background
	if (style.transparent) {
		return;
	}

	const attrs = styleToAttrs(world, eid);
	const cell = createCell(' ', style.fg, style.bg, attrs);

	fillRect(buffer, bounds.x, bounds.y, bounds.width, bounds.height, cell);
}

/**
 * Renders a border corner cell.
 * @internal
 */
function renderBorderCorner(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	charCode: number,
	fg: number,
	bg: number,
): void {
	const char = String.fromCodePoint(charCode);
	setCell(buffer, x, y, createCell(char, fg, bg));
}

/**
 * Renders horizontal border edges.
 * @internal
 */
function renderHorizontalEdge(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	charCode: number,
	fg: number,
	bg: number,
): void {
	const char = String.fromCodePoint(charCode);
	const cell = createCell(char, fg, bg);
	for (let i = 0; i < width; i++) {
		setCell(buffer, x + i, y, cell);
	}
}

/**
 * Renders vertical border edges.
 * @internal
 */
function renderVerticalEdge(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	height: number,
	charCode: number,
	fg: number,
	bg: number,
): void {
	const char = String.fromCodePoint(charCode);
	const cell = createCell(char, fg, bg);
	for (let i = 0; i < height; i++) {
		setCell(buffer, x, y + i, cell);
	}
}

/**
 * Renders the border for an entity.
 *
 * @param ctx - Render context
 * @param eid - Entity ID
 * @param bounds - Entity bounds
 *
 * @example
 * ```typescript
 * import { renderBorder } from 'blecsd';
 *
 * renderBorder(ctx, entity, bounds);
 * ```
 */
export function renderBorder(ctx: RenderContext, eid: Entity, bounds: EntityBounds): void {
	const { world, buffer } = ctx;

	if (!hasBorderVisible(world, eid)) {
		return;
	}

	const border = getBorder(world, eid);
	if (!border || border.type === BorderType.None) {
		return;
	}

	const { fg, bg } = border;
	const { x, y, width, height } = bounds;

	// Need at least 1x1 for a border
	if (width < 1 || height < 1) {
		return;
	}

	const hasLeft = border.left;
	const hasTop = border.top;
	const hasRight = border.right;
	const hasBottom = border.bottom;

	// Render corners
	if (hasTop && hasLeft) {
		renderBorderCorner(buffer, x, y, border.charTopLeft, fg, bg);
	}
	if (hasTop && hasRight) {
		renderBorderCorner(buffer, x + width - 1, y, border.charTopRight, fg, bg);
	}
	if (hasBottom && hasLeft) {
		renderBorderCorner(buffer, x, y + height - 1, border.charBottomLeft, fg, bg);
	}
	if (hasBottom && hasRight) {
		renderBorderCorner(buffer, x + width - 1, y + height - 1, border.charBottomRight, fg, bg);
	}

	// Render horizontal edges
	const hEdgeStart = hasLeft ? 1 : 0;
	const hEdgeEnd = hasRight ? 1 : 0;
	const hEdgeWidth = width - hEdgeStart - hEdgeEnd;

	if (hasTop && hEdgeWidth > 0) {
		renderHorizontalEdge(buffer, x + hEdgeStart, y, hEdgeWidth, border.charHorizontal, fg, bg);
	}
	if (hasBottom && hEdgeWidth > 0) {
		renderHorizontalEdge(
			buffer,
			x + hEdgeStart,
			y + height - 1,
			hEdgeWidth,
			border.charHorizontal,
			fg,
			bg,
		);
	}

	// Render vertical edges
	const vEdgeStart = hasTop ? 1 : 0;
	const vEdgeEnd = hasBottom ? 1 : 0;
	const vEdgeHeight = height - vEdgeStart - vEdgeEnd;

	if (hasLeft && vEdgeHeight > 0) {
		renderVerticalEdge(buffer, x, y + vEdgeStart, vEdgeHeight, border.charVertical, fg, bg);
	}
	if (hasRight && vEdgeHeight > 0) {
		renderVerticalEdge(
			buffer,
			x + width - 1,
			y + vEdgeStart,
			vEdgeHeight,
			border.charVertical,
			fg,
			bg,
		);
	}
}

/**
 * Renders the content area of an entity.
 * This is a placeholder that can be extended for specific content types.
 *
 * @param ctx - Render context
 * @param eid - Entity ID
 * @param contentBounds - Content area bounds (inside border)
 *
 * @example
 * ```typescript
 * import { renderContent } from 'blecsd';
 *
 * renderContent(ctx, entity, contentBounds);
 * ```
 */
export function renderContent(
	_ctx: RenderContext,
	_eid: Entity,
	_contentBounds: EntityBounds,
): void {
	// Base render system doesn't render content
	// This is a hook for widgets/extensions to override
}

/**
 * Renders a scrollbar for an entity.
 * Currently a placeholder for future scrollable content support.
 *
 * @param ctx - Render context
 * @param eid - Entity ID
 * @param bounds - Entity bounds
 *
 * @example
 * ```typescript
 * import { renderScrollbar } from 'blecsd';
 *
 * renderScrollbar(ctx, entity, bounds);
 * ```
 */
export function renderScrollbar(_ctx: RenderContext, _eid: Entity, _bounds: EntityBounds): void {
	// Placeholder for scrollbar rendering
	// Will be implemented when scrollable component is used
}

/**
 * Renders a single entity.
 *
 * @param ctx - Render context
 * @param eid - Entity ID
 */
function renderEntity(ctx: RenderContext, eid: Entity): void {
	const { world, doubleBuffer } = ctx;

	const bounds = getEntityBounds(world, eid);
	if (!bounds) {
		return;
	}

	// Skip entities with no size
	if (bounds.width <= 0 || bounds.height <= 0) {
		return;
	}

	// Render background (fills entire bounds)
	renderBackground(ctx, eid, bounds);

	// Render border
	renderBorder(ctx, eid, bounds);

	// Get content bounds (inside border)
	const borderThickness = getBorderThickness(world, eid);
	const contentBounds = getContentBounds(bounds, borderThickness);

	// Render content
	if (contentBounds.width > 0 && contentBounds.height > 0) {
		renderContent(ctx, eid, contentBounds);
	}

	// Render scrollbar if needed
	renderScrollbar(ctx, eid, bounds);

	// Mark dirty region for double buffer
	markDirtyRegion(doubleBuffer, bounds.x, bounds.y, bounds.width, bounds.height);

	// Mark entity as clean
	markClean(world, eid);
}

/**
 * Recursively renders an entity and its children in tree order.
 * @internal Currently unused, reserved for future tree-based rendering mode.
 *
 * @param ctx - Render context
 * @param eid - Entity ID
 */
/*
function renderEntityTree(ctx: RenderContext, eid: Entity): void {
	const { world } = ctx;

	// Render this entity if visible and dirty
	if (isEffectivelyVisible(world, eid) && isDirty(world, eid)) {
		renderEntity(ctx, eid);
	}

	// Collect and sort children by z-index
	const children = getChildren(world, eid);
	if (children.length === 0) {
		return;
	}

	const sortedChildren: SortedEntity[] = children.map((childEid) => ({
		eid: childEid,
		z: hasComponent(world, childEid, Position) ? (Position.z[childEid] as number) : 0,
	}));

	sortedChildren.sort((a, b) => a.z - b.z);

	// Render children recursively
	for (const child of sortedChildren) {
		renderEntityTree(ctx, child.eid);
	}
}
*/

// =============================================================================
// RENDER SYSTEM
// =============================================================================

/** Module-level double buffer reference for the render system */
let renderDoubleBuffer: DoubleBufferData | null = null;

/**
 * Sets the double buffer for the render system.
 * Must be called before running the render system.
 *
 * @param db - The double buffer to render to
 *
 * @example
 * ```typescript
 * import { setRenderBuffer, createDoubleBuffer } from 'blecsd';
 *
 * const db = createDoubleBuffer(80, 24);
 * setRenderBuffer(db);
 * ```
 */
export function setRenderBuffer(db: DoubleBufferData): void {
	renderDoubleBuffer = db;
}

/**
 * Gets the current render buffer.
 *
 * @returns The current double buffer or null
 */
export function getRenderBuffer(): DoubleBufferData | null {
	return renderDoubleBuffer;
}

/**
 * Clears the render buffer reference.
 */
export function clearRenderBuffer(): void {
	renderDoubleBuffer = null;
}

/**
 * Render system that draws visible, dirty entities to the screen buffer.
 * Entities are rendered in z-index order (lower z first, higher z on top).
 *
 * The system:
 * 1. Queries all entities with Position and Renderable
 * 2. Filters to visible, dirty entities
 * 3. Sorts by z-index
 * 4. Renders each entity (background, border, content)
 * 5. Marks entities as clean
 *
 * @param world - The ECS world
 * @returns The world (unchanged)
 *
 * @example
 * ```typescript
 * import { renderSystem, setRenderBuffer, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
 *
 * // Before running, set the render buffer
 * setRenderBuffer(doubleBuffer);
 * scheduler.run(world, deltaTime);
 * ```
 */
export const renderSystem: System = (world: World): World => {
	if (!renderDoubleBuffer) {
		return world;
	}

	const buffer = getBackBuffer(renderDoubleBuffer);

	const ctx: RenderContext = {
		world,
		buffer,
		doubleBuffer: renderDoubleBuffer,
	};

	// Query all entities with Position and Renderable
	const entities = query(world, [Position, Renderable]);

	// Collect root entities (those without parents or at top level)
	// and sort by z-index
	const sortedEntities: SortedEntity[] = [];

	for (const eid of entities) {
		// Only process if visible and dirty
		if (!isEffectivelyVisible(world, eid)) {
			continue;
		}
		if (!isDirty(world, eid)) {
			continue;
		}

		sortedEntities.push({
			eid,
			z: Position.z[eid] as number,
		});
	}

	// Sort by z-index (lower renders first, higher renders on top)
	sortedEntities.sort((a, b) => a.z - b.z);

	// Render each entity
	for (const { eid } of sortedEntities) {
		renderEntity(ctx, eid);
	}

	return world;
};

/**
 * Creates the render system function.
 * This is an alternative to using the renderSystem directly for custom configuration.
 *
 * @returns A new render system function
 *
 * @example
 * ```typescript
 * import { createRenderSystem, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.RENDER, createRenderSystem());
 * ```
 */
export function createRenderSystem(): System {
	return renderSystem;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Renders text to a buffer at the specified position.
 * Utility function for widgets to render text content.
 *
 * @param buffer - Screen buffer
 * @param x - X position
 * @param y - Y position
 * @param text - Text to render
 * @param fg - Foreground color
 * @param bg - Background color
 * @param attrs - Text attributes
 * @returns Number of characters written
 *
 * @example
 * ```typescript
 * import { renderText, Attr } from 'blecsd';
 *
 * renderText(buffer, 10, 5, 'Hello', 0xffffffff, 0x000000ff, Attr.BOLD);
 * ```
 */
export function renderText(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	text: string,
	fg: number,
	bg: number,
	attrs: number = Attr.NONE,
): number {
	return writeString(buffer, x, y, text, fg, bg, attrs);
}

/**
 * Renders a filled rectangle to a buffer.
 * Utility function for widgets.
 *
 * @param buffer - Screen buffer
 * @param x - X position
 * @param y - Y position
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @param cell - Cell to fill with
 *
 * @example
 * ```typescript
 * import { renderRect, createCell } from 'blecsd';
 *
 * renderRect(buffer, 10, 5, 20, 10, createCell(' ', 0xffffffff, 0x0000ffff));
 * ```
 */
export function renderRect(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	height: number,
	cell: Cell,
): void {
	fillRect(buffer, x, y, width, height, cell);
}

/**
 * Marks all entities as dirty, forcing a full re-render.
 *
 * @param world - The ECS world
 *
 * @example
 * ```typescript
 * import { markAllDirty } from 'blecsd';
 *
 * // Force re-render of all entities
 * markAllDirty(world);
 * ```
 */
export function markAllDirty(world: World): void {
	const entities = query(world, [Renderable]);
	for (const eid of entities) {
		Renderable.dirty[eid] = 1;
	}
}

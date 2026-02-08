/**
 * Render system for drawing entities to the screen buffer.
 * Runs in the RENDER phase after layout computation.
 * @module systems/renderSystem
 */

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
import type { DirtyTracker } from '../core/dirtyTracking';
import { markEntityDirty } from '../core/dirtyTracking';
import { hasComponent } from '../core/ecs';
import type { Entity, System, World } from '../core/types';
import { getWorldAdapter } from '../core/worldAdapter';
import type { Cell, ScreenBufferData } from '../terminal/screen/cell';
import { Attr, createCell, fillRect, setCell, writeString } from '../terminal/screen/cell';
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
	/** The dirty tracker for optimized rendering */
	readonly dirtyTracker: DirtyTracker;
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

/** Border side flags for rendering. */
interface BorderSides {
	left: boolean;
	top: boolean;
	right: boolean;
	bottom: boolean;
}

/** Renders all four corners of a border. */
function renderBorderCorners(
	buffer: ScreenBufferData,
	border: ReturnType<typeof getBorder>,
	bounds: EntityBounds,
	sides: BorderSides,
	fg: number,
	bg: number,
): void {
	if (!border) return;
	const { x, y, width, height } = bounds;
	if (sides.top && sides.left) renderBorderCorner(buffer, x, y, border.charTopLeft, fg, bg);
	if (sides.top && sides.right)
		renderBorderCorner(buffer, x + width - 1, y, border.charTopRight, fg, bg);
	if (sides.bottom && sides.left)
		renderBorderCorner(buffer, x, y + height - 1, border.charBottomLeft, fg, bg);
	if (sides.bottom && sides.right)
		renderBorderCorner(buffer, x + width - 1, y + height - 1, border.charBottomRight, fg, bg);
}

/** Renders horizontal border edges (top and bottom). */
function renderHorizontalEdges(
	buffer: ScreenBufferData,
	charCode: number,
	bounds: EntityBounds,
	sides: BorderSides,
	fg: number,
	bg: number,
): void {
	const hEdgeStart = sides.left ? 1 : 0;
	const hEdgeWidth = bounds.width - hEdgeStart - (sides.right ? 1 : 0);
	if (hEdgeWidth <= 0) return;

	if (sides.top)
		renderHorizontalEdge(buffer, bounds.x + hEdgeStart, bounds.y, hEdgeWidth, charCode, fg, bg);
	if (sides.bottom)
		renderHorizontalEdge(
			buffer,
			bounds.x + hEdgeStart,
			bounds.y + bounds.height - 1,
			hEdgeWidth,
			charCode,
			fg,
			bg,
		);
}

/** Renders vertical border edges (left and right). */
function renderVerticalEdges(
	buffer: ScreenBufferData,
	charCode: number,
	bounds: EntityBounds,
	sides: BorderSides,
	fg: number,
	bg: number,
): void {
	const vEdgeStart = sides.top ? 1 : 0;
	const vEdgeHeight = bounds.height - vEdgeStart - (sides.bottom ? 1 : 0);
	if (vEdgeHeight <= 0) return;

	if (sides.left)
		renderVerticalEdge(buffer, bounds.x, bounds.y + vEdgeStart, vEdgeHeight, charCode, fg, bg);
	if (sides.right)
		renderVerticalEdge(
			buffer,
			bounds.x + bounds.width - 1,
			bounds.y + vEdgeStart,
			vEdgeHeight,
			charCode,
			fg,
			bg,
		);
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

	if (!hasBorderVisible(world, eid)) return;

	const border = getBorder(world, eid);
	if (!border || border.type === BorderType.None) return;
	if (bounds.width < 1 || bounds.height < 1) return;

	const { fg, bg } = border;
	const sides: BorderSides = {
		left: border.left,
		top: border.top,
		right: border.right,
		bottom: border.bottom,
	};

	renderBorderCorners(buffer, border, bounds, sides, fg, bg);
	renderHorizontalEdges(buffer, border.charHorizontal, bounds, sides, fg, bg);
	renderVerticalEdges(buffer, border.charVertical, bounds, sides, fg, bg);
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
	const { world } = ctx;

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

	// Mark entity dirty in unified tracker
	markEntityDirty(ctx.dirtyTracker, world, eid);

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
// VIEWPORT BOUNDS CULLING
// =============================================================================

/**
 * Viewport bounds for culling off-screen entities.
 * Defaults to null (no culling). Set via setViewportBounds().
 */
interface ViewportBounds {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/** Module-level viewport bounds (null = no viewport culling) */
let viewportBounds: ViewportBounds | null = null;

/**
 * Sets the viewport bounds for culling.
 * Entities outside these bounds will be skipped during rendering.
 *
 * Pass null to disable viewport culling (default).
 * Typically set to screen dimensions for scrollable content optimization.
 *
 * @param bounds - Viewport bounds or null to disable culling
 *
 * @example
 * ```typescript
 * import { setViewportBounds } from 'blecsd';
 *
 * // Enable viewport culling for 80x24 screen
 * setViewportBounds({ x: 0, y: 0, width: 80, height: 24 });
 *
 * // Disable viewport culling
 * setViewportBounds(null);
 * ```
 */
export function setViewportBounds(bounds: ViewportBounds | null): void {
	viewportBounds = bounds;
}

/**
 * Gets the current viewport bounds.
 *
 * @returns Current viewport bounds or null if disabled
 */
export function getViewportBounds(): ViewportBounds | null {
	return viewportBounds;
}

/**
 * Checks if an entity is completely outside the viewport bounds.
 * Returns false if viewport culling is disabled or if entity overlaps viewport.
 *
 * @param bounds - Entity bounds to check
 * @returns True if entity is completely outside viewport
 */
function isOutsideViewport(bounds: EntityBounds): boolean {
	if (!viewportBounds) {
		return false; // No viewport culling
	}

	// Check if entity is completely outside viewport (no overlap)
	const noOverlap =
		bounds.x + bounds.width <= viewportBounds.x || // Entity is to the left of viewport
		bounds.x >= viewportBounds.x + viewportBounds.width || // Entity is to the right
		bounds.y + bounds.height <= viewportBounds.y || // Entity is above viewport
		bounds.y >= viewportBounds.y + viewportBounds.height; // Entity is below viewport

	return noOverlap;
}

// =============================================================================
// Z-ORDER OCCLUSION CULLING
// =============================================================================

/**
 * Rectangle representing a screen region.
 */
interface OcclusionRect {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

/**
 * Checks if rect A is fully contained within rect B.
 */
function isFullyContained(a: OcclusionRect, b: OcclusionRect): boolean {
	return (
		a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height
	);
}

/**
 * Checks if an entity is fully occluded by rendered regions.
 * Returns true if the entity's bounds are completely covered.
 */
function isFullyOccluded(bounds: EntityBounds, occludedRegions: readonly OcclusionRect[]): boolean {
	if (occludedRegions.length === 0) {
		return false;
	}

	// Fast path: check if fully contained in any single region
	for (const region of occludedRegions) {
		if (isFullyContained(bounds, region)) {
			return true;
		}
	}

	// TODO: Complex path - multi-rect union coverage test
	// For now, conservative: only cull if single rect covers it
	return false;
}

/**
 * Adds a rendered entity's bounds to the occlusion map.
 */
function addOccludedRegion(regions: OcclusionRect[], bounds: EntityBounds): void {
	regions.push({
		x: bounds.x,
		y: bounds.y,
		width: bounds.width,
		height: bounds.height,
	});
}

/**
 * Processes a single entity for rendering with viewport and occlusion culling.
 * Returns true if the entity was rendered, false if it was culled.
 *
 * Culling order:
 * 1. Check if entity has computed layout bounds
 * 2. Viewport bounds check (skip if completely outside viewport)
 * 3. Occlusion check (skip if fully hidden behind other entities)
 * 4. Render entity
 */
function processEntityWithCulling(
	ctx: RenderContext,
	eid: Entity,
	occludedRegions: OcclusionRect[],
): boolean {
	const { world } = ctx;

	// Get bounds once for all culling checks
	const bounds = getEntityBounds(world, eid);
	if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
		// No layout computed or invalid size - skip but mark clean
		markClean(world, eid);
		return false;
	}

	// Viewport bounds culling: skip entities completely outside viewport
	if (isOutsideViewport(bounds)) {
		// Entity is off-screen - skip rendering but mark as clean
		markClean(world, eid);
		return false;
	}

	// Z-order occlusion culling: skip entities fully hidden behind others
	if (occlusionCullingEnabled && isFullyOccluded(bounds, occludedRegions)) {
		// Entity is completely hidden - skip rendering but mark as clean
		markClean(world, eid);
		return false;
	}

	// Render entity normally
	renderEntity(ctx, eid);

	// Add rendered bounds to occlusion map for subsequent entities
	if (occlusionCullingEnabled) {
		addOccludedRegion(occludedRegions, bounds);
	}

	return true;
}

// =============================================================================
// RENDER SYSTEM
// =============================================================================

/** Module-level dirty tracker reference for the render system */
let renderDirtyTracker: DirtyTracker | null = null;

/** Module-level screen buffer reference for the render system */
let renderScreenBuffer: ScreenBufferData | null = null;

/** Module-level occlusion culling enabled flag (disabled by default) */
let occlusionCullingEnabled = false;

/**
 * Sets the dirty tracker and screen buffer for the render system.
 * Must be called before running the render system.
 *
 * @param tracker - The dirty tracker for optimized rendering
 * @param buffer - The screen buffer to render to
 *
 * @example
 * ```typescript
 * import { setRenderBuffer, createDirtyTracker } from 'blecsd';
 * import { createScreenBuffer } from 'blecsd';
 *
 * const tracker = createDirtyTracker(80, 24);
 * const buffer = createScreenBuffer(80, 24);
 * setRenderBuffer(tracker, buffer);
 * ```
 */
export function setRenderBuffer(tracker: DirtyTracker, buffer: ScreenBufferData): void {
	renderDirtyTracker = tracker;
	renderScreenBuffer = buffer;
}

/**
 * Gets the current dirty tracker.
 *
 * @returns The current dirty tracker or null
 */
export function getRenderBuffer(): DirtyTracker | null {
	return renderDirtyTracker;
}

/**
 * Clears the render buffer references.
 */
export function clearRenderBuffer(): void {
	renderDirtyTracker = null;
	renderScreenBuffer = null;
}

/**
 * Enables or disables z-order occlusion culling.
 * When enabled, entities fully hidden behind higher z-index entities are skipped during rendering.
 *
 * Disabled by default. Enable for applications with many overlapping widgets (modals, dialogs, overlays)
 * where the performance benefit outweighs the culling overhead.
 *
 * @param enabled - Whether to enable occlusion culling (default: false)
 *
 * @example
 * ```typescript
 * import { setOcclusionCulling } from 'blecsd';
 *
 * // Enable occlusion culling for layered UI
 * setOcclusionCulling(true);
 * ```
 */
export function setOcclusionCulling(enabled: boolean): void {
	occlusionCullingEnabled = enabled;
}

/**
 * Gets the current occlusion culling state.
 *
 * @returns True if occlusion culling is enabled
 */
export function isOcclusionCullingEnabled(): boolean {
	return occlusionCullingEnabled;
}

/**
 * Render system that draws visible, dirty entities to the screen buffer.
 * Entities are rendered in z-index order (lower z first, higher z on top).
 *
 * The system:
 * 1. Queries all entities with Position and Renderable
 * 2. Filters to visible, dirty entities
 * 3. Sorts by z-index
 * 4. Applies viewport bounds culling (skips off-screen entities)
 * 5. Applies z-order occlusion culling (skips fully hidden entities)
 * 6. Renders each visible entity (background, border, content)
 * 7. Marks entities as clean
 *
 * Viewport culling: entities completely outside the viewport bounds are skipped
 * to improve performance in scrollable content with many off-screen entities.
 * Enable via `setViewportBounds({ x, y, width, height })`.
 *
 * Occlusion culling: entities fully covered by higher z-index entities are
 * skipped to improve performance in layered UIs (modals, dialogs, overlays).
 * Enable via `setOcclusionCulling(true)`.
 *
 * @param world - The ECS world
 * @returns The world (unchanged)
 *
 * @example
 * ```typescript
 * import { renderSystem, setRenderBuffer, setViewportBounds, createScheduler, LoopPhase } from 'blecsd';
 *
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.RENDER, renderSystem);
 *
 * // Set render buffer and enable viewport culling
 * setRenderBuffer(dirtyTracker, screenBuffer);
 * setViewportBounds({ x: 0, y: 0, width: 80, height: 24 });
 *
 * scheduler.run(world, deltaTime);
 * ```
 */
export const renderSystem: System = (world: World): World => {
	if (!renderDirtyTracker || !renderScreenBuffer) {
		return world;
	}

	const ctx: RenderContext = {
		world,
		buffer: renderScreenBuffer,
		dirtyTracker: renderDirtyTracker,
	};

	// Query all entities with Position and Renderable via adapter
	const adapter = getWorldAdapter(world);
	const entities = adapter.queryRenderables(world);

	// PERF: Reuse arrays across frames to avoid GC pressure
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

		// PERF: Push directly to array (unavoidable allocation for filtered results)
		sortedEntities.push({
			eid,
			z: Position.z[eid] as number,
		});
	}

	// PERF: In-place sort to avoid additional allocations
	// Sort by z-index (lower renders first, higher renders on top)
	sortedEntities.sort((a, b) => a.z - b.z);

	// PERF: Reuse occlusion array across frames
	// Track occluded regions for z-order culling
	const occludedRegions: OcclusionRect[] = [];

	// Render each entity with viewport and occlusion culling
	for (const { eid } of sortedEntities) {
		processEntityWithCulling(ctx, eid, occludedRegions);
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
	const adapter = getWorldAdapter(world);
	const entities = adapter.queryRenderables(world);
	for (const eid of entities) {
		Renderable.dirty[eid] = 1;
	}
}

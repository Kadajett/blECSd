/**
 * Virtualized Render System for Large Content
 *
 * Renders only visible lines from VirtualViewport-enabled entities.
 * Achieves 60fps scroll performance with 10M+ lines by skipping off-screen content.
 *
 * @module systems/virtualizedRenderSystem
 *
 * @example
 * ```typescript
 * import {
 *   virtualizedRenderSystem,
 *   setVirtualizedRenderBuffer,
 *   registerLineStore,
 * } from 'blecsd';
 *
 * // Set up the render buffer
 * setVirtualizedRenderBuffer(doubleBuffer);
 *
 * // Associate a line store with an entity
 * registerLineStore(entity, lineStore);
 *
 * // Run the system
 * virtualizedRenderSystem(world);
 * ```
 */

import { hasComponent, query } from 'bitecs';
import { z } from 'zod';
import { Border, hasBorderVisible } from '../components/border';
import { Position } from '../components/position';
import {
	getStyle,
	isEffectivelyVisible,
	markClean,
	Renderable,
} from '../components/renderable';
import {
	clearViewportDirty,
	getVisibleRange,
	isViewportDirty,
	VirtualViewport,
	type VisibleRange,
} from '../components/virtualViewport';
import type { Entity, System, World } from '../core/types';
import type { ScreenBufferData } from '../terminal/screen/cell';
import { Attr, createCell, fillRect, setCell, writeString } from '../terminal/screen/cell';
import type { DoubleBufferData } from '../terminal/screen/doubleBuffer';
import { getBackBuffer, markDirtyRegion } from '../terminal/screen/doubleBuffer';
import { ComputedLayout, hasComputedLayout } from './layoutSystem';
import type { VirtualizedLineStore } from '../utils/virtualizedLineStore';
import { getLineRange } from '../utils/virtualizedLineStore';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Schema for RGBA color values (32-bit unsigned integer).
 */
const ColorSchema = z.number().int().min(0).max(0xffffffff);

/**
 * Schema for text attributes (bitfield).
 */
const AttrsSchema = z.number().int().min(0).max(0xffff);

/**
 * Schema for line render configuration without defaults (for partial updates).
 */
const LineRenderConfigFieldsSchema = z.object({
	/** Foreground color for normal lines */
	fg: ColorSchema.optional(),
	/** Background color for normal lines */
	bg: ColorSchema.optional(),
	/** Foreground color for selected line */
	selectedFg: ColorSchema.optional(),
	/** Background color for selected line */
	selectedBg: ColorSchema.optional(),
	/** Foreground color for cursor line */
	cursorFg: ColorSchema.optional(),
	/** Background color for cursor line */
	cursorBg: ColorSchema.optional(),
	/** Whether to show line numbers */
	showLineNumbers: z.boolean().optional(),
	/** Width reserved for line numbers (0 if not shown) */
	lineNumberWidth: z.number().int().nonnegative().max(20).optional(),
	/** Attributes for text */
	attrs: AttrsSchema.optional(),
});

/**
 * Schema for line render configuration with defaults (for full config).
 *
 * @example
 * ```typescript
 * import { LineRenderConfigSchema } from 'blecsd';
 *
 * const config = LineRenderConfigSchema.parse({
 *   fg: 0xffffffff,
 *   bg: 0x000000ff,
 *   showLineNumbers: true,
 *   lineNumberWidth: 5,
 * });
 * ```
 */
export const LineRenderConfigSchema = z.object({
	/** Foreground color for normal lines */
	fg: ColorSchema.default(0xffffffff),
	/** Background color for normal lines */
	bg: ColorSchema.default(0x000000ff),
	/** Foreground color for selected line */
	selectedFg: ColorSchema.default(0x000000ff),
	/** Background color for selected line */
	selectedBg: ColorSchema.default(0xffffffff),
	/** Foreground color for cursor line */
	cursorFg: ColorSchema.default(0x000000ff),
	/** Background color for cursor line */
	cursorBg: ColorSchema.default(0x00ff00ff),
	/** Whether to show line numbers */
	showLineNumbers: z.boolean().default(false),
	/** Width reserved for line numbers (0 if not shown) */
	lineNumberWidth: z.number().int().nonnegative().max(20).default(0),
	/** Attributes for text */
	attrs: AttrsSchema.default(Attr.NONE),
});

// =============================================================================
// TYPES
// =============================================================================

/**
 * Render context for virtualized rendering.
 */
export interface VirtualizedRenderContext {
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
 * Line render configuration.
 */
export interface LineRenderConfig {
	/** Foreground color for normal lines */
	readonly fg: number;
	/** Background color for normal lines */
	readonly bg: number;
	/** Foreground color for selected line */
	readonly selectedFg: number;
	/** Background color for selected line */
	readonly selectedBg: number;
	/** Foreground color for cursor line */
	readonly cursorFg: number;
	/** Background color for cursor line */
	readonly cursorBg: number;
	/** Whether to show line numbers */
	readonly showLineNumbers: boolean;
	/** Width reserved for line numbers (0 if not shown) */
	readonly lineNumberWidth: number;
	/** Attributes for text */
	readonly attrs: number;
}

/**
 * Default line render configuration.
 */
const DEFAULT_LINE_CONFIG: LineRenderConfig = {
	fg: 0xffffffff,
	bg: 0x000000ff,
	selectedFg: 0x000000ff,
	selectedBg: 0xffffffff,
	cursorFg: 0x000000ff,
	cursorBg: 0x00ff00ff,
	showLineNumbers: false,
	lineNumberWidth: 0,
	attrs: Attr.NONE,
};

// =============================================================================
// INTERNAL STATE
// =============================================================================

/** Module-level double buffer reference */
let virtualizedDoubleBuffer: DoubleBufferData | null = null;

/** Map of entity ID to line store */
const lineStoreRegistry = new Map<Entity, VirtualizedLineStore>();

/** Map of entity ID to line render config */
const lineConfigRegistry = new Map<Entity, LineRenderConfig>();

// =============================================================================
// PUBLIC API - BUFFER MANAGEMENT
// =============================================================================

/**
 * Sets the double buffer for the virtualized render system.
 *
 * @param db - The double buffer to render to
 *
 * @example
 * ```typescript
 * import { setVirtualizedRenderBuffer, createDoubleBuffer } from 'blecsd';
 *
 * const db = createDoubleBuffer(80, 24);
 * setVirtualizedRenderBuffer(db);
 * ```
 */
export function setVirtualizedRenderBuffer(db: DoubleBufferData): void {
	virtualizedDoubleBuffer = db;
}

/**
 * Gets the current virtualized render buffer.
 *
 * @returns The current double buffer or null
 */
export function getVirtualizedRenderBuffer(): DoubleBufferData | null {
	return virtualizedDoubleBuffer;
}

/**
 * Clears the virtualized render buffer reference.
 */
export function clearVirtualizedRenderBuffer(): void {
	virtualizedDoubleBuffer = null;
}

// =============================================================================
// PUBLIC API - LINE STORE MANAGEMENT
// =============================================================================

/**
 * Registers a line store for an entity.
 * The virtualized render system will use this store to get content.
 *
 * @param eid - Entity ID
 * @param store - The line store containing content
 *
 * @example
 * ```typescript
 * import { registerLineStore, createLineStore } from 'blecsd';
 *
 * const store = createLineStore(largeContent);
 * registerLineStore(entity, store);
 * ```
 */
export function registerLineStore(eid: Entity, store: VirtualizedLineStore): void {
	lineStoreRegistry.set(eid, store);
}

/**
 * Gets the line store for an entity.
 *
 * @param eid - Entity ID
 * @returns The line store or undefined
 */
export function getLineStore(eid: Entity): VirtualizedLineStore | undefined {
	return lineStoreRegistry.get(eid);
}

/**
 * Unregisters a line store for an entity.
 *
 * @param eid - Entity ID
 */
export function unregisterLineStore(eid: Entity): void {
	lineStoreRegistry.delete(eid);
}

/**
 * Updates the line store for an entity.
 * Use this when content changes (e.g., streaming append).
 *
 * @param eid - Entity ID
 * @param store - The new line store
 */
export function updateLineStore(eid: Entity, store: VirtualizedLineStore): void {
	lineStoreRegistry.set(eid, store);
}

// =============================================================================
// PUBLIC API - LINE RENDER CONFIG
// =============================================================================

/**
 * Sets the line render configuration for an entity.
 * Input is validated against LineRenderConfigSchema.
 *
 * @param eid - Entity ID
 * @param config - Partial config (merged with defaults)
 * @throws {z.ZodError} If config values are invalid
 *
 * @example
 * ```typescript
 * import { setLineRenderConfig } from 'blecsd';
 *
 * setLineRenderConfig(entity, {
 *   showLineNumbers: true,
 *   lineNumberWidth: 5,
 *   selectedBg: 0x0000ffff, // Blue selection
 * });
 * ```
 */
export function setLineRenderConfig(eid: Entity, config: Partial<LineRenderConfig>): void {
	// Validate partial config (using schema without defaults to preserve existing values)
	const validatedConfig = LineRenderConfigFieldsSchema.parse(config);

	// Filter out undefined values before merging
	const definedValues: Partial<LineRenderConfig> = {};
	for (const [key, value] of Object.entries(validatedConfig)) {
		if (value !== undefined) {
			(definedValues as Record<string, unknown>)[key] = value;
		}
	}

	const existing = lineConfigRegistry.get(eid) ?? DEFAULT_LINE_CONFIG;
	lineConfigRegistry.set(eid, { ...existing, ...definedValues });
}

/**
 * Gets the line render configuration for an entity.
 *
 * @param eid - Entity ID
 * @returns The line render config
 */
export function getLineRenderConfig(eid: Entity): LineRenderConfig {
	return lineConfigRegistry.get(eid) ?? DEFAULT_LINE_CONFIG;
}

/**
 * Clears the line render configuration for an entity.
 *
 * @param eid - Entity ID
 */
export function clearLineRenderConfig(eid: Entity): void {
	lineConfigRegistry.delete(eid);
}

// =============================================================================
// INTERNAL HELPERS
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

/**
 * Renders a single line to the buffer.
 */
function renderLine(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	maxWidth: number,
	text: string,
	fg: number,
	bg: number,
	attrs: number,
): void {
	// Clear the line first
	const bgCell = createCell(' ', fg, bg, attrs);
	for (let i = 0; i < maxWidth; i++) {
		setCell(buffer, x + i, y, bgCell);
	}

	// Write text (truncate if needed)
	const displayText = text.length > maxWidth ? text.slice(0, maxWidth) : text;
	if (displayText.length > 0) {
		writeString(buffer, x, y, displayText, fg, bg, attrs);
	}
}

/**
 * Renders line numbers.
 */
function renderLineNumber(
	buffer: ScreenBufferData,
	x: number,
	y: number,
	width: number,
	lineNumber: number,
	fg: number,
	bg: number,
): void {
	const numStr = String(lineNumber + 1).padStart(width - 1, ' ') + ' ';
	writeString(buffer, x, y, numStr.slice(0, width), fg, bg, Attr.DIM);
}

// =============================================================================
// RENDER FUNCTIONS
// =============================================================================

/**
 * Renders the visible lines from a VirtualViewport entity.
 *
 * @param ctx - Render context
 * @param eid - Entity ID
 * @param contentBounds - Content area bounds
 * @param visibleRange - Visible line range
 * @param store - Line store
 * @param config - Line render config
 */
function renderVisibleLines(
	ctx: VirtualizedRenderContext,
	eid: Entity,
	contentBounds: EntityBounds,
	visibleRange: VisibleRange,
	store: VirtualizedLineStore,
	config: LineRenderConfig,
): void {
	const { buffer } = ctx;
	const { x, y, width, height } = contentBounds;

	// Get the lines from store
	const lineData = getLineRange(store, visibleRange.start, visibleRange.end);

	// Calculate content area (accounting for line numbers)
	const contentX = config.showLineNumbers ? x + config.lineNumberWidth : x;
	const contentWidth = config.showLineNumbers
		? Math.max(0, width - config.lineNumberWidth)
		: width;

	// Get selection/cursor state
	const selectedLine = VirtualViewport.selectedLine[eid] as number;
	const cursorLine = VirtualViewport.cursorLine[eid] as number;

	// Render each visible line
	for (let i = 0; i < lineData.lines.length; i++) {
		const screenY = y + i;

		// Skip if outside visible height
		if (i >= height) {
			break;
		}

		const lineIndex = lineData.startLine + i;
		const text = lineData.lines[i] ?? '';

		// Determine colors based on selection/cursor state
		let fg = config.fg;
		let bg = config.bg;

		if (lineIndex === cursorLine) {
			fg = config.cursorFg;
			bg = config.cursorBg;
		} else if (lineIndex === selectedLine) {
			fg = config.selectedFg;
			bg = config.selectedBg;
		}

		// Render line number if enabled
		if (config.showLineNumbers) {
			renderLineNumber(buffer, x, screenY, config.lineNumberWidth, lineIndex, config.fg, config.bg);
		}

		// Render line content
		renderLine(buffer, contentX, screenY, contentWidth, text, fg, bg, config.attrs);
	}

	// Fill remaining height with empty lines
	const linesRendered = Math.min(lineData.lines.length, height);
	for (let i = linesRendered; i < height; i++) {
		const screenY = y + i;

		// Clear line number area if shown
		if (config.showLineNumbers) {
			renderLine(buffer, x, screenY, config.lineNumberWidth, '', config.fg, config.bg, Attr.NONE);
		}

		// Clear content area
		renderLine(buffer, contentX, screenY, contentWidth, '', config.fg, config.bg, Attr.NONE);
	}
}

/**
 * Renders a scrollbar for the viewport.
 *
 * @param ctx - Render context
 * @param bounds - Entity bounds
 * @param totalLines - Total line count
 * @param firstVisible - First visible line
 * @param visibleCount - Visible line count
 */
function renderScrollbar(
	ctx: VirtualizedRenderContext,
	bounds: EntityBounds,
	totalLines: number,
	firstVisible: number,
	visibleCount: number,
): void {
	if (totalLines <= visibleCount) {
		return; // No scrollbar needed
	}

	const { buffer } = ctx;
	const trackHeight = bounds.height;
	const trackX = bounds.x + bounds.width - 1;
	const trackY = bounds.y;

	// Calculate thumb position and size
	const thumbRatio = visibleCount / totalLines;
	const thumbHeight = Math.max(1, Math.floor(trackHeight * thumbRatio));
	const thumbOffset = Math.floor((firstVisible / totalLines) * trackHeight);

	// Render track
	const trackCell = createCell('│', 0x666666ff, 0x000000ff);
	for (let i = 0; i < trackHeight; i++) {
		setCell(buffer, trackX, trackY + i, trackCell);
	}

	// Render thumb
	const thumbCell = createCell('█', 0xaaaaaaff, 0x000000ff);
	for (let i = 0; i < thumbHeight; i++) {
		const scrollY = trackY + thumbOffset + i;
		if (scrollY < trackY + trackHeight) {
			setCell(buffer, trackX, scrollY, thumbCell);
		}
	}
}

/**
 * Renders background for the entity.
 */
function renderBackground(
	ctx: VirtualizedRenderContext,
	eid: Entity,
	bounds: EntityBounds,
): void {
	const { world, buffer } = ctx;

	const style = getStyle(world, eid);
	if (!style || style.transparent) {
		return;
	}

	const attrs = styleToAttrs(world, eid);
	const cell = createCell(' ', style.fg, style.bg, attrs);
	fillRect(buffer, bounds.x, bounds.y, bounds.width, bounds.height, cell);
}

/**
 * Renders a single virtualized entity.
 */
function renderVirtualizedEntity(ctx: VirtualizedRenderContext, eid: Entity): void {
	const { world, doubleBuffer } = ctx;

	// Get entity bounds
	const bounds = getEntityBounds(world, eid);
	if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
		return;
	}

	// Get line store
	const store = lineStoreRegistry.get(eid);
	if (!store) {
		return; // No content to render
	}

	// Get visible range
	const visibleRange = getVisibleRange(world, eid);
	if (!visibleRange) {
		return;
	}

	// Get render config
	const config = getLineRenderConfig(eid);

	// Render background
	renderBackground(ctx, eid, bounds);

	// Calculate content bounds (inside border)
	const borderThickness = getBorderThickness(world, eid);
	const contentBounds = getContentBounds(bounds, borderThickness);

	// Render visible lines
	if (contentBounds.width > 0 && contentBounds.height > 0) {
		renderVisibleLines(ctx, eid, contentBounds, visibleRange, store, config);
	}

	// Render scrollbar
	const viewport = {
		firstVisibleLine: VirtualViewport.firstVisibleLine[eid] as number,
		visibleLineCount: VirtualViewport.visibleLineCount[eid] as number,
		totalLineCount: VirtualViewport.totalLineCount[eid] as number,
	};

	if (viewport.totalLineCount > viewport.visibleLineCount) {
		renderScrollbar(
			ctx,
			contentBounds,
			viewport.totalLineCount,
			viewport.firstVisibleLine,
			viewport.visibleLineCount,
		);
	}

	// Mark dirty region
	markDirtyRegion(doubleBuffer, bounds.x, bounds.y, bounds.width, bounds.height);

	// Clear viewport dirty flag
	clearViewportDirty(world, eid);

	// Mark renderable as clean
	markClean(world, eid);
}

// =============================================================================
// VIRTUALIZED RENDER SYSTEM
// =============================================================================

/**
 * Virtualized render system that only renders visible lines.
 *
 * The system:
 * 1. Queries all entities with VirtualViewport
 * 2. Filters to visible, dirty entities
 * 3. Gets visible line range from viewport
 * 4. Retrieves only visible lines from line store
 * 5. Renders to screen buffer
 * 6. Marks entities as clean
 *
 * @param world - The ECS world
 * @returns The world (unchanged)
 *
 * @example
 * ```typescript
 * import {
 *   virtualizedRenderSystem,
 *   setVirtualizedRenderBuffer,
 *   registerLineStore,
 *   createScheduler,
 *   LoopPhase,
 * } from 'blecsd';
 *
 * // Set up
 * setVirtualizedRenderBuffer(doubleBuffer);
 * registerLineStore(entity, lineStore);
 *
 * // Register system
 * const scheduler = createScheduler();
 * scheduler.registerSystem(LoopPhase.RENDER, virtualizedRenderSystem);
 *
 * // Run
 * scheduler.run(world, deltaTime);
 * ```
 */
export const virtualizedRenderSystem: System = (world: World): World => {
	if (!virtualizedDoubleBuffer) {
		return world;
	}

	const buffer = getBackBuffer(virtualizedDoubleBuffer);

	const ctx: VirtualizedRenderContext = {
		world,
		buffer,
		doubleBuffer: virtualizedDoubleBuffer,
	};

	// Query entities with VirtualViewport
	const entities = query(world, [VirtualViewport, Position, Renderable]);

	// Process each entity
	for (const eid of entities) {
		// Skip if not visible
		if (!isEffectivelyVisible(world, eid)) {
			continue;
		}

		// Skip if not dirty (viewport or renderable)
		if (!isViewportDirty(world, eid) && Renderable.dirty[eid] !== 1) {
			continue;
		}

		renderVirtualizedEntity(ctx, eid);
	}

	return world;
};

/**
 * Creates a new virtualized render system.
 *
 * @returns A new render system function
 */
export function createVirtualizedRenderSystem(): System {
	return virtualizedRenderSystem;
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Cleans up all resources for the virtualized render system.
 * Call this when shutting down.
 */
export function cleanupVirtualizedRenderSystem(): void {
	virtualizedDoubleBuffer = null;
	lineStoreRegistry.clear();
	lineConfigRegistry.clear();
}

/**
 * Cleans up resources for a specific entity.
 *
 * @param eid - Entity ID
 */
export function cleanupEntityResources(eid: Entity): void {
	lineStoreRegistry.delete(eid);
	lineConfigRegistry.delete(eid);
}

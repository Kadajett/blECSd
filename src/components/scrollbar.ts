/**
 * Scrollbar component for rendering scrollbars on scrollable widgets.
 *
 * Provides visual feedback for scroll position with configurable characters,
 * colors, and auto-hide behavior.
 *
 * @module components/scrollbar
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';
import { parseColor } from '../utils/color';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Default scrollbar track character (light vertical bar).
 */
export const DEFAULT_TRACK_CHAR = 0x2502; // │

/**
 * Default scrollbar thumb character (full block).
 */
export const DEFAULT_THUMB_CHAR = 0x2588; // █

/**
 * Default horizontal track character (light horizontal bar).
 */
export const DEFAULT_TRACK_CHAR_H = 0x2500; // ─

/**
 * Default track color (dark gray).
 */
export const DEFAULT_TRACK_COLOR = 0xff333333;

/**
 * Default thumb color (light gray).
 */
export const DEFAULT_THUMB_COLOR = 0xff888888;

/**
 * Scrollbar component store using SoA (Structure of Arrays) for performance.
 *
 * - `enabled`: Whether scrollbar is enabled (0=disabled, 1=enabled)
 * - `vertical`: Whether vertical scrollbar is visible (0=no, 1=yes)
 * - `horizontal`: Whether horizontal scrollbar is visible (0=no, 1=yes)
 * - `trackChar`: Unicode codepoint for track character (vertical)
 * - `thumbChar`: Unicode codepoint for thumb character (vertical)
 * - `trackCharH`: Unicode codepoint for horizontal track character
 * - `thumbCharH`: Unicode codepoint for horizontal thumb character
 * - `trackColor`: Track color (packed RGBA)
 * - `thumbColor`: Thumb color (packed RGBA)
 * - `alwaysShow`: Always show scrollbar (0=auto, 1=always)
 *
 * @example
 * ```typescript
 * import { Scrollbar, setScrollbar, getScrollbar } from 'blecsd';
 *
 * setScrollbar(world, entity, { enabled: true });
 * setScrollbar(world, entity, { thumbColor: '#ff0000', alwaysShow: true });
 *
 * const scrollbar = getScrollbar(world, entity);
 * if (scrollbar?.enabled) {
 *   console.log(`Track char: ${String.fromCodePoint(scrollbar.trackChar)}`);
 * }
 * ```
 */
export const Scrollbar = {
	/** 0 = disabled, 1 = enabled */
	enabled: new Uint8Array(DEFAULT_CAPACITY),
	/** Vertical scrollbar visible (0=no, 1=yes) */
	vertical: new Uint8Array(DEFAULT_CAPACITY),
	/** Horizontal scrollbar visible (0=no, 1=yes) */
	horizontal: new Uint8Array(DEFAULT_CAPACITY),
	/** Track character for vertical scrollbar */
	trackChar: new Uint32Array(DEFAULT_CAPACITY),
	/** Thumb character for vertical scrollbar */
	thumbChar: new Uint32Array(DEFAULT_CAPACITY),
	/** Track character for horizontal scrollbar */
	trackCharH: new Uint32Array(DEFAULT_CAPACITY),
	/** Thumb character for horizontal scrollbar */
	thumbCharH: new Uint32Array(DEFAULT_CAPACITY),
	/** Track color (packed RGBA) */
	trackColor: new Uint32Array(DEFAULT_CAPACITY),
	/** Thumb color (packed RGBA) */
	thumbColor: new Uint32Array(DEFAULT_CAPACITY),
	/** Always show scrollbar (0=auto, 1=always) */
	alwaysShow: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Scrollbar configuration options.
 */
export interface ScrollbarOptions {
	/** Enable or disable scrollbar */
	enabled?: boolean;
	/** Show vertical scrollbar */
	vertical?: boolean;
	/** Show horizontal scrollbar */
	horizontal?: boolean;
	/** Track character for vertical scrollbar */
	trackChar?: number;
	/** Thumb character for vertical scrollbar */
	thumbChar?: number;
	/** Track character for horizontal scrollbar */
	trackCharH?: number;
	/** Thumb character for horizontal scrollbar */
	thumbCharH?: number;
	/** Track color (hex string or packed number) */
	trackColor?: string | number;
	/** Thumb color (hex string or packed number) */
	thumbColor?: string | number;
	/** Always show scrollbar (even when content fits) */
	alwaysShow?: boolean;
}

/**
 * Scrollbar data returned by getScrollbar.
 */
export interface ScrollbarData {
	readonly enabled: boolean;
	readonly vertical: boolean;
	readonly horizontal: boolean;
	readonly trackChar: number;
	readonly thumbChar: number;
	readonly trackCharH: number;
	readonly thumbCharH: number;
	readonly trackColor: number;
	readonly thumbColor: number;
	readonly alwaysShow: boolean;
}

/**
 * Scrollbar render position for a single cell.
 */
export interface ScrollbarRenderCell {
	readonly x: number;
	readonly y: number;
	readonly char: number;
	readonly color: number;
	readonly isThumb: boolean;
}

/**
 * Initializes a Scrollbar component with default values.
 */
function initScrollbar(eid: Entity): void {
	Scrollbar.enabled[eid] = 1;
	Scrollbar.vertical[eid] = 1;
	Scrollbar.horizontal[eid] = 1;
	Scrollbar.trackChar[eid] = DEFAULT_TRACK_CHAR;
	Scrollbar.thumbChar[eid] = DEFAULT_THUMB_CHAR;
	Scrollbar.trackCharH[eid] = DEFAULT_TRACK_CHAR_H;
	Scrollbar.thumbCharH[eid] = DEFAULT_THUMB_CHAR;
	Scrollbar.trackColor[eid] = DEFAULT_TRACK_COLOR;
	Scrollbar.thumbColor[eid] = DEFAULT_THUMB_COLOR;
	Scrollbar.alwaysShow[eid] = 0;
}

/**
 * Ensures an entity has the Scrollbar component, initializing if needed.
 */
function ensureScrollbar(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Scrollbar)) {
		addComponent(world, eid, Scrollbar);
		initScrollbar(eid);
	}
}

/**
 * Applies boolean scrollbar options.
 * @internal
 */
function applyScrollbarBooleans(eid: Entity, options: ScrollbarOptions): void {
	if (options.enabled !== undefined) Scrollbar.enabled[eid] = options.enabled ? 1 : 0;
	if (options.vertical !== undefined) Scrollbar.vertical[eid] = options.vertical ? 1 : 0;
	if (options.horizontal !== undefined) Scrollbar.horizontal[eid] = options.horizontal ? 1 : 0;
	if (options.alwaysShow !== undefined) Scrollbar.alwaysShow[eid] = options.alwaysShow ? 1 : 0;
}

/**
 * Applies character scrollbar options.
 * @internal
 */
function applyScrollbarChars(eid: Entity, options: ScrollbarOptions): void {
	if (options.trackChar !== undefined) Scrollbar.trackChar[eid] = options.trackChar;
	if (options.thumbChar !== undefined) Scrollbar.thumbChar[eid] = options.thumbChar;
	if (options.trackCharH !== undefined) Scrollbar.trackCharH[eid] = options.trackCharH;
	if (options.thumbCharH !== undefined) Scrollbar.thumbCharH[eid] = options.thumbCharH;
}

/**
 * Applies color scrollbar options.
 * @internal
 */
function applyScrollbarColors(eid: Entity, options: ScrollbarOptions): void {
	if (options.trackColor !== undefined) Scrollbar.trackColor[eid] = parseColor(options.trackColor);
	if (options.thumbColor !== undefined) Scrollbar.thumbColor[eid] = parseColor(options.thumbColor);
}

/**
 * Applies scrollbar options to an entity.
 * @internal
 */
function applyScrollbarOptions(eid: Entity, options: ScrollbarOptions): void {
	applyScrollbarBooleans(eid, options);
	applyScrollbarChars(eid, options);
	applyScrollbarColors(eid, options);
}

/**
 * Sets the scrollbar configuration of an entity.
 * Adds the Scrollbar component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Scrollbar configuration options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setScrollbar } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * // Enable scrollbar with default settings
 * setScrollbar(world, entity, { enabled: true });
 *
 * // Custom scrollbar configuration
 * setScrollbar(world, entity, {
 *   enabled: true,
 *   thumbColor: '#ff0000',
 *   trackColor: '#333333',
 *   alwaysShow: true,
 * });
 * ```
 */
export function setScrollbar(world: World, eid: Entity, options: ScrollbarOptions): Entity {
	ensureScrollbar(world, eid);
	applyScrollbarOptions(eid, options);
	return eid;
}

/**
 * Gets the scrollbar data of an entity.
 * Returns undefined if the entity doesn't have a Scrollbar component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Scrollbar data or undefined
 *
 * @example
 * ```typescript
 * import { getScrollbar } from 'blecsd';
 *
 * const scrollbar = getScrollbar(world, entity);
 * if (scrollbar?.enabled) {
 *   console.log(`Track: ${scrollbar.trackColor.toString(16)}`);
 * }
 * ```
 */
export function getScrollbar(world: World, eid: Entity): ScrollbarData | undefined {
	if (!hasComponent(world, eid, Scrollbar)) {
		return undefined;
	}
	return {
		enabled: Scrollbar.enabled[eid] === 1,
		vertical: Scrollbar.vertical[eid] === 1,
		horizontal: Scrollbar.horizontal[eid] === 1,
		trackChar: Scrollbar.trackChar[eid] as number,
		thumbChar: Scrollbar.thumbChar[eid] as number,
		trackCharH: Scrollbar.trackCharH[eid] as number,
		thumbCharH: Scrollbar.thumbCharH[eid] as number,
		trackColor: Scrollbar.trackColor[eid] as number,
		thumbColor: Scrollbar.thumbColor[eid] as number,
		alwaysShow: Scrollbar.alwaysShow[eid] === 1,
	};
}

/**
 * Checks if an entity has a Scrollbar component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Scrollbar component
 */
export function hasScrollbar(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Scrollbar);
}

/**
 * Checks if scrollbar is enabled for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if scrollbar is enabled
 */
export function isScrollbarEnabled(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollbar)) {
		return false;
	}
	return Scrollbar.enabled[eid] === 1;
}

/**
 * Enables the scrollbar for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function enableScrollbar(world: World, eid: Entity): Entity {
	ensureScrollbar(world, eid);
	Scrollbar.enabled[eid] = 1;
	return eid;
}

/**
 * Disables the scrollbar for an entity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function disableScrollbar(world: World, eid: Entity): Entity {
	if (hasComponent(world, eid, Scrollbar)) {
		Scrollbar.enabled[eid] = 0;
	}
	return eid;
}

/**
 * Sets scrollbar characters for vertical scrollbar.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param trackChar - Track character codepoint
 * @param thumbChar - Thumb character codepoint
 * @returns The entity ID for chaining
 */
export function setScrollbarChars(
	world: World,
	eid: Entity,
	trackChar: number,
	thumbChar: number,
): Entity {
	ensureScrollbar(world, eid);
	Scrollbar.trackChar[eid] = trackChar;
	Scrollbar.thumbChar[eid] = thumbChar;
	return eid;
}

/**
 * Sets scrollbar colors.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param trackColor - Track color (hex string or packed number)
 * @param thumbColor - Thumb color (hex string or packed number)
 * @returns The entity ID for chaining
 */
export function setScrollbarColors(
	world: World,
	eid: Entity,
	trackColor: string | number,
	thumbColor: string | number,
): Entity {
	ensureScrollbar(world, eid);
	Scrollbar.trackColor[eid] = parseColor(trackColor);
	Scrollbar.thumbColor[eid] = parseColor(thumbColor);
	return eid;
}

/**
 * Calculates vertical scrollbar render positions.
 *
 * @param x - Scrollbar X position (typically right edge of widget)
 * @param y - Scrollbar Y position (typically widget top)
 * @param height - Scrollbar height (typically widget height)
 * @param scrollOffset - Current scroll offset
 * @param scrollSize - Total scrollable content size
 * @param viewportSize - Visible area size
 * @param trackChar - Track character codepoint
 * @param thumbChar - Thumb character codepoint
 * @param trackColor - Track color
 * @param thumbColor - Thumb color
 * @returns Array of scrollbar cells to render
 *
 * @example
 * ```typescript
 * import { calculateVerticalScrollbar } from 'blecsd';
 *
 * const cells = calculateVerticalScrollbar(
 *   79, 0, 24,  // x, y, height
 *   100, 1000, 200,  // scrollOffset, scrollSize, viewportSize
 *   0x2502, 0x2588,  // track, thumb chars
 *   0xff333333, 0xff888888  // track, thumb colors
 * );
 *
 * for (const cell of cells) {
 *   renderCell(cell.x, cell.y, cell.char, cell.color);
 * }
 * ```
 */
export function calculateVerticalScrollbar(
	x: number,
	y: number,
	height: number,
	scrollOffset: number,
	scrollSize: number,
	viewportSize: number,
	trackChar: number,
	thumbChar: number,
	trackColor: number,
	thumbColor: number,
): ScrollbarRenderCell[] {
	const cells: ScrollbarRenderCell[] = [];

	if (height <= 0 || scrollSize <= 0 || viewportSize <= 0) {
		return cells;
	}

	// Calculate thumb size and position
	const scrollableRange = Math.max(0, scrollSize - viewportSize);
	if (scrollableRange === 0) {
		// Content fits, no scrolling needed
		return cells;
	}

	// Thumb size as a ratio of viewport to content size
	const thumbRatio = Math.min(1, viewportSize / scrollSize);
	const thumbHeight = Math.max(1, Math.round(height * thumbRatio));

	// Thumb position as a ratio of scroll offset to scrollable range
	const scrollRatio = scrollableRange > 0 ? scrollOffset / scrollableRange : 0;
	const thumbStart = Math.round((height - thumbHeight) * scrollRatio);

	// Render track and thumb
	for (let row = 0; row < height; row++) {
		const isThumb = row >= thumbStart && row < thumbStart + thumbHeight;
		cells.push({
			x,
			y: y + row,
			char: isThumb ? thumbChar : trackChar,
			color: isThumb ? thumbColor : trackColor,
			isThumb,
		});
	}

	return cells;
}

/**
 * Calculates horizontal scrollbar render positions.
 *
 * @param x - Scrollbar X position (typically widget left)
 * @param y - Scrollbar Y position (typically bottom edge of widget)
 * @param width - Scrollbar width (typically widget width)
 * @param scrollOffset - Current scroll offset
 * @param scrollSize - Total scrollable content size
 * @param viewportSize - Visible area size
 * @param trackChar - Track character codepoint
 * @param thumbChar - Thumb character codepoint
 * @param trackColor - Track color
 * @param thumbColor - Thumb color
 * @returns Array of scrollbar cells to render
 */
export function calculateHorizontalScrollbar(
	x: number,
	y: number,
	width: number,
	scrollOffset: number,
	scrollSize: number,
	viewportSize: number,
	trackChar: number,
	thumbChar: number,
	trackColor: number,
	thumbColor: number,
): ScrollbarRenderCell[] {
	const cells: ScrollbarRenderCell[] = [];

	if (width <= 0 || scrollSize <= 0 || viewportSize <= 0) {
		return cells;
	}

	// Calculate thumb size and position
	const scrollableRange = Math.max(0, scrollSize - viewportSize);
	if (scrollableRange === 0) {
		// Content fits, no scrolling needed
		return cells;
	}

	// Thumb size as a ratio of viewport to content size
	const thumbRatio = Math.min(1, viewportSize / scrollSize);
	const thumbWidth = Math.max(1, Math.round(width * thumbRatio));

	// Thumb position as a ratio of scroll offset to scrollable range
	const scrollRatio = scrollableRange > 0 ? scrollOffset / scrollableRange : 0;
	const thumbStart = Math.round((width - thumbWidth) * scrollRatio);

	// Render track and thumb
	for (let col = 0; col < width; col++) {
		const isThumb = col >= thumbStart && col < thumbStart + thumbWidth;
		cells.push({
			x: x + col,
			y,
			char: isThumb ? thumbChar : trackChar,
			color: isThumb ? thumbColor : trackColor,
			isThumb,
		});
	}

	return cells;
}

/**
 * Determines if vertical scrollbar should be visible.
 *
 * @param scrollSize - Total scrollable height
 * @param viewportSize - Visible area height
 * @param alwaysShow - Always show even if content fits
 * @returns true if vertical scrollbar should be shown
 */
export function shouldShowVerticalScrollbar(
	scrollSize: number,
	viewportSize: number,
	alwaysShow: boolean,
): boolean {
	if (alwaysShow) {
		return true;
	}
	return scrollSize > viewportSize;
}

/**
 * Determines if horizontal scrollbar should be visible.
 *
 * @param scrollSize - Total scrollable width
 * @param viewportSize - Visible area width
 * @param alwaysShow - Always show even if content fits
 * @returns true if horizontal scrollbar should be shown
 */
export function shouldShowHorizontalScrollbar(
	scrollSize: number,
	viewportSize: number,
	alwaysShow: boolean,
): boolean {
	if (alwaysShow) {
		return true;
	}
	return scrollSize > viewportSize;
}

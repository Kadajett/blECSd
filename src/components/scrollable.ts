/**
 * Scrollable component for scrolling support.
 * @module components/scrollable
 */

import { addComponent, hasComponent } from '../core/ecs';
import type { Entity, World } from '../core/types';

/** Default entity capacity for typed arrays */
const DEFAULT_CAPACITY = 10000;

/**
 * Scrollbar visibility mode.
 */
export enum ScrollbarVisibility {
	/** Always hidden */
	Hidden = 0,
	/** Always visible */
	Visible = 1,
	/** Visible only when content overflows */
	Auto = 2,
}

/**
 * Scrollable component store using SoA (Structure of Arrays) for performance.
 *
 * - `scrollX`, `scrollY`: Current scroll offset
 * - `scrollWidth`, `scrollHeight`: Total scrollable content size
 * - `scrollbarVisible`: Scrollbar visibility mode
 * - `trackVisible`: Whether scroll track is visible
 * - `alwaysScroll`: Always show scrollbar even when not needed
 *
 * @example
 * ```typescript
 * import { Scrollable, setScroll, getScroll, scrollBy } from 'blecsd';
 *
 * setScroll(world, entity, 0, 100);
 * scrollBy(world, entity, 0, 50);
 *
 * const scroll = getScroll(world, entity);
 * console.log(scroll.y); // 150
 * ```
 */
export const Scrollable = {
	/** Horizontal scroll offset */
	scrollX: new Float32Array(DEFAULT_CAPACITY),
	/** Vertical scroll offset */
	scrollY: new Float32Array(DEFAULT_CAPACITY),
	/** Total scrollable width */
	scrollWidth: new Float32Array(DEFAULT_CAPACITY),
	/** Total scrollable height */
	scrollHeight: new Float32Array(DEFAULT_CAPACITY),
	/** Viewport width (visible area) - used for clamping */
	viewportWidth: new Float32Array(DEFAULT_CAPACITY),
	/** Viewport height (visible area) - used for clamping */
	viewportHeight: new Float32Array(DEFAULT_CAPACITY),
	/** Scrollbar visibility mode (0=hidden, 1=visible, 2=auto) */
	scrollbarVisible: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether scroll track is visible */
	trackVisible: new Uint8Array(DEFAULT_CAPACITY),
	/** Always show scrollbar (0=no, 1=yes) */
	alwaysScroll: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether clamping is enabled (0=no, 1=yes) - default yes */
	clampEnabled: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * Scrollable configuration options.
 */
export interface ScrollableOptions {
	/** Initial horizontal scroll offset */
	scrollX?: number;
	/** Initial vertical scroll offset */
	scrollY?: number;
	/** Total scrollable width */
	scrollWidth?: number;
	/** Total scrollable height */
	scrollHeight?: number;
	/** Viewport width (visible area) */
	viewportWidth?: number;
	/** Viewport height (visible area) */
	viewportHeight?: number;
	/** Scrollbar visibility mode */
	scrollbarVisible?: ScrollbarVisibility;
	/** Whether scroll track is visible */
	trackVisible?: boolean;
	/** Always show scrollbar */
	alwaysScroll?: boolean;
	/** Whether scroll clamping is enabled (default: true) */
	clampEnabled?: boolean;
}

/**
 * Scroll position data.
 */
export interface ScrollPosition {
	readonly x: number;
	readonly y: number;
}

/**
 * Scroll percentage data.
 */
export interface ScrollPercentage {
	readonly x: number;
	readonly y: number;
}

/**
 * Full scrollable data returned by getScrollable.
 */
export interface ScrollableData {
	readonly scrollX: number;
	readonly scrollY: number;
	readonly scrollWidth: number;
	readonly scrollHeight: number;
	readonly viewportWidth: number;
	readonly viewportHeight: number;
	readonly scrollbarVisible: ScrollbarVisibility;
	readonly trackVisible: boolean;
	readonly alwaysScroll: boolean;
	readonly clampEnabled: boolean;
}

/**
 * Initializes a Scrollable component with default values.
 */
function initScrollable(eid: Entity): void {
	Scrollable.scrollX[eid] = 0;
	Scrollable.scrollY[eid] = 0;
	Scrollable.scrollWidth[eid] = 0;
	Scrollable.scrollHeight[eid] = 0;
	Scrollable.viewportWidth[eid] = 0;
	Scrollable.viewportHeight[eid] = 0;
	Scrollable.scrollbarVisible[eid] = ScrollbarVisibility.Auto;
	Scrollable.trackVisible[eid] = 1;
	Scrollable.alwaysScroll[eid] = 0;
	Scrollable.clampEnabled[eid] = 1;
}

/**
 * Ensures an entity has the Scrollable component, initializing if needed.
 */
function ensureScrollable(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, Scrollable)) {
		addComponent(world, eid, Scrollable);
		initScrollable(eid);
	}
}

/**
 * Clamps scroll position to valid bounds based on viewport and content size.
 * Only clamps when viewport dimensions are set and clamping is enabled.
 * @internal
 */
function clampScrollToBounds(eid: Entity): void {
	const clampEnabled = Scrollable.clampEnabled[eid] === 1;
	if (!clampEnabled) {
		return;
	}

	const viewportWidth = Scrollable.viewportWidth[eid] as number;
	const viewportHeight = Scrollable.viewportHeight[eid] as number;
	const scrollWidth = Scrollable.scrollWidth[eid] as number;
	const scrollHeight = Scrollable.scrollHeight[eid] as number;

	// Only clamp X if viewport width is set
	if (viewportWidth > 0) {
		const maxScrollX = Math.max(0, scrollWidth - viewportWidth);
		Scrollable.scrollX[eid] = Math.max(0, Math.min(maxScrollX, Scrollable.scrollX[eid] as number));
	} else {
		// Still clamp to minimum 0 even without viewport
		Scrollable.scrollX[eid] = Math.max(0, Scrollable.scrollX[eid] as number);
	}

	// Only clamp Y if viewport height is set
	if (viewportHeight > 0) {
		const maxScrollY = Math.max(0, scrollHeight - viewportHeight);
		Scrollable.scrollY[eid] = Math.max(0, Math.min(maxScrollY, Scrollable.scrollY[eid] as number));
	} else {
		// Still clamp to minimum 0 even without viewport
		Scrollable.scrollY[eid] = Math.max(0, Scrollable.scrollY[eid] as number);
	}
}

/**
 * Applies numeric options to scrollable arrays.
 * @internal
 */
function applyNumericOptions(eid: Entity, options: ScrollableOptions): void {
	if (options.scrollWidth !== undefined) Scrollable.scrollWidth[eid] = options.scrollWidth;
	if (options.scrollHeight !== undefined) Scrollable.scrollHeight[eid] = options.scrollHeight;
	if (options.viewportWidth !== undefined) Scrollable.viewportWidth[eid] = options.viewportWidth;
	if (options.viewportHeight !== undefined) Scrollable.viewportHeight[eid] = options.viewportHeight;
	if (options.scrollbarVisible !== undefined)
		Scrollable.scrollbarVisible[eid] = options.scrollbarVisible;
}

/**
 * Applies boolean options to scrollable arrays.
 * @internal
 */
function applyBooleanOptions(eid: Entity, options: ScrollableOptions): void {
	if (options.trackVisible !== undefined) {
		Scrollable.trackVisible[eid] = options.trackVisible ? 1 : 0;
	}
	if (options.alwaysScroll !== undefined) {
		Scrollable.alwaysScroll[eid] = options.alwaysScroll ? 1 : 0;
	}
	if (options.clampEnabled !== undefined) {
		Scrollable.clampEnabled[eid] = options.clampEnabled ? 1 : 0;
	}
}

/**
 * Applies scrollable options to an entity.
 * @internal
 */
function applyScrollableOptions(eid: Entity, options: ScrollableOptions): void {
	applyNumericOptions(eid, options);
	applyBooleanOptions(eid, options);

	// Apply scroll positions last so they get clamped if viewport is set
	if (options.scrollX !== undefined) Scrollable.scrollX[eid] = options.scrollX;
	if (options.scrollY !== undefined) Scrollable.scrollY[eid] = options.scrollY;

	// Clamp scroll after all options are applied
	clampScrollToBounds(eid);
}

/**
 * Makes an entity scrollable with the given options.
 * Adds the Scrollable component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param options - Scrollable configuration options
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { createWorld, addEntity } from '../core/ecs';
 * import { setScrollable, ScrollbarVisibility } from 'blecsd';
 *
 * const world = createWorld();
 * const entity = addEntity(world);
 *
 * setScrollable(world, entity, {
 *   scrollHeight: 1000,
 *   scrollbarVisible: ScrollbarVisibility.Auto,
 * });
 * ```
 */
export function setScrollable(world: World, eid: Entity, options: ScrollableOptions): Entity {
	ensureScrollable(world, eid);
	applyScrollableOptions(eid, options);
	return eid;
}

/**
 * Sets the scroll position of an entity.
 * Adds the Scrollable component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param x - Horizontal scroll offset
 * @param y - Vertical scroll offset
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setScroll } from 'blecsd';
 *
 * setScroll(world, entity, 0, 100);
 * ```
 */
export function setScroll(world: World, eid: Entity, x: number, y: number): Entity {
	ensureScrollable(world, eid);
	Scrollable.scrollX[eid] = x;
	Scrollable.scrollY[eid] = y;
	clampScrollToBounds(eid);
	return eid;
}

/**
 * Gets the scroll position of an entity.
 * Returns { x: 0, y: 0 } if no Scrollable component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Scroll position
 *
 * @example
 * ```typescript
 * import { getScroll } from 'blecsd';
 *
 * const scroll = getScroll(world, entity);
 * console.log(`Scroll: ${scroll.x}, ${scroll.y}`);
 * ```
 */
export function getScroll(world: World, eid: Entity): ScrollPosition {
	if (!hasComponent(world, eid, Scrollable)) {
		return { x: 0, y: 0 };
	}
	return {
		x: Scrollable.scrollX[eid] as number,
		y: Scrollable.scrollY[eid] as number,
	};
}

/**
 * Scrolls an entity by the given delta values.
 * Adds the Scrollable component if not already present.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param dx - Horizontal scroll delta
 * @param dy - Vertical scroll delta
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { scrollBy } from 'blecsd';
 *
 * // Scroll down by 50 pixels
 * scrollBy(world, entity, 0, 50);
 *
 * // Scroll right by 100 pixels
 * scrollBy(world, entity, 100, 0);
 * ```
 */
export function scrollBy(world: World, eid: Entity, dx: number, dy: number): Entity {
	ensureScrollable(world, eid);
	Scrollable.scrollX[eid] = (Scrollable.scrollX[eid] as number) + dx;
	Scrollable.scrollY[eid] = (Scrollable.scrollY[eid] as number) + dy;
	clampScrollToBounds(eid);
	return eid;
}

/**
 * Scrolls an entity to the given position.
 * Alias for setScroll for semantic clarity.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param x - Target horizontal scroll offset
 * @param y - Target vertical scroll offset
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { scrollTo } from 'blecsd';
 *
 * scrollTo(world, entity, 0, 0); // Scroll to top
 * ```
 */
export function scrollTo(world: World, eid: Entity, x: number, y: number): Entity {
	return setScroll(world, eid, x, y);
}

/**
 * Gets the scroll percentage of an entity.
 * Takes viewport size into account: percentage is based on scrollable range
 * (scrollSize - viewportSize), not total content size.
 * Returns { x: 0, y: 0 } if no scrollable area or content fits in viewport.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Scroll percentage (0-100 for each axis)
 *
 * @example
 * ```typescript
 * import { getScrollPercentage } from 'blecsd';
 *
 * const percent = getScrollPercentage(world, entity);
 * console.log(`Scrolled: ${percent.y}%`);
 * ```
 */
export function getScrollPercentage(world: World, eid: Entity): ScrollPercentage {
	if (!hasComponent(world, eid, Scrollable)) {
		return { x: 0, y: 0 };
	}

	const scrollX = Scrollable.scrollX[eid] as number;
	const scrollY = Scrollable.scrollY[eid] as number;
	const scrollWidth = Scrollable.scrollWidth[eid] as number;
	const scrollHeight = Scrollable.scrollHeight[eid] as number;
	const viewportWidth = Scrollable.viewportWidth[eid] as number;
	const viewportHeight = Scrollable.viewportHeight[eid] as number;

	// Scrollable range is content size minus viewport size
	const maxScrollX = scrollWidth - viewportWidth;
	const maxScrollY = scrollHeight - viewportHeight;

	const percentX = maxScrollX > 0 ? (scrollX / maxScrollX) * 100 : 0;
	const percentY = maxScrollY > 0 ? (scrollY / maxScrollY) * 100 : 0;

	return {
		x: Math.min(100, Math.max(0, percentX)),
		y: Math.min(100, Math.max(0, percentY)),
	};
}

/**
 * Sets the scroll position by percentage.
 * Takes viewport size into account when calculating target scroll position.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param percentX - Horizontal scroll percentage (0-100)
 * @param percentY - Vertical scroll percentage (0-100)
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setScrollPercentage } from 'blecsd';
 *
 * // Scroll to 50% vertically
 * setScrollPercentage(world, entity, 0, 50);
 *
 * // Scroll to bottom
 * setScrollPercentage(world, entity, 0, 100);
 * ```
 */
export function setScrollPercentage(
	world: World,
	eid: Entity,
	percentX: number,
	percentY: number,
): Entity {
	ensureScrollable(world, eid);

	const scrollWidth = Scrollable.scrollWidth[eid] as number;
	const scrollHeight = Scrollable.scrollHeight[eid] as number;
	const viewportWidth = Scrollable.viewportWidth[eid] as number;
	const viewportHeight = Scrollable.viewportHeight[eid] as number;

	// Clamp percentages to 0-100
	const clampedX = Math.min(100, Math.max(0, percentX));
	const clampedY = Math.min(100, Math.max(0, percentY));

	// Scrollable range is content size minus viewport size
	const maxScrollX = Math.max(0, scrollWidth - viewportWidth);
	const maxScrollY = Math.max(0, scrollHeight - viewportHeight);

	Scrollable.scrollX[eid] = (clampedX / 100) * maxScrollX;
	Scrollable.scrollY[eid] = (clampedY / 100) * maxScrollY;

	return eid;
}

/**
 * Gets the full scrollable data of an entity.
 * Returns undefined if no Scrollable component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns Scrollable data or undefined
 */
export function getScrollable(world: World, eid: Entity): ScrollableData | undefined {
	if (!hasComponent(world, eid, Scrollable)) {
		return undefined;
	}
	return {
		scrollX: Scrollable.scrollX[eid] as number,
		scrollY: Scrollable.scrollY[eid] as number,
		scrollWidth: Scrollable.scrollWidth[eid] as number,
		scrollHeight: Scrollable.scrollHeight[eid] as number,
		viewportWidth: Scrollable.viewportWidth[eid] as number,
		viewportHeight: Scrollable.viewportHeight[eid] as number,
		scrollbarVisible: Scrollable.scrollbarVisible[eid] as ScrollbarVisibility,
		trackVisible: Scrollable.trackVisible[eid] === 1,
		alwaysScroll: Scrollable.alwaysScroll[eid] === 1,
		clampEnabled: Scrollable.clampEnabled[eid] === 1,
	};
}

/**
 * Checks if an entity has a Scrollable component.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has Scrollable component
 */
export function hasScrollable(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, Scrollable);
}

/**
 * Sets the scrollable content size.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param width - Total scrollable width
 * @param height - Total scrollable height
 * @returns The entity ID for chaining
 */
export function setScrollSize(world: World, eid: Entity, width: number, height: number): Entity {
	ensureScrollable(world, eid);
	Scrollable.scrollWidth[eid] = width;
	Scrollable.scrollHeight[eid] = height;
	clampScrollToBounds(eid);
	return eid;
}

/**
 * Sets the viewport size (visible area).
 * This enables proper scroll clamping based on content vs viewport size.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param width - Viewport width
 * @param height - Viewport height
 * @returns The entity ID for chaining
 *
 * @example
 * ```typescript
 * import { setViewport, setScrollSize, scrollBy } from 'blecsd';
 *
 * // Set content size and viewport
 * setScrollSize(world, entity, 100, 1000);  // Content is 100x1000
 * setViewport(world, entity, 80, 20);       // Viewport is 80x20
 *
 * // Scroll is now clamped: maxScrollY = 1000 - 20 = 980
 * scrollBy(world, entity, 0, 2000);  // Will clamp to 980
 * ```
 */
export function setViewport(world: World, eid: Entity, width: number, height: number): Entity {
	ensureScrollable(world, eid);
	Scrollable.viewportWidth[eid] = width;
	Scrollable.viewportHeight[eid] = height;
	clampScrollToBounds(eid);
	return eid;
}

/**
 * Enables or disables scroll clamping.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param enabled - Whether clamping is enabled
 * @returns The entity ID for chaining
 */
export function setClampEnabled(world: World, eid: Entity, enabled: boolean): Entity {
	ensureScrollable(world, eid);
	Scrollable.clampEnabled[eid] = enabled ? 1 : 0;
	if (enabled) {
		clampScrollToBounds(eid);
	}
	return eid;
}

/**
 * Sets the scrollbar visibility mode.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @param visibility - Scrollbar visibility mode
 * @returns The entity ID for chaining
 */
export function setScrollbarVisibility(
	world: World,
	eid: Entity,
	visibility: ScrollbarVisibility,
): Entity {
	ensureScrollable(world, eid);
	Scrollable.scrollbarVisible[eid] = visibility;
	return eid;
}

/**
 * Scrolls an entity to the top.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function scrollToTop(world: World, eid: Entity): Entity {
	ensureScrollable(world, eid);
	Scrollable.scrollY[eid] = 0;
	return eid;
}

/**
 * Scrolls an entity to the bottom.
 * Takes viewport height into account: scrollY = scrollHeight - viewportHeight.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function scrollToBottom(world: World, eid: Entity): Entity {
	ensureScrollable(world, eid);
	const scrollHeight = Scrollable.scrollHeight[eid] as number;
	const viewportHeight = Scrollable.viewportHeight[eid] as number;
	Scrollable.scrollY[eid] = Math.max(0, scrollHeight - viewportHeight);
	return eid;
}

/**
 * Scrolls an entity to the left edge.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function scrollToLeft(world: World, eid: Entity): Entity {
	ensureScrollable(world, eid);
	Scrollable.scrollX[eid] = 0;
	return eid;
}

/**
 * Scrolls an entity to the right edge.
 * Takes viewport width into account: scrollX = scrollWidth - viewportWidth.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function scrollToRight(world: World, eid: Entity): Entity {
	ensureScrollable(world, eid);
	const scrollWidth = Scrollable.scrollWidth[eid] as number;
	const viewportWidth = Scrollable.viewportWidth[eid] as number;
	Scrollable.scrollX[eid] = Math.max(0, scrollWidth - viewportWidth);
	return eid;
}

/**
 * Checks if an entity can scroll (has content larger than visible area).
 * If viewport is set, checks if content exceeds viewport size.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has scrollable content
 */
export function canScroll(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollable)) {
		return false;
	}

	const scrollWidth = Scrollable.scrollWidth[eid] as number;
	const scrollHeight = Scrollable.scrollHeight[eid] as number;
	const viewportWidth = Scrollable.viewportWidth[eid] as number;
	const viewportHeight = Scrollable.viewportHeight[eid] as number;

	// If viewport is set, check if content exceeds viewport
	if (viewportWidth > 0 || viewportHeight > 0) {
		return scrollWidth > viewportWidth || scrollHeight > viewportHeight;
	}

	// Without viewport, any positive scroll size means scrollable
	return scrollWidth > 0 || scrollHeight > 0;
}

/**
 * Checks if an entity can scroll horizontally.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has horizontally scrollable content
 */
export function canScrollX(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollable)) {
		return false;
	}
	const scrollWidth = Scrollable.scrollWidth[eid] as number;
	const viewportWidth = Scrollable.viewportWidth[eid] as number;
	return scrollWidth > viewportWidth;
}

/**
 * Checks if an entity can scroll vertically.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has vertically scrollable content
 */
export function canScrollY(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollable)) {
		return false;
	}
	const scrollHeight = Scrollable.scrollHeight[eid] as number;
	const viewportHeight = Scrollable.viewportHeight[eid] as number;
	return scrollHeight > viewportHeight;
}

/**
 * Checks if an entity is scrolled to the top.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if scrolled to top
 */
export function isAtTop(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollable)) {
		return true;
	}
	return (Scrollable.scrollY[eid] as number) <= 0;
}

/**
 * Checks if an entity is scrolled to the bottom.
 * Takes viewport height into account: true when scrollY >= scrollHeight - viewportHeight.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if scrolled to bottom
 */
export function isAtBottom(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollable)) {
		return true;
	}
	const scrollY = Scrollable.scrollY[eid] as number;
	const scrollHeight = Scrollable.scrollHeight[eid] as number;
	const viewportHeight = Scrollable.viewportHeight[eid] as number;
	const maxScrollY = Math.max(0, scrollHeight - viewportHeight);
	return scrollY >= maxScrollY;
}

/**
 * Checks if an entity is scrolled to the left edge.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if scrolled to left
 */
export function isAtLeft(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollable)) {
		return true;
	}
	return (Scrollable.scrollX[eid] as number) <= 0;
}

/**
 * Checks if an entity is scrolled to the right edge.
 * Takes viewport width into account: true when scrollX >= scrollWidth - viewportWidth.
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if scrolled to right
 */
export function isAtRight(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollable)) {
		return true;
	}
	const scrollX = Scrollable.scrollX[eid] as number;
	const scrollWidth = Scrollable.scrollWidth[eid] as number;
	const viewportWidth = Scrollable.viewportWidth[eid] as number;
	const maxScrollX = Math.max(0, scrollWidth - viewportWidth);
	return scrollX >= maxScrollX;
}

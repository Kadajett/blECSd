/**
 * Scrollable component for scrolling support.
 * @module components/scrollable
 */

import { addComponent, hasComponent } from 'bitecs';
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
	/** Scrollbar visibility mode (0=hidden, 1=visible, 2=auto) */
	scrollbarVisible: new Uint8Array(DEFAULT_CAPACITY),
	/** Whether scroll track is visible */
	trackVisible: new Uint8Array(DEFAULT_CAPACITY),
	/** Always show scrollbar (0=no, 1=yes) */
	alwaysScroll: new Uint8Array(DEFAULT_CAPACITY),
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
	/** Scrollbar visibility mode */
	scrollbarVisible?: ScrollbarVisibility;
	/** Whether scroll track is visible */
	trackVisible?: boolean;
	/** Always show scrollbar */
	alwaysScroll?: boolean;
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
	readonly scrollbarVisible: ScrollbarVisibility;
	readonly trackVisible: boolean;
	readonly alwaysScroll: boolean;
}

/**
 * Initializes a Scrollable component with default values.
 */
function initScrollable(eid: Entity): void {
	Scrollable.scrollX[eid] = 0;
	Scrollable.scrollY[eid] = 0;
	Scrollable.scrollWidth[eid] = 0;
	Scrollable.scrollHeight[eid] = 0;
	Scrollable.scrollbarVisible[eid] = ScrollbarVisibility.Auto;
	Scrollable.trackVisible[eid] = 1;
	Scrollable.alwaysScroll[eid] = 0;
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
 * Applies scrollable options to an entity.
 * @internal
 */
function applyScrollableOptions(eid: Entity, options: ScrollableOptions): void {
	if (options.scrollX !== undefined) Scrollable.scrollX[eid] = options.scrollX;
	if (options.scrollY !== undefined) Scrollable.scrollY[eid] = options.scrollY;
	if (options.scrollWidth !== undefined) Scrollable.scrollWidth[eid] = options.scrollWidth;
	if (options.scrollHeight !== undefined) Scrollable.scrollHeight[eid] = options.scrollHeight;
	if (options.scrollbarVisible !== undefined) {
		Scrollable.scrollbarVisible[eid] = options.scrollbarVisible;
	}
	if (options.trackVisible !== undefined)
		Scrollable.trackVisible[eid] = options.trackVisible ? 1 : 0;
	if (options.alwaysScroll !== undefined)
		Scrollable.alwaysScroll[eid] = options.alwaysScroll ? 1 : 0;
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
 * import { createWorld, addEntity } from 'bitecs';
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
 * Returns { x: 0, y: 0 } if no scrollable area.
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

	const percentX = scrollWidth > 0 ? (scrollX / scrollWidth) * 100 : 0;
	const percentY = scrollHeight > 0 ? (scrollY / scrollHeight) * 100 : 0;

	return { x: percentX, y: percentY };
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
		scrollbarVisible: Scrollable.scrollbarVisible[eid] as ScrollbarVisibility,
		trackVisible: Scrollable.trackVisible[eid] === 1,
		alwaysScroll: Scrollable.alwaysScroll[eid] === 1,
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
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns The entity ID for chaining
 */
export function scrollToBottom(world: World, eid: Entity): Entity {
	ensureScrollable(world, eid);
	Scrollable.scrollY[eid] = Scrollable.scrollHeight[eid] as number;
	return eid;
}

/**
 * Checks if an entity can scroll (has content larger than visible area).
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if entity has scrollable content
 */
export function canScroll(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollable)) {
		return false;
	}
	return (
		(Scrollable.scrollWidth[eid] as number) > 0 || (Scrollable.scrollHeight[eid] as number) > 0
	);
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
 *
 * @param world - The ECS world
 * @param eid - The entity ID
 * @returns true if scrolled to bottom
 */
export function isAtBottom(world: World, eid: Entity): boolean {
	if (!hasComponent(world, eid, Scrollable)) {
		return true;
	}
	return (Scrollable.scrollY[eid] as number) >= (Scrollable.scrollHeight[eid] as number);
}

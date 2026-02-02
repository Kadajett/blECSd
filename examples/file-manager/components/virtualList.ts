/**
 * VirtualList component for virtualized rendering.
 * @module components/virtualList
 */

import { addComponent, hasComponent } from 'bitecs';
import type { Entity, World } from 'blecsd';

/** Default entity capacity */
const DEFAULT_CAPACITY = 10000;

/**
 * VirtualList component for tracking visible range in a virtualized list.
 *
 * - `totalItems`: Total number of items in the data source
 * - `visibleStart`: First visible item index
 * - `visibleCount`: Number of items visible in viewport
 * - `rowHeight`: Height of each row (1 for terminal rows)
 * - `bufferRows`: Extra rows to render above/below viewport
 */
export const VirtualList = {
	/** Total number of items in data source */
	totalItems: new Uint32Array(DEFAULT_CAPACITY),
	/** First visible item index */
	visibleStart: new Uint32Array(DEFAULT_CAPACITY),
	/** Number of items visible in viewport */
	visibleCount: new Uint16Array(DEFAULT_CAPACITY),
	/** Height of each row */
	rowHeight: new Uint8Array(DEFAULT_CAPACITY),
	/** Buffer rows above/below viewport */
	bufferRows: new Uint8Array(DEFAULT_CAPACITY),
};

/**
 * VirtualList data returned by getVirtualList.
 */
export interface VirtualListData {
	readonly totalItems: number;
	readonly visibleStart: number;
	readonly visibleCount: number;
	readonly rowHeight: number;
	readonly bufferRows: number;
}

/**
 * Visible range including buffer.
 */
export interface VisibleRange {
	/** First index to render (including buffer) */
	readonly start: number;
	/** Last index to render (exclusive, including buffer) */
	readonly end: number;
	/** Number of items to render */
	readonly count: number;
}

/**
 * Initializes a VirtualList component with default values.
 */
function initVirtualList(eid: Entity): void {
	VirtualList.totalItems[eid] = 0;
	VirtualList.visibleStart[eid] = 0;
	VirtualList.visibleCount[eid] = 0;
	VirtualList.rowHeight[eid] = 1;
	VirtualList.bufferRows[eid] = 5;
}

/**
 * Ensures an entity has the VirtualList component.
 */
function ensureVirtualList(world: World, eid: Entity): void {
	if (!hasComponent(world, eid, VirtualList)) {
		addComponent(world, eid, VirtualList);
		initVirtualList(eid);
	}
}

/**
 * VirtualList configuration options.
 */
export interface VirtualListOptions {
	totalItems?: number;
	visibleStart?: number;
	visibleCount?: number;
	rowHeight?: number;
	bufferRows?: number;
}

/**
 * Sets up the VirtualList component on an entity.
 */
export function setVirtualList(world: World, eid: Entity, options?: VirtualListOptions): Entity {
	ensureVirtualList(world, eid);

	if (options?.totalItems !== undefined) {
		VirtualList.totalItems[eid] = options.totalItems;
	}
	if (options?.visibleStart !== undefined) {
		VirtualList.visibleStart[eid] = options.visibleStart;
	}
	if (options?.visibleCount !== undefined) {
		VirtualList.visibleCount[eid] = options.visibleCount;
	}
	if (options?.rowHeight !== undefined) {
		VirtualList.rowHeight[eid] = options.rowHeight;
	}
	if (options?.bufferRows !== undefined) {
		VirtualList.bufferRows[eid] = options.bufferRows;
	}

	return eid;
}

/**
 * Gets the VirtualList data for an entity.
 */
export function getVirtualList(world: World, eid: Entity): VirtualListData | undefined {
	if (!hasComponent(world, eid, VirtualList)) {
		return undefined;
	}
	return {
		totalItems: VirtualList.totalItems[eid] as number,
		visibleStart: VirtualList.visibleStart[eid] as number,
		visibleCount: VirtualList.visibleCount[eid] as number,
		rowHeight: VirtualList.rowHeight[eid] as number,
		bufferRows: VirtualList.bufferRows[eid] as number,
	};
}

/**
 * Updates the total items count.
 */
export function setTotalItems(world: World, eid: Entity, count: number): Entity {
	ensureVirtualList(world, eid);
	VirtualList.totalItems[eid] = count;
	return eid;
}

/**
 * Updates the visible start index.
 */
export function setVisibleStart(world: World, eid: Entity, start: number): Entity {
	ensureVirtualList(world, eid);
	VirtualList.visibleStart[eid] = Math.max(0, start);
	return eid;
}

/**
 * Updates the visible count (viewport height in items).
 */
export function setVisibleCount(world: World, eid: Entity, count: number): Entity {
	ensureVirtualList(world, eid);
	VirtualList.visibleCount[eid] = count;
	return eid;
}

/**
 * Calculates the visible range including buffer rows.
 */
export function getVisibleRange(world: World, eid: Entity): VisibleRange {
	if (!hasComponent(world, eid, VirtualList)) {
		return { start: 0, end: 0, count: 0 };
	}

	const totalItems = VirtualList.totalItems[eid] as number;
	const visibleStart = VirtualList.visibleStart[eid] as number;
	const visibleCount = VirtualList.visibleCount[eid] as number;
	const bufferRows = VirtualList.bufferRows[eid] as number;

	const start = Math.max(0, visibleStart - bufferRows);
	const end = Math.min(totalItems, visibleStart + visibleCount + bufferRows);
	const count = end - start;

	return { start, end, count };
}

/**
 * Ensures an index is visible by adjusting visibleStart.
 */
export function ensureIndexVisible(world: World, eid: Entity, index: number): Entity {
	ensureVirtualList(world, eid);

	const visibleStart = VirtualList.visibleStart[eid] as number;
	const visibleCount = VirtualList.visibleCount[eid] as number;
	const totalItems = VirtualList.totalItems[eid] as number;

	// Clamp index to valid range
	const clampedIndex = Math.max(0, Math.min(totalItems - 1, index));

	// Scroll up if needed
	if (clampedIndex < visibleStart) {
		VirtualList.visibleStart[eid] = clampedIndex;
	}

	// Scroll down if needed
	if (clampedIndex >= visibleStart + visibleCount) {
		VirtualList.visibleStart[eid] = clampedIndex - visibleCount + 1;
	}

	return eid;
}

/**
 * Scrolls the list by a page (visibleCount items).
 */
export function scrollPage(world: World, eid: Entity, direction: 1 | -1): Entity {
	ensureVirtualList(world, eid);

	const visibleStart = VirtualList.visibleStart[eid] as number;
	const visibleCount = VirtualList.visibleCount[eid] as number;
	const totalItems = VirtualList.totalItems[eid] as number;

	const newStart = visibleStart + direction * visibleCount;
	VirtualList.visibleStart[eid] = Math.max(0, Math.min(totalItems - visibleCount, newStart));

	return eid;
}

/**
 * Scrolls to the top of the list.
 */
export function scrollToTop(world: World, eid: Entity): Entity {
	ensureVirtualList(world, eid);
	VirtualList.visibleStart[eid] = 0;
	return eid;
}

/**
 * Scrolls to the bottom of the list.
 */
export function scrollToBottom(world: World, eid: Entity): Entity {
	ensureVirtualList(world, eid);

	const totalItems = VirtualList.totalItems[eid] as number;
	const visibleCount = VirtualList.visibleCount[eid] as number;

	VirtualList.visibleStart[eid] = Math.max(0, totalItems - visibleCount);
	return eid;
}

/**
 * Gets the scroll percentage (0-100).
 */
export function getScrollPercentage(world: World, eid: Entity): number {
	if (!hasComponent(world, eid, VirtualList)) {
		return 0;
	}

	const totalItems = VirtualList.totalItems[eid] as number;
	const visibleStart = VirtualList.visibleStart[eid] as number;
	const visibleCount = VirtualList.visibleCount[eid] as number;

	if (totalItems <= visibleCount) {
		return 100;
	}

	return Math.round((visibleStart / (totalItems - visibleCount)) * 100);
}

/**
 * Checks if entity has VirtualList component.
 */
export function hasVirtualList(world: World, eid: Entity): boolean {
	return hasComponent(world, eid, VirtualList);
}

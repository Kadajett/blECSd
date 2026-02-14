/**
 * Scroll Packed Store: Efficient scroll position storage
 *
 * Provides a thin adapter over PackedStore for scroll-related data.
 * This enables cache-friendly access patterns for scroll rendering hot paths.
 *
 * @module core/storage/scrollPackedStore
 */

import type { Entity } from '../types';
import {
	addToStore,
	createPackedStore,
	forEachInStore,
	getFromStore,
	isValidHandle,
	type PackedHandle,
	type PackedStore,
	removeFromStore,
	setInStore,
} from './packedStore';

/**
 * Scroll position data stored in the packed store.
 */
export interface ScrollData {
	/** Entity ID this scroll data belongs to */
	readonly entityId: Entity;
	/** Horizontal scroll offset */
	readonly scrollX: number;
	/** Vertical scroll offset */
	readonly scrollY: number;
}

/**
 * Scroll store wraps a PackedStore and maintains entity-to-handle mapping.
 */
export interface ScrollStore {
	/** The underlying packed store */
	readonly store: PackedStore<ScrollData>;
	/** Map from entity ID to packed handle */
	readonly entityToHandle: Map<Entity, PackedHandle>;
}

/**
 * Creates a new scroll store with optional initial capacity.
 *
 * @param initialCapacity - Initial capacity hint (default 64)
 * @returns Empty scroll store
 *
 * @example
 * ```typescript
 * import { createScrollStore, setScrollPosition } from 'blecsd';
 *
 * const scrollStore = createScrollStore();
 * setScrollPosition(scrollStore, 42, 0, 100);
 * ```
 */
export function createScrollStore(initialCapacity?: number): ScrollStore {
	return {
		store: createPackedStore<ScrollData>(initialCapacity),
		entityToHandle: new Map(),
	};
}

/**
 * Sets scroll position for an entity.
 * Creates entry if it doesn't exist, updates if it does.
 *
 * @param scrollStore - The scroll store
 * @param entityId - Entity ID
 * @param scrollX - Horizontal scroll offset
 * @param scrollY - Vertical scroll offset
 * @returns True if successful
 *
 * @example
 * ```typescript
 * setScrollPosition(scrollStore, entity, 0, 50);
 * ```
 */
export function setScrollPosition(
	scrollStore: ScrollStore,
	entityId: Entity,
	scrollX: number,
	scrollY: number,
): boolean {
	const existingHandle = scrollStore.entityToHandle.get(entityId);

	const scrollData: ScrollData = { entityId, scrollX, scrollY };

	if (existingHandle && isValidHandle(scrollStore.store, existingHandle)) {
		// Update existing
		return setInStore(scrollStore.store, existingHandle, scrollData);
	}

	// Add new
	const handle = addToStore(scrollStore.store, scrollData);
	scrollStore.entityToHandle.set(entityId, handle);
	return true;
}

/**
 * Gets scroll position for an entity.
 *
 * @param scrollStore - The scroll store
 * @param entityId - Entity ID
 * @returns Scroll data or undefined if not found
 *
 * @example
 * ```typescript
 * const scroll = getScrollPosition(scrollStore, entity);
 * if (scroll) {
 *   console.log(scroll.scrollX, scroll.scrollY);
 * }
 * ```
 */
export function getScrollPosition(
	scrollStore: ScrollStore,
	entityId: Entity,
): ScrollData | undefined {
	const handle = scrollStore.entityToHandle.get(entityId);
	if (!handle) {
		return undefined;
	}

	if (!isValidHandle(scrollStore.store, handle)) {
		scrollStore.entityToHandle.delete(entityId);
		return undefined;
	}

	return getFromStore(scrollStore.store, handle);
}

/**
 * Removes scroll position for an entity.
 *
 * @param scrollStore - The scroll store
 * @param entityId - Entity ID
 * @returns True if removed, false if not found
 *
 * @example
 * ```typescript
 * removeScrollEntity(scrollStore, entity);
 * ```
 */
export function removeScrollEntity(scrollStore: ScrollStore, entityId: Entity): boolean {
	const handle = scrollStore.entityToHandle.get(entityId);
	if (!handle) {
		return false;
	}

	scrollStore.entityToHandle.delete(entityId);
	return removeFromStore(scrollStore.store, handle);
}

/**
 * Iterates over all scroll entities.
 * Iteration is cache-friendly as it traverses the dense data array.
 *
 * @param scrollStore - The scroll store
 * @param callback - Callback for each scroll entity
 *
 * @example
 * ```typescript
 * forEachScrollEntity(scrollStore, (scrollData) => {
 *   console.log(`Entity ${scrollData.entityId}: ${scrollData.scrollX}, ${scrollData.scrollY}`);
 * });
 * ```
 */
export function forEachScrollEntity(
	scrollStore: ScrollStore,
	callback: (scrollData: ScrollData) => void,
): void {
	forEachInStore(scrollStore.store, (data) => {
		callback(data);
	});
}

/**
 * Gets the number of scroll entities in the store.
 *
 * @param scrollStore - The scroll store
 * @returns Number of scroll entities
 */
export function getScrollStoreSize(scrollStore: ScrollStore): number {
	return scrollStore.store.size;
}

/**
 * Checks if a scroll store has an entry for an entity.
 *
 * @param scrollStore - The scroll store
 * @param entityId - Entity ID
 * @returns True if entity has scroll data
 */
export function hasScrollEntity(scrollStore: ScrollStore, entityId: Entity): boolean {
	const handle = scrollStore.entityToHandle.get(entityId);
	if (!handle) {
		return false;
	}
	return isValidHandle(scrollStore.store, handle);
}

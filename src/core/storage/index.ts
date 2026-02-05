/**
 * Storage utilities for cache-friendly data structures
 *
 * @module core/storage
 */

export type { EntityHandle, EntityPool } from './entityPool';
export {
	allocateEntity,
	assertEntityAlive,
	createEntityPool,
	deallocateEntity,
	getEntityCount,
	getEntityPoolCapacity,
	isEntityAlive,
	resetEntityPool,
} from './entityPool';
export type { PackedHandle, PackedStore } from './packedStore';
export {
	addToStore,
	clearStore,
	createPackedStore,
	forEachInStore,
	getFromStore,
	getStoreCapacity,
	getStoreData,
	getStoreSize,
	isValidHandle,
	mapStore,
	removeFromStore,
	setInStore,
} from './packedStore';

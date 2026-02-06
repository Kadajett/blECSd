/**
 * Memory-efficient component storage utilities.
 *
 * Provides helpers for measuring, optimizing, and managing memory
 * for large entity counts. Includes sparse storage for rarely-used
 * components and memory pool pre-allocation.
 *
 * @module utils/componentStorage
 */

import type { PackedHandle } from '../core/storage/packedStore';
import {
	addToStore,
	createPackedStore,
	forEachInStore,
	getFromStore,
	getStoreData,
	removeFromStore,
	setInStore,
} from '../core/storage/packedStore';
import type { Entity, World } from '../core/types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Memory usage report for component storage.
 */
export interface ComponentMemoryReport {
	/** Total bytes used by all components */
	readonly totalBytes: number;
	/** Per-component byte usage */
	readonly componentBytes: ReadonlyMap<string, number>;
	/** Number of entities tracked */
	readonly entityCount: number;
	/** Average bytes per entity */
	readonly avgBytesPerEntity: number;
	/** Memory efficiency ratio (used / allocated) */
	readonly efficiency: number;
}

/**
 * Configuration for sparse component storage.
 */
export interface SparseStorageConfig {
	/** Initial capacity (default: 64) */
	readonly initialCapacity: number;
	/** Growth factor when expanding (default: 2) */
	readonly growthFactor: number;
	/** Maximum capacity before warning (default: 100000) */
	readonly maxCapacity: number;
}

/**
 * A sparse component store using Map for memory efficiency.
 * Suitable for components that only a small fraction of entities use.
 */
export interface SparseStore<T> {
	/** Gets value for an entity */
	get(eid: Entity): T | undefined;
	/** Sets value for an entity */
	set(eid: Entity, value: T): void;
	/** Checks if entity has a value */
	has(eid: Entity): boolean;
	/** Removes value for an entity */
	delete(eid: Entity): boolean;
	/** Number of stored entries */
	readonly size: number;
	/** Iterates over all entries */
	entries(): IterableIterator<[Entity, T]>;
	/** Clears all data */
	clear(): void;
	/** Estimated memory usage in bytes */
	memoryUsage(): number;
}

/**
 * Pre-allocated typed array pool for SoA components.
 */
export interface TypedArrayPool {
	/** Allocates a Float32Array from the pool */
	allocateF32(size: number): Float32Array;
	/** Allocates a Uint32Array from the pool */
	allocateU32(size: number): Uint32Array;
	/** Allocates a Uint8Array from the pool */
	allocateU8(size: number): Uint8Array;
	/** Returns an array to the pool */
	release(arr: ArrayBufferView): void;
	/** Total bytes allocated */
	readonly totalAllocated: number;
	/** Total bytes in free pool */
	readonly totalFree: number;
	/** Clears the pool */
	reset(): void;
}

/**
 * Configuration for creating a component store.
 */
export interface ComponentStoreConfig {
	/**
	 * When true, the store is backed by a PackedStore for cache-friendly
	 * dense iteration via forEach/data(). Use this for stores iterated in
	 * hot paths (widget rendering, systems).
	 *
	 * When false (default), the store is backed by a plain Map for
	 * point-lookup access with no iteration overhead.
	 */
	readonly iterable: boolean;
	/** Initial capacity hint for iterable stores (default: 64) */
	readonly initialCapacity?: number;
}

/**
 * A Map-like store that maps Entity to a value of type T.
 *
 * Depending on configuration, the backing store is either:
 * - PackedStore (iterable mode): cache-friendly dense iteration, ideal for hot paths
 * - Map (non-iterable mode): simple point lookups with minimal overhead
 *
 * The API is intentionally Map-compatible so existing `Map<Entity, T>` usage
 * can be migrated with minimal changes.
 */
export interface ComponentStore<T> {
	/** Gets the value for an entity, or undefined if not present. */
	get(eid: Entity): T | undefined;
	/** Sets (or replaces) the value for an entity. */
	set(eid: Entity, value: T): void;
	/** Returns true if the entity has a value in this store. */
	has(eid: Entity): boolean;
	/** Removes the value for an entity. Returns true if it was present. */
	delete(eid: Entity): boolean;
	/** Number of entities in the store. */
	readonly size: number;
	/** Removes all entries. */
	clear(): void;
	/**
	 * Iterates over all entries, calling fn for each.
	 * In iterable mode, iteration traverses the dense PackedStore data array
	 * for cache-friendly access. In non-iterable mode, iterates the Map.
	 */
	forEach(fn: (value: T, eid: Entity) => void): void;
	/**
	 * Returns a readonly view of the dense data array for fastest iteration.
	 * Only meaningful in iterable mode. In non-iterable mode, returns an
	 * empty frozen array.
	 *
	 * WARNING: Only elements at indices `0` through `size - 1` are live.
	 * Elements beyond `size` are stale leftovers from swap-and-pop removals.
	 * Do not modify the array structure (push/pop/splice).
	 */
	data(): readonly T[];
}

/** Shared frozen empty array returned by non-iterable data(). */
const EMPTY_ARRAY: readonly never[] = Object.freeze([]) as readonly never[];

// =============================================================================
// COMPONENT STORE
// =============================================================================

/**
 * Creates a component store that maps Entity to a value of type T.
 *
 * Use `iterable: true` for stores that need cache-friendly iteration
 * (backed by PackedStore). Use `iterable: false` (default) for stores
 * that only need point lookups (backed by Map).
 *
 * The Entity-to-PackedHandle mapping is fully internal; callers never
 * touch handles directly.
 *
 * @param config - Store configuration (iterable mode, initial capacity)
 * @returns A new component store
 *
 * @example
 * ```typescript
 * import { createComponentStore } from 'blecsd';
 *
 * // Iterable store for hot-path iteration (e.g., rendering)
 * interface TabData { label: string; active: boolean; }
 * const tabStore = createComponentStore<TabData>({ iterable: true });
 * tabStore.set(eid, { label: 'Home', active: true });
 * tabStore.forEach((data, eid) => {
 *   // Dense iteration backed by PackedStore
 * });
 *
 * // Non-iterable store for point lookups (e.g., callbacks, config)
 * const callbacks = createComponentStore<() => void>({ iterable: false });
 * callbacks.set(eid, () => console.log('clicked'));
 * const cb = callbacks.get(eid);
 * ```
 */
export function createComponentStore<T>(
	config: ComponentStoreConfig = { iterable: false },
): ComponentStore<T> {
	if (config.iterable) {
		return createIterableStore<T>(config.initialCapacity);
	}
	return createMapStore<T>();
}

/**
 * Internal: creates a PackedStore-backed component store with dense iteration.
 */
function createIterableStore<T>(initialCapacity?: number): ComponentStore<T> {
	const packed = createPackedStore<T>(initialCapacity);
	const handleMap = new Map<Entity, PackedHandle>();
	// Reverse index: handle.index -> Entity, maintained incrementally
	// so forEach never needs to rebuild it.
	const entityByIndex = new Map<number, Entity>();

	return {
		get(eid: Entity): T | undefined {
			const handle = handleMap.get(eid);
			if (!handle) {
				return undefined;
			}
			return getFromStore(packed, handle);
		},

		set(eid: Entity, value: T): void {
			const existing = handleMap.get(eid);
			if (existing) {
				setInStore(packed, existing, value);
				return;
			}
			const handle = addToStore(packed, value);
			handleMap.set(eid, handle);
			entityByIndex.set(handle.index, eid);
		},

		has(eid: Entity): boolean {
			return handleMap.has(eid);
		},

		delete(eid: Entity): boolean {
			const handle = handleMap.get(eid);
			if (!handle) {
				return false;
			}
			const removed = removeFromStore(packed, handle);
			if (removed) {
				handleMap.delete(eid);
				entityByIndex.delete(handle.index);
			}
			return removed;
		},

		get size(): number {
			return handleMap.size;
		},

		clear(): void {
			// Remove each entry so PackedStore generations stay correct
			for (const [, handle] of handleMap) {
				removeFromStore(packed, handle);
			}
			handleMap.clear();
			entityByIndex.clear();
		},

		forEach(fn: (value: T, eid: Entity) => void): void {
			forEachInStore(packed, (value, handle) => {
				const eid = entityByIndex.get(handle.index);
				if (eid !== undefined) {
					fn(value, eid);
				}
			});
		},

		data(): readonly T[] {
			return getStoreData(packed);
		},
	};
}

/**
 * Internal: creates a Map-backed component store for point lookups.
 */
function createMapStore<T>(): ComponentStore<T> {
	const store = new Map<Entity, T>();

	return {
		get(eid: Entity): T | undefined {
			return store.get(eid);
		},

		set(eid: Entity, value: T): void {
			store.set(eid, value);
		},

		has(eid: Entity): boolean {
			return store.has(eid);
		},

		delete(eid: Entity): boolean {
			return store.delete(eid);
		},

		get size(): number {
			return store.size;
		},

		clear(): void {
			store.clear();
		},

		forEach(fn: (value: T, eid: Entity) => void): void {
			store.forEach((value, eid) => {
				fn(value, eid);
			});
		},

		data(): readonly T[] {
			return EMPTY_ARRAY as readonly T[];
		},
	};
}

// =============================================================================
// SPARSE STORE
// =============================================================================

/**
 * Creates a sparse component store backed by a Map.
 * Ideal for components present on <10% of entities.
 *
 * @param _config - Optional configuration
 * @returns A new sparse store
 *
 * @example
 * ```typescript
 * import { createSparseStore } from 'blecsd';
 *
 * const debugInfo = createSparseStore<{ label: string }>();
 * debugInfo.set(eid, { label: 'Player' });
 * ```
 */
export function createSparseStore<T>(_config?: Partial<SparseStorageConfig>): SparseStore<T> {
	const store = new Map<Entity, T>();

	return {
		get: (eid: Entity): T | undefined => store.get(eid),
		set: (eid: Entity, value: T): void => {
			store.set(eid, value);
		},
		has: (eid: Entity): boolean => store.has(eid),
		delete: (eid: Entity): boolean => store.delete(eid),
		get size(): number {
			return store.size;
		},
		entries: (): IterableIterator<[Entity, T]> => store.entries(),
		clear: (): void => store.clear(),
		memoryUsage: (): number => {
			// Rough estimate: Map overhead + per-entry overhead
			const MAP_BASE = 64;
			const PER_ENTRY = 120; // key + value pointers + hash entry
			return MAP_BASE + store.size * PER_ENTRY;
		},
	};
}

// =============================================================================
// TYPED ARRAY POOL
// =============================================================================

interface PoolBucket {
	arrays: ArrayBuffer[];
}

/**
 * Creates a typed array pool for pre-allocation.
 * Reduces GC pressure from repeated allocation of component arrays.
 *
 * @returns A new typed array pool
 *
 * @example
 * ```typescript
 * import { createTypedArrayPool } from 'blecsd';
 *
 * const pool = createTypedArrayPool();
 * const positions = pool.allocateF32(10000); // Pre-allocate for 10K entities
 * ```
 */
export function createTypedArrayPool(): TypedArrayPool {
	const buckets = new Map<number, PoolBucket>();
	let totalAllocated = 0;
	let totalFree = 0;

	function getBucketSize(size: number): number {
		// Round up to nearest power of 2 for efficient bucketing
		let n = 1;
		while (n < size) n *= 2;
		return n;
	}

	function allocateBuffer(byteLength: number): ArrayBuffer {
		const bucketSize = getBucketSize(byteLength);
		const bucket = buckets.get(bucketSize);
		if (bucket && bucket.arrays.length > 0) {
			totalFree -= bucketSize;
			return bucket.arrays.pop() as ArrayBuffer;
		}
		totalAllocated += bucketSize;
		return new ArrayBuffer(bucketSize);
	}

	return {
		allocateF32(size: number): Float32Array {
			const buf = allocateBuffer(size * 4);
			return new Float32Array(buf, 0, size);
		},
		allocateU32(size: number): Uint32Array {
			const buf = allocateBuffer(size * 4);
			return new Uint32Array(buf, 0, size);
		},
		allocateU8(size: number): Uint8Array {
			const buf = allocateBuffer(size);
			return new Uint8Array(buf, 0, size);
		},
		release(arr: ArrayBufferView): void {
			const buf = arr.buffer as ArrayBuffer;
			const bucketSize = getBucketSize(buf.byteLength);
			let bucket = buckets.get(bucketSize);
			if (!bucket) {
				bucket = { arrays: [] };
				buckets.set(bucketSize, bucket);
			}
			bucket.arrays.push(buf);
			totalFree += bucketSize;
		},
		get totalAllocated(): number {
			return totalAllocated;
		},
		get totalFree(): number {
			return totalFree;
		},
		reset(): void {
			buckets.clear();
			totalAllocated = 0;
			totalFree = 0;
		},
	};
}

// =============================================================================
// MEMORY MEASUREMENT
// =============================================================================

/**
 * Estimates memory usage for a given entity count with standard components.
 *
 * @param entityCount - Number of entities to estimate for
 * @param componentCount - Average number of components per entity
 * @param bytesPerComponent - Average bytes per component field (default: 4 for f32)
 * @param fieldsPerComponent - Average fields per component (default: 4)
 * @returns Estimated memory in bytes
 *
 * @example
 * ```typescript
 * import { estimateMemoryUsage } from 'blecsd';
 *
 * const bytes = estimateMemoryUsage(100000, 5);
 * console.log(`~${(bytes / 1024 / 1024).toFixed(1)}MB for 100K entities`);
 * ```
 */
export function estimateMemoryUsage(
	entityCount: number,
	componentCount: number,
	bytesPerComponent = 4,
	fieldsPerComponent = 4,
): number {
	// bitecs SoA: each component field = TypedArray(entityCount)
	// Plus entity management overhead
	const ENTITY_OVERHEAD = 8; // Sparse set entry + generation
	const componentMemory = entityCount * componentCount * fieldsPerComponent * bytesPerComponent;
	const entityMemory = entityCount * ENTITY_OVERHEAD;
	return componentMemory + entityMemory;
}

/**
 * Generates a component memory report.
 *
 * @param world - The ECS world
 * @param components - Named components to measure
 * @returns Memory report
 *
 * @example
 * ```typescript
 * import { getComponentMemoryReport, Position, Velocity } from 'blecsd';
 *
 * const report = getComponentMemoryReport(world, {
 *   Position: Position,
 *   Velocity: Velocity,
 * });
 * console.log(`Total: ${report.totalBytes} bytes`);
 * ```
 */
export function getComponentMemoryReport(
	_world: World,
	components: Record<string, Record<string, ArrayLike<number>>>,
): ComponentMemoryReport {
	const componentBytes = new Map<string, number>();
	let totalBytes = 0;
	let entityCount = 0;

	for (const [name, component] of Object.entries(components)) {
		let bytes = 0;
		for (const field of Object.values(component)) {
			if (ArrayBuffer.isView(field)) {
				bytes += (field as ArrayBufferView).byteLength;
				entityCount = Math.max(entityCount, field.length);
			}
		}
		componentBytes.set(name, bytes);
		totalBytes += bytes;
	}

	const allocated = entityCount * componentBytes.size * 4; // rough estimate
	return {
		totalBytes,
		componentBytes,
		entityCount,
		avgBytesPerEntity: entityCount > 0 ? totalBytes / entityCount : 0,
		efficiency: allocated > 0 ? totalBytes / allocated : 1,
	};
}

/**
 * Checks if entity count is within safe memory bounds.
 *
 * @param entityCount - Current entity count
 * @param maxMemoryMB - Maximum memory in MB (default: 100)
 * @param avgComponentsPerEntity - Average components per entity (default: 5)
 * @returns Whether the entity count is within bounds
 */
export function isWithinMemoryBounds(
	entityCount: number,
	maxMemoryMB = 100,
	avgComponentsPerEntity = 5,
): boolean {
	const estimatedBytes = estimateMemoryUsage(entityCount, avgComponentsPerEntity);
	return estimatedBytes < maxMemoryMB * 1024 * 1024;
}

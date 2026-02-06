/**
 * Memory-efficient component storage utilities.
 *
 * Provides helpers for measuring, optimizing, and managing memory
 * for large entity counts. Includes sparse storage for rarely-used
 * components and memory pool pre-allocation.
 *
 * @module utils/componentStorage
 */

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
			return bucket.arrays.pop()!;
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

/**
 * Entity Pool: Stable entity handles with generation-based validation
 *
 * Provides O(1) entity allocation and deallocation with stable handles
 * that automatically invalidate when the entity is removed.
 *
 * This solves the "dangling reference" problem where a stored entity ID
 * could accidentally refer to a different entity after the original
 * was deleted and the ID reused.
 *
 * @module core/storage/entityPool
 */

/**
 * A stable handle to an entity.
 * The generation ensures stale handles are detected.
 */
export interface EntityHandle {
	/** Slot index in the pool */
	readonly index: number;
	/** Generation at time of creation (must match pool's generation to be valid) */
	readonly gen: number;
}

/**
 * Entity pool state.
 * Uses a free list for O(1) allocation/deallocation.
 */
export interface EntityPool {
	/** Generation counter for each slot (bumped on removal) */
	readonly generations: Uint32Array;
	/** Linked list of free slots (each slot stores the next free index) */
	readonly freeList: Int32Array;
	/** Head of the free list (-1 if empty) */
	freeHead: number;
	/** Total allocated capacity */
	capacity: number;
	/** Number of live entities */
	size: number;
}

/** Sentinel for end of free list */
const NO_FREE = -1;

/** Sentinel for a slot that is currently alive (not in free list) */
const ALIVE = -2;

/** Initial pool capacity */
const INITIAL_CAPACITY = 1024;

/**
 * Creates a new entity pool.
 *
 * @param initialCapacity - Initial capacity hint
 * @returns New entity pool
 *
 * @example
 * ```typescript
 * import { createEntityPool, allocateEntity } from 'blecsd';
 *
 * const pool = createEntityPool();
 * const entity = allocateEntity(pool);
 * ```
 */
export function createEntityPool(initialCapacity: number = INITIAL_CAPACITY): EntityPool {
	const capacity = Math.max(1, initialCapacity);
	const generations = new Uint32Array(capacity);
	const freeList = new Int32Array(capacity);

	// Initialize free list: each slot points to the next
	for (let i = 0; i < capacity - 1; i++) {
		freeList[i] = i + 1;
	}
	freeList[capacity - 1] = NO_FREE;

	return {
		generations,
		freeList,
		freeHead: 0,
		capacity,
		size: 0,
	};
}

/**
 * Grows the pool capacity.
 */
function growPool(pool: EntityPool): void {
	const oldCapacity = pool.capacity;
	const newCapacity = oldCapacity * 2;

	const newGenerations = new Uint32Array(newCapacity);
	newGenerations.set(pool.generations);

	const newFreeList = new Int32Array(newCapacity);
	newFreeList.set(pool.freeList);

	// Link new slots into free list
	for (let i = oldCapacity; i < newCapacity - 1; i++) {
		newFreeList[i] = i + 1;
	}
	newFreeList[newCapacity - 1] = pool.freeHead;
	pool.freeHead = oldCapacity;

	(pool as { generations: Uint32Array }).generations = newGenerations;
	(pool as { freeList: Int32Array }).freeList = newFreeList;
	pool.capacity = newCapacity;
}

/**
 * Allocates a new entity and returns a stable handle.
 *
 * @param pool - The entity pool
 * @returns Handle to the new entity
 *
 * @example
 * ```typescript
 * const entity = allocateEntity(pool);
 * // entity.index is stable, entity.gen ensures validity
 * ```
 */
export function allocateEntity(pool: EntityPool): EntityHandle {
	if (pool.freeHead === NO_FREE) {
		growPool(pool);
	}

	const index = pool.freeHead;
	const nextFree = pool.freeList[index];
	pool.freeHead = nextFree !== undefined ? nextFree : NO_FREE;
	pool.freeList[index] = ALIVE;
	pool.size++;

	const gen = pool.generations[index];
	return {
		index,
		gen: gen !== undefined ? gen : 0,
	};
}

/**
 * Checks if an entity handle is valid (points to a live entity).
 *
 * @param pool - The entity pool
 * @param handle - Handle to check
 * @returns True if the entity is alive
 *
 * @example
 * ```typescript
 * if (isEntityAlive(pool, entity)) {
 *   // Safe to use entity
 * }
 * ```
 */
export function isEntityAlive(pool: EntityPool, handle: EntityHandle): boolean {
	if (handle.index < 0 || handle.index >= pool.capacity) {
		return false;
	}
	// Check generation matches and slot is marked alive
	return pool.generations[handle.index] === handle.gen && pool.freeList[handle.index] === ALIVE;
}

/**
 * Deallocates an entity, invalidating its handle.
 *
 * @param pool - The entity pool
 * @param handle - Handle to deallocate
 * @returns True if deallocated, false if handle was invalid
 *
 * @example
 * ```typescript
 * deallocateEntity(pool, entity);
 * // entity handle is now invalid
 * // Any other code holding this handle will see isEntityAlive return false
 * ```
 */
export function deallocateEntity(pool: EntityPool, handle: EntityHandle): boolean {
	if (!isEntityAlive(pool, handle)) {
		return false;
	}

	const { index } = handle;

	// Bump generation to invalidate outstanding handles
	// Safe: isEntityAlive validated index is in bounds
	const currentGen = pool.generations[index];
	if (currentGen !== undefined) {
		pool.generations[index] = currentGen + 1;
	}

	// Add to free list
	pool.freeList[index] = pool.freeHead;
	pool.freeHead = index;
	pool.size--;

	return true;
}

/**
 * Resets the pool, invalidating all handles but retaining capacity.
 *
 * @param pool - The entity pool
 */
export function resetEntityPool(pool: EntityPool): void {
	const { capacity } = pool;

	// Bump all generations to invalidate all handles
	for (let i = 0; i < capacity; i++) {
		const gen = pool.generations[i];
		if (gen !== undefined) {
			pool.generations[i] = gen + 1;
		}
	}

	// Rebuild free list
	for (let i = 0; i < capacity - 1; i++) {
		pool.freeList[i] = i + 1;
	}
	pool.freeList[capacity - 1] = NO_FREE;
	pool.freeHead = 0;
	pool.size = 0;
}

/**
 * Gets the number of live entities.
 */
export function getEntityCount(pool: EntityPool): number {
	return pool.size;
}

/**
 * Gets the pool capacity.
 */
export function getEntityPoolCapacity(pool: EntityPool): number {
	return pool.capacity;
}

/**
 * Validates a handle and throws if invalid.
 * Useful for debug builds.
 *
 * @param pool - The entity pool
 * @param handle - Handle to validate
 * @throws Error if handle is invalid
 */
export function assertEntityAlive(pool: EntityPool, handle: EntityHandle): void {
	if (!isEntityAlive(pool, handle)) {
		throw new Error(
			`Invalid entity handle: index=${handle.index}, gen=${handle.gen}, ` +
				`current_gen=${pool.generations[handle.index] ?? 'out of bounds'}`,
		);
	}
}

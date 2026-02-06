/**
 * Packed Store: Cache-friendly storage with stable handles
 *
 * Implements the three-vector pattern for O(1) add/remove operations
 * with stable identifiers and cache-friendly iteration:
 *
 * - data[]: Dense contiguous storage for actual values
 * - dataIndex[]: Maps handle index → position in data array
 * - id[]: Maps position in data → handle index (inverse mapping)
 * - generations[]: Tracks generation at each slot for stale handle detection
 *
 * @module core/storage/packedStore
 */

/**
 * Handle to an element in a packed store.
 * The combination of index and generation ensures handles
 * become invalid after the element is removed.
 */
export interface PackedHandle {
	readonly index: number;
	readonly gen: number;
}

/**
 * Packed store state. All arrays are parallel structures
 * that work together to provide stable handles with O(1) operations.
 */
export interface PackedStore<T> {
	/** Dense contiguous data array for cache-friendly iteration */
	readonly data: T[];
	/** Maps handle index → position in data array */
	readonly dataIndex: Int32Array;
	/** Maps data position → handle index (inverse of dataIndex) */
	readonly id: Int32Array;
	/** Generation counter for each slot (bumped on removal) */
	readonly generations: Uint32Array;
	/** Number of live elements */
	size: number;
	/** Total allocated capacity */
	capacity: number;
}

/** Sentinel value indicating an invalid/unused slot */
const INVALID_INDEX = -1;

/** Initial capacity for new stores */
const INITIAL_CAPACITY = 64;

/**
 * Safe typed array access with default fallback.
 * TypedArrays are dense, so out-of-bounds returns undefined in strict mode.
 */
function safeGet(arr: Int32Array | Uint32Array, index: number, fallback: number): number {
	const value = arr[index];
	return value !== undefined ? value : fallback;
}

/**
 * Creates a new packed store with optional initial capacity.
 *
 * @param initialCapacity - Initial capacity hint (default 64)
 * @returns Empty packed store
 *
 * @example
 * ```typescript
 * import { createPackedStore, addToStore } from 'blecsd';
 *
 * interface Particle { x: number; y: number; vx: number; vy: number; }
 * const particles = createPackedStore<Particle>();
 * const handle = addToStore(particles, { x: 0, y: 0, vx: 1, vy: 0 });
 * ```
 */
export function createPackedStore<T>(initialCapacity: number = INITIAL_CAPACITY): PackedStore<T> {
	const capacity = Math.max(1, initialCapacity);
	return {
		data: [],
		dataIndex: new Int32Array(capacity).fill(INVALID_INDEX),
		id: new Int32Array(capacity).fill(INVALID_INDEX),
		generations: new Uint32Array(capacity),
		size: 0,
		capacity,
	};
}

/**
 * Grows the store's capacity, reallocating typed arrays.
 */
function growStore<T>(store: PackedStore<T>, minCapacity: number): void {
	const newCapacity = Math.max(minCapacity, store.capacity * 2);

	const newDataIndex = new Int32Array(newCapacity);
	newDataIndex.set(store.dataIndex);
	newDataIndex.fill(INVALID_INDEX, store.capacity);

	const newId = new Int32Array(newCapacity);
	newId.set(store.id);
	newId.fill(INVALID_INDEX, store.capacity);

	const newGenerations = new Uint32Array(newCapacity);
	newGenerations.set(store.generations);

	// TypeScript doesn't allow reassigning readonly, but we need to for internal mutation
	// The readonly is for external API consumers
	(store as { dataIndex: Int32Array }).dataIndex = newDataIndex;
	(store as { id: Int32Array }).id = newId;
	(store as { generations: Uint32Array }).generations = newGenerations;
	store.capacity = newCapacity;
}

/**
 * Adds a value to the packed store and returns a stable handle.
 *
 * If there are freed slots from prior deletions, one is reused.
 * Otherwise, capacity is expanded as needed.
 *
 * @param store - The packed store
 * @param value - Value to add
 * @returns Handle to the stored value
 *
 * @example
 * ```typescript
 * const handle = addToStore(store, { name: 'entity1' });
 * // handle.index is stable even after other elements are removed
 * ```
 */
export function addToStore<T>(store: PackedStore<T>, value: T): PackedHandle {
	const { data, dataIndex, id, generations } = store;

	// Check if we can reuse a freed slot (freed IDs are stored past 'size' in the id array)
	const freedId = safeGet(id, store.size, INVALID_INDEX);
	if (store.size < store.capacity && freedId !== INVALID_INDEX) {
		// Reuse a freed slot
		const reusedIndex = freedId;
		const dataPos = store.size;

		data[dataPos] = value;
		dataIndex[reusedIndex] = dataPos;
		id[dataPos] = reusedIndex;

		store.size++;
		return { index: reusedIndex, gen: safeGet(generations, reusedIndex, 0) };
	}

	// No freed slots available, need to allocate new
	if (store.size >= store.capacity) {
		growStore(store, store.size + 1);
	}

	const newIndex = store.size;
	const dataPos = store.size;

	data.push(value);
	store.dataIndex[newIndex] = dataPos;
	store.id[dataPos] = newIndex;

	store.size++;
	store.capacity = Math.max(store.capacity, store.size);

	// Use actual generation (may be >0 after clearStore preserved generations)
	return { index: newIndex, gen: safeGet(generations, newIndex, 0) };
}

/**
 * Checks if a handle is valid (points to a live element).
 *
 * @param store - The packed store
 * @param handle - Handle to validate
 * @returns True if the handle points to a live element
 *
 * @example
 * ```typescript
 * if (isValidHandle(store, handle)) {
 *   const value = getFromStore(store, handle);
 * }
 * ```
 */
export function isValidHandle<T>(store: PackedStore<T>, handle: PackedHandle): boolean {
	if (handle.index < 0 || handle.index >= store.capacity) {
		return false;
	}

	// Check generation matches
	const gen = store.generations[handle.index];
	if (gen === undefined || handle.gen !== gen) {
		return false;
	}

	// Check the element is actually live (dataIndex points to valid range)
	const dataPos = store.dataIndex[handle.index];
	if (dataPos === undefined || dataPos < 0 || dataPos >= store.size) {
		return false;
	}

	// Verify the inverse mapping is correct
	return store.id[dataPos] === handle.index;
}

/**
 * Gets the value associated with a handle.
 *
 * @param store - The packed store
 * @param handle - Handle to the element
 * @returns The value, or undefined if handle is invalid
 *
 * @example
 * ```typescript
 * const particle = getFromStore(particles, handle);
 * if (particle) {
 *   console.log(particle.x, particle.y);
 * }
 * ```
 */
export function getFromStore<T>(store: PackedStore<T>, handle: PackedHandle): T | undefined {
	if (!isValidHandle(store, handle)) {
		return undefined;
	}
	const dataPos = store.dataIndex[handle.index];
	if (dataPos === undefined) {
		return undefined;
	}
	return store.data[dataPos];
}

/**
 * Sets (replaces) the value at a handle.
 *
 * @param store - The packed store
 * @param handle - Handle to the element
 * @param value - New value
 * @returns True if successful, false if handle is invalid
 */
export function setInStore<T>(store: PackedStore<T>, handle: PackedHandle, value: T): boolean {
	if (!isValidHandle(store, handle)) {
		return false;
	}
	const dataPos = store.dataIndex[handle.index];
	if (dataPos === undefined) {
		return false;
	}
	store.data[dataPos] = value;
	return true;
}

/**
 * Removes an element from the packed store using swap-and-pop.
 *
 * The handle becomes invalid after removal. Any other handles
 * remain valid (this is the key benefit of the three-vector pattern).
 *
 * @param store - The packed store
 * @param handle - Handle to remove
 * @returns True if removed, false if handle was invalid
 *
 * @example
 * ```typescript
 * removeFromStore(particles, handle);
 * // handle is now invalid, but other handles remain valid
 * ```
 */
export function removeFromStore<T>(store: PackedStore<T>, handle: PackedHandle): boolean {
	if (!isValidHandle(store, handle)) {
		return false;
	}

	const { data, dataIndex, id, generations } = store;
	const dataPos = dataIndex[handle.index];
	if (dataPos === undefined) {
		return false;
	}

	const lastPos = store.size - 1;

	if (dataPos !== lastPos) {
		// Swap with last element
		const lastIndex = id[lastPos];
		const lastData = data[lastPos];
		if (lastIndex === undefined || lastData === undefined) {
			return false;
		}

		// Move last element's data to the removed position
		data[dataPos] = lastData;

		// Update mappings for the moved element
		id[dataPos] = lastIndex;
		dataIndex[lastIndex] = dataPos;

		// Store the freed index at the end (for later reuse)
		id[lastPos] = handle.index;
	}

	// Invalidate the removed handle's dataIndex
	dataIndex[handle.index] = INVALID_INDEX;

	// Bump generation to invalidate any outstanding handles
	const currentGen = generations[handle.index];
	if (currentGen !== undefined) {
		generations[handle.index] = currentGen + 1;
	}

	store.size--;

	return true;
}

/**
 * Clears all elements from the store but retains capacity.
 *
 * @param store - The packed store to clear
 */
export function clearStore<T>(store: PackedStore<T>): void {
	store.data.length = 0;
	store.dataIndex.fill(INVALID_INDEX);
	store.id.fill(INVALID_INDEX);
	// Don't reset generations - old handles should stay invalid
	store.size = 0;
}

/**
 * Iterates over all live elements in the store.
 * Iteration is cache-friendly as it traverses the dense data array.
 *
 * @param store - The packed store
 * @param fn - Callback for each element (receives value and handle)
 *
 * @example
 * ```typescript
 * forEachInStore(particles, (particle, handle) => {
 *   particle.x += particle.vx;
 *   particle.y += particle.vy;
 * });
 * ```
 */
export function forEachInStore<T>(
	store: PackedStore<T>,
	fn: (value: T, handle: PackedHandle) => void,
): void {
	const { data, id, generations } = store;
	for (let i = 0; i < store.size; i++) {
		const index = id[i];
		const value = data[i];
		if (index === undefined || value === undefined) {
			continue;
		}
		fn(value, { index, gen: safeGet(generations, index, 0) });
	}
}

/**
 * Maps over all live elements, producing a new array.
 *
 * @param store - The packed store
 * @param fn - Transform function
 * @returns Array of transformed values
 */
export function mapStore<T, U>(
	store: PackedStore<T>,
	fn: (value: T, handle: PackedHandle) => U,
): U[] {
	const { data, id, generations } = store;
	const result: U[] = [];
	for (let i = 0; i < store.size; i++) {
		const index = id[i];
		const value = data[i];
		if (index === undefined || value === undefined) {
			continue;
		}
		result.push(fn(value, { index, gen: safeGet(generations, index, 0) }));
	}
	return result;
}

/**
 * Returns the dense data array for direct iteration.
 * This is the fastest way to iterate when you don't need handles.
 *
 * WARNING: Do not modify the array structure (push/pop/splice).
 * The returned array is a view into internal storage.
 *
 * @param store - The packed store
 * @returns Readonly view of the dense data array (length = store.size)
 *
 * @example
 * ```typescript
 * // Fastest iteration when handles aren't needed
 * const data = getStoreData(particles);
 * for (let i = 0; i < particles.size; i++) {
 *   const p = data[i];
 *   p.x += p.vx;
 * }
 * ```
 */
export function getStoreData<T>(store: PackedStore<T>): readonly T[] {
	return store.data;
}

/**
 * Gets the current number of live elements.
 */
export function getStoreSize<T>(store: PackedStore<T>): number {
	return store.size;
}

/**
 * Gets the current capacity (including freed slots).
 */
export function getStoreCapacity<T>(store: PackedStore<T>): number {
	return store.capacity;
}

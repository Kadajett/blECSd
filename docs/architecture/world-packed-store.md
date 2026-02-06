# Packed Store: Cache-Friendly Storage with Stable Handles

This document describes the packed store pattern implemented in `src/core/storage/`, which provides cache-friendly data storage with stable handles for ECS-style data management.

**Status:** Implemented

## Problem Statement

When simulating many entities, storage patterns matter. Common approaches have tradeoffs:

| Approach | Iteration | Random Access | Deletion | Stable IDs |
|----------|-----------|---------------|----------|------------|
| Array | Fast (contiguous) | O(1) by index | Slow (shifts data) | No (indices change) |
| Map | Slow (hash iteration) | O(1) by key | O(1) | Yes |
| Linked List | Very slow (cache misses) | O(n) | O(1) | Yes (pointers) |

The packed store pattern combines the best properties: fast contiguous iteration, O(1) operations, and stable handles.

## The Three-Vector Pattern

The packed store uses three parallel vectors:

```
data[]      : Dense contiguous storage for actual values
dataIndex[] : Maps handle index → position in data array
id[]        : Maps position in data → handle index (inverse mapping)
generations[]: Tracks generation at each slot for stale handle detection
```

### How It Works

**Adding an element:**
1. Place value at `data[size]`
2. Record mappings: `dataIndex[newIndex] = size`, `id[size] = newIndex`
3. Return handle `{ index: newIndex, gen: generations[newIndex] }`
4. Increment size

**Removing an element (swap-and-pop):**
1. Find data position via `dataIndex[handle.index]`
2. Swap with last element in data array
3. Update mappings for the swapped element
4. Bump generation to invalidate the handle
5. Decrement size

**Iterating:**
- Simply iterate `data[0..size]` for cache-friendly traversal
- Handles are reconstructed from `id[]` if needed

## Performance Results

Benchmarks show meaningful improvements for iteration-heavy workloads:

| Scenario | PackedStore vs Map |
|----------|-------------------|
| Iteration (10k elements) | **1.64x faster** |
| Iteration (100k elements) | **1.15x faster** |
| Random access | Map is 1.33x faster |
| Add/remove churn | ~equal |
| Mixed workload (50k entities) | **1.69x faster** |

The key insight: contiguous memory layout enables CPU cache efficiency. Iterating a packed array hits the cache; iterating a Map causes cache misses.

## API Reference

### PackedStore

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createPackedStore,
  addToStore,
  getFromStore,
  setInStore,
  removeFromStore,
  isValidHandle,
  forEachInStore,
  getStoreData,
  type PackedStore,
  type PackedHandle,
} from 'blecsd';

// Create a store
interface Particle { x: number; y: number; vx: number; vy: number; }
const particles = createPackedStore<Particle>();

// Add elements
const handle = addToStore(particles, { x: 0, y: 0, vx: 1, vy: 0 });

// Access by handle
const p = getFromStore(particles, handle);
setInStore(particles, handle, { ...p, x: 10 });

// Remove (handle becomes invalid)
removeFromStore(particles, handle);
isValidHandle(particles, handle); // false

// Fast iteration (cache-friendly)
const data = getStoreData(particles);
for (let i = 0; i < particles.size; i++) {
  const p = data[i];
  p.x += p.vx;
}

// Iteration with handles
forEachInStore(particles, (particle, handle) => {
  // ...
});
```

### EntityPool

For pure entity ID allocation without associated data:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createEntityPool,
  allocateEntity,
  deallocateEntity,
  isEntityAlive,
  type EntityPool,
  type EntityHandle,
} from 'blecsd';

const pool = createEntityPool();

// Allocate
const entity = allocateEntity(pool);
// entity = { index: 0, gen: 0 }

// Check validity
isEntityAlive(pool, entity); // true

// Deallocate
deallocateEntity(pool, entity);
isEntityAlive(pool, entity); // false

// Reallocate reuses slots with bumped generation
const entity2 = allocateEntity(pool);
// entity2 = { index: 0, gen: 1 }
```

## When to Use

**Use PackedStore when:**
- Storing complex per-entity data (tables, forms, large strings)
- Iterating is more frequent than random access
- You need stable handles that survive add/remove of other elements

**Use EntityPool when:**
- You only need entity ID allocation
- You want use-after-free detection
- You're building a custom ECS layer

**Keep using Map when:**
- Random access dominates (rare in ECS)
- Data is truly sparse
- You need key-value semantics beyond integer IDs

## Relationship to bitECS

This implementation is complementary to bitECS, not a replacement:

- **bitECS** handles SoA component storage with typed arrays
- **PackedStore** handles complex per-entity data that doesn't fit SoA
- **EntityPool** provides stable handles that could wrap bitECS entity IDs

The worldAdapter (separate feature) allows plugging custom query implementations, which is orthogonal to storage layout.

## Implementation Files

- `src/core/storage/packedStore.ts` - Three-vector packed store
- `src/core/storage/entityPool.ts` - Entity allocation with generations
- `src/core/storage/index.ts` - Public exports
- `benchmarks/packed-store-bench.ts` - Performance benchmarks

## References

- Video: "The Magic Container for Game Simulations" (inspiration for three-vector pattern)
- Data-Oriented Design patterns for cache-friendly iteration
- bitECS sparse set implementation for ECS-specific optimizations

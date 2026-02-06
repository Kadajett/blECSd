# Component Storage

Memory-efficient component storage utilities for measuring, optimizing, and managing memory for large entity counts in the ECS.

## Import

```typescript
import {
  createSparseStore,
  createTypedArrayPool,
  estimateMemoryUsage,
  getComponentMemoryReport,
  isWithinMemoryBounds,
} from 'blecsd';
```

## Types

### ComponentMemoryReport

Memory usage report for component storage.

```typescript
interface ComponentMemoryReport {
  readonly totalBytes: number;
  readonly componentBytes: ReadonlyMap<string, number>;
  readonly entityCount: number;
  readonly avgBytesPerEntity: number;
  readonly efficiency: number;
}
```

### SparseStorageConfig

Configuration for sparse component storage.

```typescript
interface SparseStorageConfig {
  readonly initialCapacity: number;  // Default: 64
  readonly growthFactor: number;     // Default: 2
  readonly maxCapacity: number;      // Default: 100000
}
```

### SparseStore\<T\>

A sparse component store backed by a Map, suitable for components used by a small fraction of entities.

```typescript
interface SparseStore<T> {
  get(eid: Entity): T | undefined;
  set(eid: Entity, value: T): void;
  has(eid: Entity): boolean;
  delete(eid: Entity): boolean;
  readonly size: number;
  entries(): IterableIterator<[Entity, T]>;
  clear(): void;
  memoryUsage(): number;
}
```

### TypedArrayPool

Pre-allocated typed array pool for Structure-of-Arrays components. Reduces GC pressure from repeated allocation.

```typescript
interface TypedArrayPool {
  allocateF32(size: number): Float32Array;
  allocateU32(size: number): Uint32Array;
  allocateU8(size: number): Uint8Array;
  release(arr: ArrayBufferView): void;
  readonly totalAllocated: number;
  readonly totalFree: number;
  reset(): void;
}
```

## Functions

### createSparseStore

Creates a sparse component store backed by a Map. Ideal for components present on less than 10% of entities.

```typescript
function createSparseStore<T>(config?: Partial<SparseStorageConfig>): SparseStore<T>
```

**Parameters:**
- `config` - Optional configuration

**Returns:** A new sparse store

### createTypedArrayPool

Creates a typed array pool for pre-allocation. Arrays are bucketed by power-of-2 sizes and recycled on release.

```typescript
function createTypedArrayPool(): TypedArrayPool
```

**Returns:** A new typed array pool

### estimateMemoryUsage

Estimates memory usage for a given entity count with standard components.

```typescript
function estimateMemoryUsage(
  entityCount: number,
  componentCount: number,
  bytesPerComponent?: number,   // Default: 4 (f32)
  fieldsPerComponent?: number,  // Default: 4
): number
```

**Parameters:**
- `entityCount` - Number of entities to estimate for
- `componentCount` - Average number of components per entity
- `bytesPerComponent` - Average bytes per component field
- `fieldsPerComponent` - Average fields per component

**Returns:** Estimated memory in bytes

### getComponentMemoryReport

Generates a component memory report from actual typed arrays.

```typescript
function getComponentMemoryReport(
  world: World,
  components: Record<string, Record<string, ArrayLike<number>>>,
): ComponentMemoryReport
```

**Parameters:**
- `world` - The ECS world
- `components` - Named components to measure

**Returns:** Memory report

### isWithinMemoryBounds

Checks if entity count is within safe memory bounds.

```typescript
function isWithinMemoryBounds(
  entityCount: number,
  maxMemoryMB?: number,              // Default: 100
  avgComponentsPerEntity?: number,   // Default: 5
): boolean
```

**Returns:** Whether the entity count is within bounds

## Usage

```typescript
import { createSparseStore, createTypedArrayPool, estimateMemoryUsage } from 'blecsd';

// Sparse store for debug labels (only some entities have them)
const debugInfo = createSparseStore<{ label: string }>();
debugInfo.set(playerEid, { label: 'Player' });
debugInfo.set(bossEid, { label: 'Boss' });
console.log(debugInfo.size);           // 2
console.log(debugInfo.memoryUsage());  // estimated bytes

// Typed array pool for reducing allocations
const pool = createTypedArrayPool();
const positions = pool.allocateF32(10000);
// ... use positions ...
pool.release(positions);
console.log(pool.totalFree);  // bytes available for reuse

// Memory estimation
const bytes = estimateMemoryUsage(100000, 5);
console.log(`~${(bytes / 1024 / 1024).toFixed(1)}MB for 100K entities`);
```

---

## Related

- [Unicode](./unicode.md) - Unicode character width utilities

# Memory Profiler API

Memory profiling and leak detection for development. Tracks entity and component allocations, provides periodic snapshots, and detects common leak patterns.

## Quick Start

```typescript
import { createMemoryProfiler } from 'blecsd';

const profiler = createMemoryProfiler({
  trackedComponents: [
    { component: Position, name: 'Position' },
    { component: Renderable, name: 'Renderable' },
  ],
});

// Take snapshots
const snap1 = profiler.snapshot(world);
// ... do work ...
const snap2 = profiler.snapshot(world);

// Check for leaks
const diff = profiler.diff(snap1, snap2);
if (diff.possibleLeaks.length > 0) {
  console.warn('Possible leaks:', diff.possibleLeaks);
}

// Get a formatted report
console.log(profiler.getReport(world));
```

## Types

### MemorySnapshot

Memory snapshot at a point in time.

```typescript
interface MemorySnapshot {
  readonly timestamp: number;
  readonly entityCount: number;
  readonly componentCounts: Record<string, number>;
  readonly heapUsed: number;
  readonly heapTotal: number;
  readonly rss: number;
  readonly external: number;
}
```

### MemoryDiff

Memory diff between two snapshots.

```typescript
interface MemoryDiff {
  readonly elapsed: number;
  readonly entityCountDelta: number;
  readonly componentDeltas: Record<string, number>;
  readonly heapUsedDelta: number;
  readonly rssDelta: number;
  readonly possibleLeaks: readonly LeakWarning[];
}
```

### LeakWarning

Warning about a potential memory leak.

```typescript
interface LeakWarning {
  readonly type: 'entity' | 'component' | 'heap';
  readonly message: string;
  readonly growthRate: number;
}
```

### AllocationTracker

```typescript
interface AllocationTracker {
  readonly totalAllocated: number;
  readonly totalDeallocated: number;
  readonly currentCount: number;
  readonly componentAllocations: Record<string, number>;
}
```

### MemoryProfilerConfig

```typescript
interface MemoryProfilerConfig {
  readonly snapshotInterval: number;       // default: 5000ms
  readonly maxSnapshots: number;           // default: 100
  readonly entityLeakThreshold: number;    // default: 10 entities/sec
  readonly heapLeakThreshold: number;      // default: 1MB/sec
  readonly trackedComponents: readonly { component: unknown; name: string }[];
}
```

### MemoryProfiler

```typescript
interface MemoryProfiler {
  snapshot(world: World): MemorySnapshot;
  diff(older: MemorySnapshot, newer: MemorySnapshot): MemoryDiff;
  getSnapshots(): readonly MemorySnapshot[];
  getLatestSnapshot(): MemorySnapshot | null;
  getReport(world: World): string;
  startAutoSnapshot(world: World): void;
  stopAutoSnapshot(): void;
  reset(): void;
}
```

## Functions

### createMemoryProfiler

Creates a memory profiler for tracking allocations and detecting leaks.

```typescript
function createMemoryProfiler(config?: Partial<MemoryProfilerConfig>): MemoryProfiler;
```

**Parameters:**
- `config` - Optional configuration overrides

**Returns:** Memory profiler instance.

## MemoryProfiler Methods

### snapshot

Takes a snapshot of current memory state.

```typescript
snapshot(world: World): MemorySnapshot;
```

### diff

Compares two snapshots and detects possible leaks.

```typescript
diff(older: MemorySnapshot, newer: MemorySnapshot): MemoryDiff;
```

### getSnapshots

Gets all stored snapshots.

```typescript
getSnapshots(): readonly MemorySnapshot[];
```

### getLatestSnapshot

Gets the most recent snapshot.

```typescript
getLatestSnapshot(): MemorySnapshot | null;
```

### getReport

Gets a formatted memory report string with current stats, component counts, trends, and warnings.

```typescript
getReport(world: World): string;
```

### startAutoSnapshot / stopAutoSnapshot

Starts or stops automatic periodic snapshotting.

```typescript
startAutoSnapshot(world: World): void;
stopAutoSnapshot(): void;
```

### reset

Resets all data and stops auto-snapshotting.

```typescript
reset(): void;
```

## Usage Example

```typescript
import { createMemoryProfiler, createWorld, addEntity, Position, Renderable } from 'blecsd';

const profiler = createMemoryProfiler({
  snapshotInterval: 5000,
  maxSnapshots: 50,
  entityLeakThreshold: 5,
  heapLeakThreshold: 512 * 1024,
  trackedComponents: [
    { component: Position, name: 'Position' },
    { component: Renderable, name: 'Renderable' },
  ],
});

const world = createWorld();

// Start automatic profiling
profiler.startAutoSnapshot(world);

// In your game loop, periodically check
setInterval(() => {
  const report = profiler.getReport(world);
  console.log(report);
  // Memory Profile Report
  // ========================================
  // Entities: 150
  // Heap Used: 12.3MB
  // ...
  // Component Counts:
  //   Position: 148
  //   Renderable: 120
  //
  // Trends (over 30s):
  //   Entity delta: +15
  //   Heap delta: +256KB
  //
  // WARNINGS:
  //   [entity] Entity count growing at 12.5/sec (100 -> 150)
}, 10000);

// Manual comparison
const before = profiler.snapshot(world);
spawnManyEntities(world, 1000);
const after = profiler.snapshot(world);

const diff = profiler.diff(before, after);
console.log(`Entity delta: ${diff.entityCountDelta}`);
console.log(`Heap delta: ${diff.heapUsedDelta} bytes`);

for (const leak of diff.possibleLeaks) {
  console.warn(`[${leak.type}] ${leak.message}`);
}

// Cleanup
profiler.stopAutoSnapshot();
profiler.reset();
```

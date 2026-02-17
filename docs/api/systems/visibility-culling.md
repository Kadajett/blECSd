# Visibility Culling System API

Efficient entity visibility determination using spatial indexing with incremental update support.

## Overview

The visibility culling system handles:
- Determining which entities overlap the current viewport
- Incremental spatial hash updates (only re-indexes moved entities)
- Position caching for change detection
- Viewport-based area queries via spatial hash
- Culling statistics (visible count, culled count)

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createSpatialHash,
  createPositionCache,
  createIncrementalSpatialSystem,
  createVisibilityCullingSystem,
  queryVisibleEntities,
  LoopPhase,
} from 'blecsd';

const grid = createSpatialHash({ cellSize: 8 });
const cache = createPositionCache();

// Incremental update (only re-indexes moved entities)
const spatialSystem = createIncrementalSpatialSystem(grid, cache);
scheduler.registerSystem(LoopPhase.EARLY_UPDATE, spatialSystem);

// Query visible entities
const visible = queryVisibleEntities(grid, {
  x: 0, y: 0, width: 80, height: 24,
});
```

## Types

### Viewport

```typescript
interface Viewport {
  readonly x: number;      // Left edge
  readonly y: number;      // Top edge
  readonly width: number;
  readonly height: number;
}
```

### CullingResult

```typescript
interface CullingResult {
  readonly visible: readonly Entity[];
  readonly total: number;
  readonly culled: number;
}
```

### PositionCache

Entity position cache for incremental updates. Tracks previous position and dimensions per entity.

```typescript
interface PositionCache {
  readonly prevX: Map<number, number>;
  readonly prevY: Map<number, number>;
  readonly prevW: Map<number, number>;
  readonly prevH: Map<number, number>;
}
```

## Functions

### createPositionCache

Creates a position cache for tracking entity movement.

```typescript
function createPositionCache(): PositionCache
```

### updateEntityIfMoved

Updates a single entity in the spatial hash only if it has moved. Returns `true` if the entity was updated.

```typescript
function updateEntityIfMoved(
  grid: SpatialHashGrid,
  cache: PositionCache,
  eid: Entity,
  x: number,
  y: number,
  w: number,
  h: number,
): boolean
```

### removeFromCache

Removes an entity from the position cache.

```typescript
function removeFromCache(cache: PositionCache, eid: Entity): void
```

### clearPositionCache

Clears the entire position cache.

```typescript
function clearPositionCache(cache: PositionCache): void
```

### queryVisibleEntities

Queries which entities are visible within the given viewport using the spatial hash.

```typescript
function queryVisibleEntities(
  grid: SpatialHashGrid,
  viewport: Viewport,
): ReadonlySet<number>
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { queryVisibleEntities } from 'blecsd';

const visible = queryVisibleEntities(grid, {
  x: cameraX, y: cameraY,
  width: terminalCols, height: terminalRows,
});
```

### performCulling

Performs full visibility culling and returns categorized results with statistics.

```typescript
function performCulling(
  grid: SpatialHashGrid,
  viewport: Viewport,
  totalEntities: number,
): CullingResult
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { performCulling } from 'blecsd';

const result = performCulling(grid, viewport, 10000);
console.log(`Visible: ${result.visible.length}, Culled: ${result.culled}`);
```

### createIncrementalSpatialSystem

Creates an incremental spatial hash update system. Instead of rebuilding the entire grid each frame, it only updates entities that have moved. Much faster for scenes where most entities are static.

```typescript
function createIncrementalSpatialSystem(
  grid: SpatialHashGrid,
  cache: PositionCache,
): System
```

**Parameters:**
- `grid` - Spatial hash grid to update
- `cache` - Position cache for change detection

**Returns:** A `System` function.

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createSpatialHash,
  createPositionCache,
  createIncrementalSpatialSystem,
  LoopPhase,
} from 'blecsd';

const grid = createSpatialHash({ cellSize: 4 });
const cache = createPositionCache();
const system = createIncrementalSpatialSystem(grid, cache);

scheduler.registerSystem(LoopPhase.EARLY_UPDATE, system);
```

### createVisibilityCullingSystem

Creates a visibility culling system that queries the spatial hash each frame with the current viewport.

```typescript
function createVisibilityCullingSystem(
  grid: SpatialHashGrid,
  getViewport: () => Viewport,
): System
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { createVisibilityCullingSystem } from 'blecsd';

const cullSystem = createVisibilityCullingSystem(grid, () => ({
  x: scrollX,
  y: scrollY,
  width: terminalCols,
  height: terminalRows,
}));
```

## Usage Example

Complete visibility culling pipeline with incremental updates:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  createSpatialHash,
  createPositionCache,
  createIncrementalSpatialSystem,
  createVisibilityCullingSystem,
  performCulling,
  queryVisibleEntities,
  setPosition,
  setDimensions,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Set up spatial indexing
const grid = createSpatialHash({ cellSize: 8 });
const cache = createPositionCache();

// Incremental update: only re-indexes moved entities
const spatialSystem = createIncrementalSpatialSystem(grid, cache);
scheduler.registerSystem(LoopPhase.EARLY_UPDATE, spatialSystem);

// Create many entities
for (let i = 0; i < 10000; i++) {
  const eid = addEntity(world);
  setPosition(world, eid, Math.random() * 1000, Math.random() * 1000);
  setDimensions(world, eid, 1, 1);
}

// Camera viewport
let cameraX = 0;
let cameraY = 0;
const viewportWidth = 80;
const viewportHeight = 24;

// In render loop: only render visible entities
scheduler.run(world, 1 / 60);

const result = performCulling(grid, {
  x: cameraX,
  y: cameraY,
  width: viewportWidth,
  height: viewportHeight,
}, 10000);

console.log(`Rendering ${result.visible.length} of ${result.total} entities`);
console.log(`Culled: ${result.culled}`);

// Render only visible entities
for (const eid of result.visible) {
  // renderEntity(world, eid, cameraX, cameraY);
}
```

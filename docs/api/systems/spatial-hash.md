# Spatial Hash System API

O(1) spatial hash grid for efficient broad-phase collision detection and spatial queries.

## Overview

The spatial hash system handles:
- Partitioning 2D space into a uniform grid
- O(1) entity insertion and removal
- Area-based queries for nearby entities
- Point queries for entities at a position
- Automatic grid rebuilding from ECS world state
- Statistics reporting for grid utilization

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createSpatialHash,
  setSpatialHashGrid,
  spatialHashSystem,
  queryArea,
  getNearbyEntities,
  LoopPhase,
} from 'blecsd';

const grid = createSpatialHash({ cellSize: 8 });
setSpatialHashGrid(grid);

scheduler.registerSystem(LoopPhase.EARLY_UPDATE, spatialHashSystem);

// Query nearby entities
const nearby = queryArea(grid, playerX, playerY, 2, 2);
```

## Types

### SpatialHashConfig

```typescript
interface SpatialHashConfig {
  /** Width of each cell in world units (default: 8) */
  readonly cellSize: number;
  /** Initial number of cells in the grid (default: 256) */
  readonly initialCapacity: number;
}
```

### CellCoord

```typescript
interface CellCoord {
  readonly cx: number;
  readonly cy: number;
}
```

### SpatialHashGrid

```typescript
interface SpatialHashGrid {
  readonly cellSize: number;
  readonly cells: Map<number, Set<number>>;
  readonly entityCells: Map<number, Set<number>>;
}
```

### SpatialHashStats

```typescript
interface SpatialHashStats {
  readonly cellCount: number;
  readonly entityCount: number;
  readonly averageEntitiesPerCell: number;
  readonly maxEntitiesInCell: number;
}
```

## Constants

### DEFAULT_CELL_SIZE

Default cell size for the spatial hash grid: `8`.

```typescript
import { DEFAULT_CELL_SIZE } from 'blecsd';
```

## Functions

### createSpatialHash

Creates a new spatial hash grid.

```typescript
function createSpatialHash(config?: Partial<SpatialHashConfig>): SpatialHashGrid
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { createSpatialHash } from 'blecsd';

const grid = createSpatialHash({ cellSize: 4 });
```

### worldToCell

Gets the cell coordinate for a world position.

```typescript
function worldToCell(grid: SpatialHashGrid, x: number, y: number): CellCoord
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { createSpatialHash, worldToCell } from 'blecsd';

const grid = createSpatialHash({ cellSize: 8 });
const cell = worldToCell(grid, 15, 23);
// cell = { cx: 1, cy: 2 }
```

### insertEntity

Inserts an entity into the spatial hash at the given position and size. Automatically removes the entity from its previous position first.

```typescript
function insertEntity(
  grid: SpatialHashGrid,
  eid: Entity,
  x: number,
  y: number,
  width?: number,
  height?: number,
): void
```

### removeEntityFromGrid

Removes an entity from the spatial hash.

```typescript
function removeEntityFromGrid(grid: SpatialHashGrid, eid: Entity): void
```

### queryArea

Gets all entities in the cells that overlap the given area. This is the core broad-phase query for collision detection.

```typescript
function queryArea(
  grid: SpatialHashGrid,
  x: number,
  y: number,
  width?: number,
  height?: number,
): ReadonlySet<number>
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { queryArea } from 'blecsd';

const nearby = queryArea(grid, playerX, playerY, 2, 2);
for (const eid of nearby) {
  // Narrow-phase collision check
}
```

### getNearbyEntities

Gets potential collision candidates for an entity. Returns all entities in the same cells, excluding the entity itself.

```typescript
function getNearbyEntities(grid: SpatialHashGrid, eid: Entity): ReadonlySet<number>
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { getNearbyEntities } from 'blecsd';

const candidates = getNearbyEntities(grid, player);
for (const other of candidates) {
  // Check if actual collision
}
```

### getEntitiesInCell

Gets all entities at a specific cell coordinate.

```typescript
function getEntitiesInCell(grid: SpatialHashGrid, cx: number, cy: number): ReadonlySet<number>
```

### getEntitiesAtPoint

Gets all entities at a world position.

```typescript
function getEntitiesAtPoint(grid: SpatialHashGrid, x: number, y: number): ReadonlySet<number>
```

### clearSpatialHash

Clears all entities from the spatial hash grid.

```typescript
function clearSpatialHash(grid: SpatialHashGrid): void
```

### getSpatialHashStats

Gets statistics about the spatial hash grid.

```typescript
function getSpatialHashStats(grid: SpatialHashGrid): SpatialHashStats
```

<!-- blecsd-doccheck:ignore -->
```typescript
import { getSpatialHashStats } from 'blecsd';

const stats = getSpatialHashStats(grid);
console.log(`Cells: ${stats.cellCount}, Entities: ${stats.entityCount}`);
console.log(`Max entities per cell: ${stats.maxEntitiesInCell}`);
```

### rebuildSpatialHash

Rebuilds the spatial hash from all entities with Position and Collider components.

```typescript
function rebuildSpatialHash(grid: SpatialHashGrid, world: World): void
```

### setSpatialHashGrid

Sets the spatial hash grid for the built-in system to use.

```typescript
function setSpatialHashGrid(grid: SpatialHashGrid): void
```

### getSpatialHashGrid

Gets the current system spatial hash grid.

```typescript
function getSpatialHashGrid(): SpatialHashGrid | null
```

### spatialHashSystem

The built-in system that rebuilds the grid each frame. Register in the EARLY_UPDATE phase.

```typescript
const spatialHashSystem: System
```

### createSpatialHashSystem

Factory function that returns the spatialHashSystem.

```typescript
function createSpatialHashSystem(): System
```

## Usage Example

Complete collision detection setup:

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  createSpatialHash,
  setSpatialHashGrid,
  spatialHashSystem,
  insertEntity,
  queryArea,
  getNearbyEntities,
  getSpatialHashStats,
  setPosition,
  setCollider,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Create spatial hash with small cells for precise collision
const grid = createSpatialHash({ cellSize: 4 });
setSpatialHashGrid(grid);

// Register rebuild system in EARLY_UPDATE
scheduler.registerSystem(LoopPhase.EARLY_UPDATE, spatialHashSystem);

// Create entities with position and collider
const player = addEntity(world);
setPosition(world, player, 10, 5);
setCollider(world, player, { width: 2, height: 2 });

const enemy = addEntity(world);
setPosition(world, enemy, 12, 5);
setCollider(world, enemy, { width: 2, height: 2 });

// After system runs, query for collisions
scheduler.run(world, 1 / 60);

const candidates = getNearbyEntities(grid, player);
for (const other of candidates) {
  // Narrow-phase AABB check
  console.log(`Potential collision with entity ${other}`);
}

// Check for entities under mouse cursor
const entitiesAtMouse = queryArea(grid, mouseX, mouseY, 1, 1);

// Monitor grid efficiency
const stats = getSpatialHashStats(grid);
if (stats.maxEntitiesInCell > 50) {
  console.warn('Consider using a smaller cell size');
}
```

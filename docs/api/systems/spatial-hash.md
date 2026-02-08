# Spatial Hash System API

> **Module:** `systems/spatialHash`

Spatial hash grid for O(1) collision lookups using uniform grid partitioning with incremental update support.

## Overview

The spatial hash system partitions 2D space into a uniform grid where each cell tracks which entities overlap it. This enables efficient broad-phase collision detection by only checking entities in the same or adjacent cells.

**Key Features:**
- O(1) collision lookup performance
- Incremental updates: only re-hash entities that moved
- Automatic threshold-based full/partial rebuilds
- Configurable cell size and dirty tracking
- PackedStore-backed dirty set for cache-friendly iteration
- Position caching with change detection

**Components Used:**
- `Position` - Entity location (x, y)
- `Collider` - Collision bounds (width, height, offsetX, offsetY)

---

## Types

### SpatialHashConfig

Configuration for the spatial hash grid.

```typescript
interface SpatialHashConfig {
  readonly cellSize: number;           // Width of each cell in world units (default: 8)
  readonly initialCapacity: number;    // Initial number of cells (default: 256)
}
```

**Validation:** `SpatialHashConfigSchema` (Zod)

### SpatialHashGrid

The spatial hash grid data structure.

```typescript
interface SpatialHashGrid {
  readonly cellSize: number;                           // Cell size in world units
  readonly cells: Map<number, Set<number>>;            // Cell key → entity IDs
  readonly entityCells: Map<number, Set<number>>;      // Entity ID → cell keys
}
```

### CellCoord

A cell coordinate in the grid.

```typescript
interface CellCoord {
  readonly cx: number;  // Cell X coordinate
  readonly cy: number;  // Cell Y coordinate
}
```

### SpatialHashStats

Grid statistics.

```typescript
interface SpatialHashStats {
  readonly cellCount: number;                // Total cells in use
  readonly entityCount: number;              // Total entities tracked
  readonly averageEntitiesPerCell: number;   // Average load per cell
  readonly maxEntitiesInCell: number;        // Max entities in any cell
}
```

### SpatialHashSystemState

Internal state for incremental spatial hash updates.

```typescript
interface SpatialHashSystemState {
  readonly dirtyEntities: PackedStore<number>;       // Dense packed dirty entity IDs
  readonly dirtyLookup: Set<number>;                 // O(1) dedup lookup
  readonly prevBounds: ComponentStore<PrevBounds>;   // Position cache
  initialized: boolean;                              // Whether first frame completed
  dirtyThreshold: number;                            // Fraction for full rebuild (0.0-1.0)
}
```

### PrevBounds

Cached bounds for a single entity.

```typescript
interface PrevBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}
```

---

## Constants

### DEFAULT_CELL_SIZE

Default cell size in world units.

```typescript
const DEFAULT_CELL_SIZE = 8;
```

---

## Functions

### createSpatialHash

Creates a new spatial hash grid.

```typescript
function createSpatialHash(config?: Partial<SpatialHashConfig>): SpatialHashGrid
```

**Parameters:**
- `config` - Optional configuration overrides

**Returns:** A new spatial hash grid.

```typescript
import { createSpatialHash } from 'blecsd';

const grid = createSpatialHash({ cellSize: 4 });
```

### worldToCell

Gets the cell coordinate for a world position.

```typescript
function worldToCell(grid: SpatialHashGrid, x: number, y: number): CellCoord
```

**Parameters:**
- `grid` - The spatial hash grid
- `x` - World X coordinate
- `y` - World Y coordinate

**Returns:** The cell coordinate.

```typescript
import { createSpatialHash, worldToCell } from 'blecsd';

const grid = createSpatialHash({ cellSize: 8 });
const cell = worldToCell(grid, 15, 23);
// cell = { cx: 1, cy: 2 }
```

### insertEntity

Inserts an entity into the spatial hash at the given position and size.

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

**Parameters:**
- `grid` - The spatial hash grid
- `eid` - Entity ID
- `x` - Entity X position
- `y` - Entity Y position
- `width` - Entity width (default: 1)
- `height` - Entity height (default: 1)

```typescript
import { createSpatialHash, insertEntity } from 'blecsd';

const grid = createSpatialHash();
insertEntity(grid, entity, 10, 20, 2, 3);
```

### removeEntityFromGrid

Removes an entity from the spatial hash.

```typescript
function removeEntityFromGrid(grid: SpatialHashGrid, eid: Entity): void
```

**Parameters:**
- `grid` - The spatial hash grid
- `eid` - Entity ID to remove

```typescript
import { removeEntityFromGrid } from 'blecsd';

removeEntityFromGrid(grid, entity);
```

### queryArea

Gets all entities in the same cell(s) as the given position/area. This is the core broad-phase query for collision detection.

```typescript
function queryArea(
  grid: SpatialHashGrid,
  x: number,
  y: number,
  width?: number,
  height?: number,
): ReadonlySet<number>
```

**Parameters:**
- `grid` - The spatial hash grid
- `x` - Query X position
- `y` - Query Y position
- `width` - Query width (default: 1)
- `height` - Query height (default: 1)

**Returns:** Set of entity IDs that may overlap the query area.

```typescript
import { createSpatialHash, queryArea } from 'blecsd';

const nearby = queryArea(grid, playerX, playerY, 2, 2);
for (const eid of nearby) {
  // Check narrow-phase collision
}
```

### getNearbyEntities

Gets potential collision candidates for an entity. Returns all entities in the same cells, excluding the entity itself.

```typescript
function getNearbyEntities(grid: SpatialHashGrid, eid: Entity): ReadonlySet<number>
```

**Parameters:**
- `grid` - The spatial hash grid
- `eid` - Entity to find candidates for

**Returns:** Set of entity IDs that may collide with the given entity.

```typescript
import { getNearbyEntities } from 'blecsd';

const candidates = getNearbyEntities(grid, player);
for (const other of candidates) {
  // Narrow-phase collision check
}
```

### getEntitiesInCell

Gets all entities at a specific cell coordinate.

```typescript
function getEntitiesInCell(
  grid: SpatialHashGrid,
  cx: number,
  cy: number,
): ReadonlySet<number>
```

**Parameters:**
- `grid` - The spatial hash grid
- `cx` - Cell X coordinate
- `cy` - Cell Y coordinate

**Returns:** Set of entity IDs in that cell.

```typescript
import { getEntitiesInCell } from 'blecsd';

const entities = getEntitiesInCell(grid, 3, 5);
```

### getEntitiesAtPoint

Gets all entities at a world position.

```typescript
function getEntitiesAtPoint(
  grid: SpatialHashGrid,
  x: number,
  y: number,
): ReadonlySet<number>
```

**Parameters:**
- `grid` - The spatial hash grid
- `x` - World X coordinate
- `y` - World Y coordinate

**Returns:** Set of entity IDs at that position.

```typescript
import { getEntitiesAtPoint } from 'blecsd';

const entities = getEntitiesAtPoint(grid, 10, 20);
```

### clearSpatialHash

Clears all entities from the spatial hash grid.

```typescript
function clearSpatialHash(grid: SpatialHashGrid): void
```

```typescript
import { clearSpatialHash } from 'blecsd';

clearSpatialHash(grid);
```

### getSpatialHashStats

Gets statistics about the spatial hash grid.

```typescript
function getSpatialHashStats(grid: SpatialHashGrid): SpatialHashStats
```

**Returns:** Grid statistics.

```typescript
import { getSpatialHashStats } from 'blecsd';

const stats = getSpatialHashStats(grid);
console.log(`Cells: ${stats.cellCount}, Entities: ${stats.entityCount}`);
console.log(`Avg per cell: ${stats.averageEntitiesPerCell.toFixed(2)}`);
console.log(`Max in cell: ${stats.maxEntitiesInCell}`);
```

### rebuildSpatialHash

Rebuilds the spatial hash from all entities with Position and Collider components.

```typescript
function rebuildSpatialHash(grid: SpatialHashGrid, world: World): void
```

**Parameters:**
- `grid` - The spatial hash grid to rebuild
- `world` - The ECS world

```typescript
import { createSpatialHash, rebuildSpatialHash } from 'blecsd';

const grid = createSpatialHash({ cellSize: 4 });
rebuildSpatialHash(grid, world);
```

### createSpatialHashSystemState

Creates a fresh spatial hash system state for incremental updates.

```typescript
function createSpatialHashSystemState(dirtyThreshold?: number): SpatialHashSystemState
```

**Parameters:**
- `dirtyThreshold` - Fraction of entities above which full rebuild is used (default: 0.5)

**Returns:** New system state.

```typescript
import { createSpatialHashSystemState } from 'blecsd';

const state = createSpatialHashSystemState(0.3);
```

### setSpatialHashGrid

Sets the spatial hash grid for the system to use. Resets incremental state so the next tick performs a full rebuild.

```typescript
function setSpatialHashGrid(grid: SpatialHashGrid): void
```

```typescript
import { createSpatialHash, setSpatialHashGrid } from 'blecsd';

const grid = createSpatialHash({ cellSize: 4 });
setSpatialHashGrid(grid);
```

### getSpatialHashGrid

Gets the current system spatial hash grid.

```typescript
function getSpatialHashGrid(): SpatialHashGrid | null
```

**Returns:** The grid, or null if not set.

### getSpatialHashSystemState

Gets the current incremental update system state.

```typescript
function getSpatialHashSystemState(): SpatialHashSystemState
```

**Returns:** The system state.

### markSpatialDirty

Marks an entity as needing re-hashing on the next system tick. Use this when an external system knows an entity's position or collider changed, to avoid waiting for the position comparison scan.

```typescript
function markSpatialDirty(eid: Entity): void
```

```typescript
import { markSpatialDirty } from 'blecsd';

// After teleporting an entity, mark it dirty
Position.x[entity] = 100;
Position.y[entity] = 200;
markSpatialDirty(entity);
```

### getSpatialDirtyCount

Gets the number of entities currently marked as dirty.

```typescript
function getSpatialDirtyCount(): number
```

**Returns:** Count of dirty entities awaiting re-hash.

```typescript
import { getSpatialDirtyCount } from 'blecsd';

console.log(`${getSpatialDirtyCount()} entities need re-hashing`);
```

### resetSpatialHashState

Resets the incremental spatial hash system state. Clears dirty entities, position cache, and forces a full rebuild on next tick. Useful for testing or scene transitions.

```typescript
function resetSpatialHashState(): void
```

```typescript
import { resetSpatialHashState } from 'blecsd';

resetSpatialHashState();
```

### setSpatialDirtyThreshold

Sets the dirty threshold for the incremental update system. When the fraction of dirty entities exceeds this value, a full rebuild is used instead of incremental updates.

```typescript
function setSpatialDirtyThreshold(threshold: number): void
```

**Parameters:**
- `threshold` - Fraction between 0.0 and 1.0 (default: 0.5)

```typescript
import { setSpatialDirtyThreshold } from 'blecsd';

// Use full rebuild when more than 30% of entities moved
setSpatialDirtyThreshold(0.3);
```

### incrementalSpatialUpdate

Performs an incremental update of the spatial hash grid. Only re-inserts entities that were marked dirty (moved, resized, or new). Falls back to full rebuild when dirty count exceeds the threshold.

```typescript
function incrementalSpatialUpdate(
  grid: SpatialHashGrid,
  state: SpatialHashSystemState,
  world: World,
): void
```

**Parameters:**
- `grid` - The spatial hash grid
- `state` - The incremental update state
- `world` - The ECS world

```typescript
import {
  createSpatialHash,
  createSpatialHashSystemState,
  incrementalSpatialUpdate
} from 'blecsd';

const grid = createSpatialHash({ cellSize: 4 });
const state = createSpatialHashSystemState();
incrementalSpatialUpdate(grid, state, world);
```

### spatialHashSystem

Spatial hash system with incremental updates. On the first frame, performs a full rebuild. On subsequent frames, detects which entities moved and only re-hashes those. Falls back to full rebuild when the dirty fraction exceeds the configured threshold.

Register this in the EARLY_UPDATE phase to ensure collision queries use up-to-date spatial data.

```typescript
const spatialHashSystem: System
```

### createSpatialHashSystem

Creates a new spatial hash system.

```typescript
function createSpatialHashSystem(): System
```

**Returns:** The system function.

---

## Complete Example

Full spatial hash setup with incremental updates and collision queries:

```typescript
import {
  createWorld,
  createScheduler,
  LoopPhase,
  addEntity,
  setPosition,
  setCollider,
  createSpatialHash,
  setSpatialHashGrid,
  spatialHashSystem,
  queryArea,
  getNearbyEntities,
  getSpatialHashStats,
  markSpatialDirty,
  setSpatialDirtyThreshold,
} from 'blecsd';

// Setup
const world = createWorld();
const scheduler = createScheduler();

// Create and register spatial hash with custom settings
const grid = createSpatialHash({ cellSize: 8 });
setSpatialHashGrid(grid);
setSpatialDirtyThreshold(0.3); // Full rebuild when >30% moved

scheduler.registerSystem(LoopPhase.EARLY_UPDATE, spatialHashSystem);

// Add entities
const player = addEntity(world);
setPosition(world, player, 40, 30);
setCollider(world, player, { type: 'aabb', width: 2, height: 2, layer: 1 });

for (let i = 0; i < 100; i++) {
  const enemy = addEntity(world);
  setPosition(world, enemy, Math.random() * 100, Math.random() * 100);
  setCollider(world, enemy, { type: 'aabb', width: 1, height: 1, layer: 2 });
}

// Update loop - spatial hash updates incrementally
scheduler.run(world, 0.016);

// Query nearby entities for collision detection
const nearby = queryArea(grid, 40, 30, 10, 10);
console.log(`Found ${nearby.size} entities near player`);

// Get collision candidates for specific entity
const candidates = getNearbyEntities(grid, player);
for (const eid of candidates) {
  // Perform narrow-phase collision detection
}

// Monitor grid health
const stats = getSpatialHashStats(grid);
console.log(`Grid: ${stats.cellCount} cells, ${stats.entityCount} entities`);
console.log(`Avg per cell: ${stats.averageEntitiesPerCell.toFixed(2)}`);

// Manually mark entity as dirty after teleport
Position.x[player] = 100;
Position.y[player] = 50;
markSpatialDirty(player);
```

---

## Performance Tips

### Cell Size Selection

- **Too small** (< 2): Many cells, high memory, more lookups per query
- **Too large** (> 32): Few cells, broad-phase returns too many false positives
- **Optimal**: ~2-4x the average entity size

```typescript
// For 2x2 entities, use cellSize: 4-8
const grid = createSpatialHash({ cellSize: 4 });
```

### Dirty Threshold Tuning

The dirty threshold controls when incremental updates switch to full rebuilds:

- **Low threshold (0.1-0.3)**: Favor full rebuilds, better when most entities move each frame
- **High threshold (0.7-0.9)**: Favor incremental updates, better for mostly-static scenes
- **Default (0.5)**: Balanced for mixed scenarios

```typescript
// Mostly static scene (few entities move per frame)
setSpatialDirtyThreshold(0.8);

// Fast-paced game (most entities move per frame)
setSpatialDirtyThreshold(0.2);
```

### Manual Dirty Marking

Use `markSpatialDirty()` after large position changes (teleports, scene transitions) to avoid waiting for the automatic position scan:

```typescript
// After batch update
for (const eid of movedEntities) {
  markSpatialDirty(eid);
}
```

### Query Optimization

- Use `getNearbyEntities()` for entity-to-entity checks (excludes self)
- Use `queryArea()` for viewport culling or area-of-effect checks
- Use `getEntitiesAtPoint()` for mouse picking

---

## See Also

- [Collision System](./collisionSystem.md) - Narrow-phase collision detection
- [Visibility Culling](./visibility-culling.md) - Uses spatial hash for viewport queries
- [Position Component](../components/position.md)
- [Collider Component](../components/collider.md)

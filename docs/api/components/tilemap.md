# TileMap Components API

ECS components for 2D tile-based maps with multi-layer support, tileset management, and viewport rendering.

## Overview

The TileMap module provides three layers of functionality:
- **Tileset store** - Registers named tilesets (arrays of tile definitions with char/color)
- **Tile data store** - Manages variable-sized tile grids with multiple layers
- **TileMap component** - Per-entity reference linking a tileset and tile data together

Tile data uses `Uint16Array` for compact storage, supporting up to 65,535 tile types per tileset. Index 0 (`EMPTY_TILE`) is conventionally empty/transparent.

## Import

```typescript
import {
  TileMap,
  EMPTY_TILE,
  // Tileset store
  registerTileset,
  getTileset,
  getTilesetByName,
  unregisterTileset,
  // Tile data store
  createTileData,
  getTileData,
  removeTileData,
  setTile,
  getTile,
  fillTiles,
  fillTileRect,
  getLayerCount,
  addLayer,
  setLayerVisible,
  isLayerVisible,
  // TileMap component
  setTileMap,
  getTileMap,
  hasTileMap,
  removeTileMap,
  getTileMapDataId,
  // Rendering
  renderTileMapArea,
} from 'blecsd';
```

## Tileset Store

### registerTileset

Registers a tileset and returns its numeric ID.

```typescript
import { registerTileset } from 'blecsd';

const tilesetId = registerTileset({
  name: 'dungeon',
  tiles: [
    { char: ' ', fg: 0, bg: 0 },                    // 0: empty
    { char: '.', fg: 0x888888ff, bg: 0 },            // 1: floor
    { char: '#', fg: 0xaaaaaaff, bg: 0x444444ff },   // 2: wall
    { char: '~', fg: 0x0000ffff, bg: 0x000066ff },   // 3: water
  ],
});
```

### getTileset / getTilesetByName / unregisterTileset

```typescript
import { getTileset, getTilesetByName, unregisterTileset } from 'blecsd';

const tileset = getTileset(tilesetId);
const same = getTilesetByName('dungeon');
unregisterTileset(tilesetId);
```

## Tile Data Store

### createTileData

Creates a tile data grid with specified dimensions and layer count. Returns a data ID.

```typescript
import { createTileData } from 'blecsd';

const dataId = createTileData(32, 32, 2); // 32x32 map, 2 layers
```

### setTile / getTile

Set or get individual tiles by position and layer.

```typescript
import { setTile, getTile, EMPTY_TILE } from 'blecsd';

setTile(dataId, 0, 5, 3, 2);  // Layer 0, position (5,3), tile index 2

const tile = getTile(dataId, 0, 5, 3);
if (tile !== EMPTY_TILE) {
  // Tile is not empty
}
```

### fillTiles / fillTileRect

Fill operations for bulk tile placement.

```typescript
import { fillTiles, fillTileRect } from 'blecsd';

fillTiles(dataId, 0, 1);                // Fill entire layer with floor
fillTileRect(dataId, 0, 2, 4, 5, 3, 2); // 5x3 wall region at (2,4)
```

### Layer Management

```typescript
import { getLayerCount, addLayer, setLayerVisible, isLayerVisible } from 'blecsd';

const count = getLayerCount(dataId);     // Number of layers
const newIdx = addLayer(dataId);          // Add a new empty layer
setLayerVisible(dataId, 1, false);        // Hide layer 1
const visible = isLayerVisible(dataId, 0); // Check visibility
```

### getTileData / removeTileData

```typescript
import { getTileData, removeTileData } from 'blecsd';

const data = getTileData(dataId);
if (data) {
  console.log(`Map: ${data.width}x${data.height}, ${data.layers.length} layers`);
}

removeTileData(dataId);
```

## TileMap Component

### Component Data Layout

```typescript
const TileMap = {
  width:     Uint16Array,  // Map width in tiles
  height:    Uint16Array,  // Map height in tiles
  tileWidth: Uint8Array,   // Tile width in terminal cells
  tileHeight: Uint8Array,  // Tile height in terminal cells
  dataId:    Uint32Array,  // Reference to tile data
  tilesetId: Uint32Array,  // Reference to tileset
};
```

### setTileMap

Creates a tile map on an entity. Automatically creates tile data if not provided.

```typescript
import { setTileMap } from 'blecsd';

setTileMap(world, entity, {
  width: 20,
  height: 15,
  tilesetId: tilesetId,
  layerCount: 2,
  tileWidth: 1,   // default: 1
  tileHeight: 1,  // default: 1
});
```

**Options:**
- `width`, `height` - Map dimensions in tiles (required)
- `tilesetId` - Tileset ID (required)
- `tileWidth`, `tileHeight` - Tile size in terminal cells (default: `1`)
- `layerCount` - Number of layers (default: `1`)
- `dataId` - Existing data ID to reuse (skips creation)

### getTileMap

```typescript
import { getTileMap } from 'blecsd';

const map = getTileMap(world, entity);
if (map) {
  console.log(`Map: ${map.width}x${map.height}`);
}
```

**Returns:** `TileMapComponentData | undefined`

### hasTileMap / removeTileMap / getTileMapDataId

```typescript
import { hasTileMap, removeTileMap, getTileMapDataId } from 'blecsd';

if (hasTileMap(world, entity)) {
  const dataId = getTileMapDataId(world, entity);
  removeTileMap(world, entity);           // Removes component and tile data
  removeTileMap(world, entity, true);     // Keeps tile data in store
}
```

## Rendering

### renderTileMapArea

Renders a rectangular viewport of the tile map to a 2D array of cells. Composites all visible layers from bottom to top.

```typescript
import { renderTileMapArea } from 'blecsd';

const cells = renderTileMapArea(dataId, tilesetId, viewX, viewY, viewWidth, viewHeight);
for (let y = 0; y < cells.length; y++) {
  for (let x = 0; x < cells[y].length; x++) {
    const cell = cells[y][x];
    // Render cell.char with cell.fg and cell.bg
  }
}
```

**Returns:** `RenderedTileCell[][]` (row-major: `[y][x]`)

## Usage Example

```typescript
import { createWorld, addEntity } from 'blecsd';
import {
  registerTileset,
  setTileMap,
  getTileMapDataId,
  fillTiles,
  fillTileRect,
  setTile,
  renderTileMapArea,
} from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Register tileset
const tilesetId = registerTileset({
  name: 'dungeon',
  tiles: [
    { char: ' ', fg: 0, bg: 0 },
    { char: '.', fg: 0x888888ff, bg: 0 },
    { char: '#', fg: 0xaaaaaaff, bg: 0x444444ff },
  ],
});

// Create tile map
setTileMap(world, entity, { width: 20, height: 15, tilesetId });
const dataId = getTileMapDataId(world, entity);

// Fill with floor, then add walls
fillTiles(dataId, 0, 1);
fillTileRect(dataId, 0, 0, 0, 20, 1, 2);   // Top wall
fillTileRect(dataId, 0, 0, 14, 20, 1, 2);  // Bottom wall

// Render viewport
const cells = renderTileMapArea(dataId, tilesetId, 0, 0, 20, 15);
```

## Types

### TileDefinition

```typescript
interface TileDefinition {
  readonly char: string;
  readonly fg: number;  // Packed RGBA
  readonly bg: number;  // Packed RGBA
}
```

### TileMapComponentData

```typescript
interface TileMapComponentData {
  readonly width: number;
  readonly height: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly dataId: number;
  readonly tilesetId: number;
}
```

### TileMapLayer

```typescript
interface TileMapLayer {
  readonly tiles: Uint16Array;
  visible: boolean;
}
```

### RenderedTileCell

```typescript
interface RenderedTileCell {
  readonly char: string;
  readonly fg: number;
  readonly bg: number;
}
```

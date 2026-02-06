# Tilemap Renderer System API

ECS system for rendering tile maps to a 2D character buffer with camera support and layer compositing.

## Overview

The tilemap renderer handles:
- Rendering tile map entities to a character buffer
- Camera offset for scrolling/panning
- Multi-layer compositing (bottom-to-top)
- Visible tile range calculation for efficient rendering
- Configurable viewport dimensions
- Per-tile character, foreground, and background colors

## Quick Start

```typescript
import {
  setTileMapRendererConfig,
  tilemapRenderSystem,
  getTileMapRenderBuffer,
  LoopPhase,
} from 'blecsd';

setTileMapRendererConfig({
  viewportWidth: 80,
  viewportHeight: 24,
  camera: { x: 0, y: 0 },
});

scheduler.registerSystem(LoopPhase.RENDER, tilemapRenderSystem);

// After system runs, read the buffer
const buffer = getTileMapRenderBuffer();
```

## Types

### TileMapBuffer

A rendered tile map buffer storing the composited output.

```typescript
interface TileMapBuffer {
  readonly width: number;
  readonly height: number;
  readonly cells: RenderedTileCell[][];  // row-major: [y][x]
}
```

### TileMapCamera

```typescript
interface TileMapCamera {
  x: number;  // Camera X offset in world units
  y: number;  // Camera Y offset in world units
}
```

### TileMapRendererConfig

```typescript
interface TileMapRendererConfig {
  viewportWidth: number;
  viewportHeight: number;
  camera: TileMapCamera;
}
```

## Functions

### setTileMapRendererConfig

Sets the tile map renderer configuration. Must be called before the system runs.

```typescript
function setTileMapRendererConfig(config: TileMapRendererConfig): void
```

```typescript
import { setTileMapRendererConfig } from 'blecsd';

setTileMapRendererConfig({
  viewportWidth: 80,
  viewportHeight: 24,
  camera: { x: 0, y: 0 },
});
```

### getTileMapRendererConfig

Gets the current renderer configuration.

```typescript
function getTileMapRendererConfig(): TileMapRendererConfig | null
```

### getTileMapRenderBuffer

Gets the current render buffer after the system has run.

```typescript
function getTileMapRenderBuffer(): TileMapBuffer | null
```

```typescript
import { getTileMapRenderBuffer } from 'blecsd';

const buffer = getTileMapRenderBuffer();
if (buffer) {
  for (let y = 0; y < buffer.height; y++) {
    for (let x = 0; x < buffer.width; x++) {
      const cell = buffer.cells[y][x];
      // Use cell.char, cell.fg, cell.bg for rendering
    }
  }
}
```

### clearTileMapRenderBuffer

Clears the render buffer.

```typescript
function clearTileMapRenderBuffer(): void
```

### resetTileMapRenderer

Resets the tile map renderer state (config and buffer). Useful for testing.

```typescript
function resetTileMapRenderer(): void
```

### createEmptyBuffer

Creates an empty tile map buffer filled with space characters.

```typescript
function createEmptyBuffer(width: number, height: number): TileMapBuffer
```

### renderTileMapToBuffer

Renders a single tile map entity into a buffer with camera offset.

```typescript
function renderTileMapToBuffer(
  buffer: TileMapBuffer,
  eid: Entity,
  cameraX: number,
  cameraY: number,
): void
```

```typescript
import { createEmptyBuffer, renderTileMapToBuffer } from 'blecsd';

const buffer = createEmptyBuffer(80, 24);
renderTileMapToBuffer(buffer, mapEntity, cameraX, cameraY);
```

### renderAllTileMaps

Renders all tile map entities in the world to the render buffer using the configured viewport and camera.

```typescript
function renderAllTileMaps(world: World): TileMapBuffer | null
```

### tilemapRenderSystem

The built-in system that renders all tile maps each frame. Register in the RENDER phase.

```typescript
const tilemapRenderSystem: System
```

### createTilemapRenderSystem

Factory function that returns the tilemapRenderSystem.

```typescript
function createTilemapRenderSystem(): System
```

## Usage Example

Complete tilemap rendering with camera scrolling:

```typescript
import {
  createWorld,
  addEntity,
  createScheduler,
  setTileMapRendererConfig,
  tilemapRenderSystem,
  getTileMapRenderBuffer,
  setPosition,
  setTileMap,
  createTileset,
  createTileMapData,
  LoopPhase,
} from 'blecsd';

const world = createWorld();
const scheduler = createScheduler();

// Configure renderer
const camera = { x: 0, y: 0 };
setTileMapRendererConfig({
  viewportWidth: 80,
  viewportHeight: 24,
  camera,
});

// Register in RENDER phase
scheduler.registerSystem(LoopPhase.RENDER, tilemapRenderSystem);

// Create a tileset
const tilesetId = createTileset([
  { char: '.', fg: 0x666666, bg: 0x000000 },  // Floor
  { char: '#', fg: 0xaaaaaa, bg: 0x333333 },  // Wall
  { char: '~', fg: 0x3333ff, bg: 0x000066 },  // Water
]);

// Create tile map data
const mapData = createTileMapData(20, 15, [
  { name: 'ground', tiles: groundTiles, visible: true },
  { name: 'objects', tiles: objectTiles, visible: true },
]);

// Create tile map entity
const mapEntity = addEntity(world);
setPosition(world, mapEntity, 0, 0);
setTileMap(world, mapEntity, {
  width: 20,
  height: 15,
  tileWidth: 1,
  tileHeight: 1,
  dataId: mapData,
  tilesetId: tilesetId,
});

// Camera follows player
function updateCamera(playerX: number, playerY: number) {
  camera.x = playerX - 40;
  camera.y = playerY - 12;
}

// After system runs, use the buffer for terminal output
scheduler.run(world, 1 / 60);

const buffer = getTileMapRenderBuffer();
if (buffer) {
  for (let y = 0; y < buffer.height; y++) {
    let line = '';
    for (let x = 0; x < buffer.width; x++) {
      line += buffer.cells[y][x].char;
    }
    // Write line to terminal at row y
  }
}
```

# Sprite Components API

ECS component for frame-based sprite graphics with a global sprite sheet registry.

## Overview

The Sprite module provides two layers:
- **Sprite store** - Registers named sprite sheets containing one or more frames of 2D cell data
- **Sprite component** - Per-entity reference to a sprite sheet with current frame index

Each sprite frame is a 2D grid of cells, where each cell has a character and optional foreground/background colors. Frames are stored in the global `spriteStore` and referenced by ID.

## Import

```typescript
import {
  Sprite,
  spriteStore,
  registerSprite,
  getSpriteSheet,
  getSpriteSheetByName,
  getSpriteIdByName,
  unregisterSprite,
  setSprite,
  setSpriteByName,
  getSprite,
  getCurrentFrame,
  setFrame,
  nextFrame,
  prevFrame,
  hasSprite,
  getEntitySpriteSheet,
  removeSprite,
} from 'blecsd';
```

## Sprite Store

### registerSprite

Registers a sprite sheet and returns its numeric ID.

```typescript
import { registerSprite } from 'blecsd';

const playerId = registerSprite({
  name: 'player',
  frames: [
    [[{ char: '@' }]],           // Frame 0
    [[{ char: 'O' }]],           // Frame 1
  ],
});

// Multi-row sprite with colors
const tankId = registerSprite({
  name: 'tank',
  frames: [
    [
      [{ char: ' ', bg: 0xff0000ff }, { char: ' ', bg: 0xff0000ff }],
      [{ char: '/', fg: 0xffffffff }, { char: '\\', fg: 0xffffffff }],
    ],
  ],
});
```

**Options:**
- `name` - Human-readable name
- `frames` - Array of `SpriteFrame` (2D arrays of `SpriteCell`)
- `width` - Width in cells (inferred from first frame if omitted)
- `height` - Height in cells (inferred from first frame if omitted)

### getSpriteSheet / getSpriteSheetByName / getSpriteIdByName

```typescript
import { getSpriteSheet, getSpriteSheetByName, getSpriteIdByName } from 'blecsd';

const sheet = getSpriteSheet(playerId);
const same = getSpriteSheetByName('player');
const id = getSpriteIdByName('player');

if (sheet) {
  console.log(`${sheet.name}: ${sheet.frames.length} frames, ${sheet.width}x${sheet.height}`);
}
```

### unregisterSprite

```typescript
import { unregisterSprite } from 'blecsd';

unregisterSprite(playerId); // returns true if found
```

## Sprite Component

### Component Data Layout

```typescript
const Sprite = {
  frameIndex:    Uint16Array,  // Current animation frame (0-based)
  frameCount:    Uint16Array,  // Total frames (cached from sheet)
  frameWidth:    Uint8Array,   // Width in cells (cached from sheet)
  frameHeight:   Uint8Array,   // Height in cells (cached from sheet)
  spriteSheetId: Uint32Array,  // Reference to sprite sheet ID
};
```

### setSprite / setSpriteByName

Assigns a sprite to an entity. Adds the component if not present.

```typescript
import { setSprite, setSpriteByName } from 'blecsd';

setSprite(world, entity, playerId);
setSprite(world, entity, playerId, 1); // Start at frame 1

setSpriteByName(world, entity, 'player');
```

**Returns:** Entity ID for chaining, or `undefined` if sprite not found.

### getSprite

Returns sprite state for an entity.

```typescript
import { getSprite } from 'blecsd';

const sprite = getSprite(world, entity);
if (sprite) {
  console.log(`Frame ${sprite.frameIndex + 1} of ${sprite.frameCount}`);
}
```

**Returns:** `SpriteData | undefined`

### getCurrentFrame

Returns the current frame's 2D cell data.

```typescript
import { getCurrentFrame } from 'blecsd';

const frame = getCurrentFrame(world, entity);
if (frame) {
  for (const row of frame) {
    for (const cell of row) {
      // Render cell.char with cell.fg and cell.bg
    }
  }
}
```

**Returns:** `SpriteFrame | undefined`

### setFrame / nextFrame / prevFrame

Control frame index directly or step through frames.

```typescript
import { setFrame, nextFrame, prevFrame } from 'blecsd';

setFrame(world, entity, 2);   // Jump to frame 2 (clamped to valid range)
nextFrame(world, entity);      // Advance, wraps to 0 at end
prevFrame(world, entity);      // Go back, wraps to last at 0
```

### hasSprite / getEntitySpriteSheet / removeSprite

```typescript
import { hasSprite, getEntitySpriteSheet, removeSprite } from 'blecsd';

if (hasSprite(world, entity)) {
  const sheet = getEntitySpriteSheet(world, entity);
  console.log(sheet?.name);
}

removeSprite(world, entity); // Does not affect the sheet in the store
```

## Usage Example

```typescript
import { createWorld, addEntity } from 'blecsd';
import { registerSprite, setSprite, nextFrame, getCurrentFrame } from 'blecsd';

const world = createWorld();
const entity = addEntity(world);

// Register a simple animated sprite
const coinId = registerSprite({
  name: 'coin',
  frames: [
    [[{ char: 'O', fg: 0xffffff00 }]],
    [[{ char: 'o', fg: 0xffffff00 }]],
    [[{ char: '.', fg: 0xffffff00 }]],
    [[{ char: 'o', fg: 0xffffff00 }]],
  ],
});

// Assign to entity
setSprite(world, entity, coinId);

// Advance frame each tick
nextFrame(world, entity);

// Read current frame for rendering
const frame = getCurrentFrame(world, entity);
```

## Types

### SpriteCell

```typescript
interface SpriteCell {
  char: string;
  fg?: number;  // Packed RGBA
  bg?: number;  // Packed RGBA
}
```

### SpriteFrame

```typescript
type SpriteFrame = SpriteCell[][];  // [row][col]
```

### SpriteSheetData

```typescript
interface SpriteSheetData {
  readonly id: number;
  readonly name: string;
  readonly frames: readonly SpriteFrame[];
  readonly width: number;
  readonly height: number;
}
```

### SpriteData

```typescript
interface SpriteData {
  readonly frameIndex: number;
  readonly frameCount: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly spriteSheetId: number;
}
```

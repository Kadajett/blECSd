# Border Docking API

Automatic junction detection for adjacent borders.

## Overview

The border docking system detects when borders from different elements meet and automatically replaces corner characters with appropriate junction characters (T-junctions and crosses) for a cleaner appearance.

## Quick Start

```typescript
import {
  createBorderDockingContext,
  registerRectBorder,
  detectJunctions,
  applyJunctions,
  JUNCTION_SINGLE,
} from 'blecsd/core';

// Create docking context for the screen
const ctx = createBorderDockingContext(80, 24);

// Create a simple docking buffer
const buffer = {
  width: 80,
  height: 24,
  getCell(_x: number, _y: number) { return undefined; },
  setCell(_x: number, _y: number, _cell: { char: string; fg: number; bg: number }) {},
};

// Register borders for two adjacent boxes
registerRectBorder(ctx, 0, 0, 20, 10, 0x2500, 0x2502, 0xffffffff, 0x000000ff);
registerRectBorder(ctx, 19, 0, 20, 10, 0x2500, 0x2502, 0xffffffff, 0x000000ff);

// Detect junctions where borders meet
const junctions = detectJunctions(ctx);

// Apply junctions to your buffer
applyJunctions(buffer, junctions);
```

## Junction Character Sets

### JUNCTION_SINGLE

Single line box-drawing characters.

```typescript
import { JUNCTION_SINGLE } from 'blecsd/core';

// Characters included:
// ├ (teeRight)  - T pointing right
// ┤ (teeLeft)   - T pointing left
// ┬ (teeDown)   - T pointing down
// ┴ (teeUp)     - T pointing up
// ┼ (cross)     - 4-way intersection
// ─ (horizontal)
// │ (vertical)
```

### JUNCTION_DOUBLE

Double line box-drawing characters.

```typescript
import { JUNCTION_DOUBLE } from 'blecsd/core';

// Characters included:
// ╠ (teeRight)  - T pointing right
// ╣ (teeLeft)   - T pointing left
// ╦ (teeDown)   - T pointing down
// ╩ (teeUp)     - T pointing up
// ╬ (cross)     - 4-way intersection
// ═ (horizontal)
// ║ (vertical)
```

### JUNCTION_BOLD

Bold/thick line box-drawing characters.

```typescript
import { JUNCTION_BOLD } from 'blecsd/core';

// Characters included:
// ┣ (teeRight)  - T pointing right
// ┫ (teeLeft)   - T pointing left
// ┳ (teeDown)   - T pointing down
// ┻ (teeUp)     - T pointing up
// ╋ (cross)     - 4-way intersection
// ━ (horizontal)
// ┃ (vertical)
```

### JUNCTION_ASCII

ASCII fallback characters.

```typescript
import { JUNCTION_ASCII } from 'blecsd/core';

// All junctions use +
// horizontal uses -
// vertical uses |
```

## Context Management

### createBorderDockingContext

Create a new docking context.

```typescript
import { createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);

// With options
const ctx2 = createBorderDockingContext(80, 24, {
  enabled: false, // Disable junction detection
});
```

### clearDockingContext

Clear all registered edges.

```typescript
import { clearDockingContext, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
clearDockingContext(ctx);
```

### resizeDockingContext

Resize the context dimensions.

```typescript
import { resizeDockingContext, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
const resized = resizeDockingContext(ctx, 120, 40);
```

## Edge Registration

### registerEdge

Register a single border edge.

```typescript
import { registerEdge, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
// Register a horizontal edge
registerEdge(ctx, 10, 5, 'h', 0x2500, 0xffffffff, 0x000000ff);

// Register a vertical edge
registerEdge(ctx, 10, 6, 'v', 0x2502, 0xffffffff, 0x000000ff);

// Register a corner
registerEdge(ctx, 10, 5, 'c', 0, 0xffffffff, 0x000000ff);
```

Edge types:
- `'h'` - Horizontal edge
- `'v'` - Vertical edge
- `'c'` - Corner

### registerRectBorder

Register all edges for a rectangular border.

```typescript
import { registerRectBorder, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
// Register a box border
registerRectBorder(
  ctx,
  10, 5,      // x, y position
  20, 10,     // width, height
  0x2500,     // horizontal character
  0x2502,     // vertical character
  0xffffffff, // foreground color
  0x000000ff, // background color
);
```

## Junction Detection

### detectJunctions

Detect junctions where multiple edges meet.

```typescript
import { detectJunctions, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
const junctions = detectJunctions(ctx);

for (const junction of junctions) {
  console.log(`Junction at (${junction.x}, ${junction.y})`);
  console.log(`Character: ${String.fromCodePoint(junction.char)}`);
}
```

### detectAllJunctions

More aggressive junction detection that also checks extended connections.

```typescript
import { detectAllJunctions, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
const junctions = detectAllJunctions(ctx);
```

### getConnectionFlags

Get connection flags for a position.

```typescript
import { getConnectionFlags, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
const flags = getConnectionFlags(ctx, 10, 5);
// { left: true, top: false, right: true, bottom: true }
```

### getJunctionChar

Determine the appropriate junction character.

```typescript
import { getJunctionChar, JUNCTION_SINGLE } from 'blecsd/core';

const char = getJunctionChar(
  { left: true, top: true, right: true, bottom: false },
  JUNCTION_SINGLE,
);
// Returns 0x2534 (┴)
```

## Applying Junctions

### applyJunctions

Apply detected junctions to a buffer.

```typescript
import { applyJunctions, createBorderDockingContext, detectJunctions } from 'blecsd/core';

const ctx3 = createBorderDockingContext(80, 24);
const junctions3 = detectJunctions(ctx3);
const buffer3 = {
  width: 80,
  height: 24,
  getCell(_x: number, _y: number) { return undefined; },
  setCell(_x: number, _y: number, _cell: { char: string; fg: number; bg: number }) {},
};
applyJunctions(buffer3, junctions3);
```

The buffer must implement the `DockingBuffer` interface:

```typescript
interface DockingBuffer {
  readonly width: number;
  readonly height: number;
  getCell(x: number, y: number): DockingCell | undefined;
  setCell(x: number, y: number, cell: DockingCell): void;
}

interface DockingCell {
  char: string;
  fg: number;
  bg: number;
}
```

### getJunctionRenderData

Get junction data formatted for rendering.

```typescript
import { getJunctionRenderData, detectJunctions, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
const junctions = detectJunctions(ctx);
const renderData = getJunctionRenderData(junctions);
// Returns: Array<{ x, y, char: string, fg, bg }>
```

## Style Detection

### detectBorderStyle

Detect the border style from a character.

```typescript
import { detectBorderStyle } from 'blecsd/core';

detectBorderStyle(0x2500); // 'single' (─)
detectBorderStyle(0x2550); // 'double' (═)
detectBorderStyle(0x2501); // 'bold' (━)
detectBorderStyle(0x2d);   // 'ascii' (-)
detectBorderStyle(0x41);   // 'unknown' (A)
```

### getJunctionCharset

Get the junction charset for a style.

```typescript
import { getJunctionCharset } from 'blecsd/core';

const charset = getJunctionCharset('single');
// Returns JUNCTION_SINGLE
```

## Utility Functions

### isBorderChar

Check if a character is a border character.

```typescript
import { isBorderChar } from 'blecsd/core';

isBorderChar(0x2500); // true (─)
isBorderChar(0x41);   // false (A)
```

### isJunctionChar

Check if a character is a junction character.

```typescript
import { isJunctionChar } from 'blecsd/core';

isJunctionChar(0x253c); // true (┼)
isJunctionChar(0x2500); // false (─)
```

### getEdgeCount

Get the number of registered edge positions.

```typescript
import { getEdgeCount, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
const count = getEdgeCount(ctx);
```

### getEdgesAt

Get all edges at a position.

```typescript
import { getEdgesAt, createBorderDockingContext } from 'blecsd/core';

const ctx = createBorderDockingContext(80, 24);
const edges = getEdgesAt(ctx, 10, 5);
```

## Types

### BorderDockingContext

```typescript
interface BorderDockingContext {
  readonly width: number;
  readonly height: number;
  readonly edges: Map<string, BorderEdge[]>;
  enabled: boolean;
}
```

### BorderEdge

```typescript
interface BorderEdge {
  readonly x: number;
  readonly y: number;
  readonly type: 'h' | 'v' | 'c';
  readonly char: number;
  readonly fg: number;
  readonly bg: number;
  readonly style: BorderStyleType;
}
```

### Junction

```typescript
interface Junction {
  readonly x: number;
  readonly y: number;
  readonly char: number;
  readonly fg: number;
  readonly bg: number;
}
```

### ConnectionFlags

```typescript
interface ConnectionFlags {
  readonly left: boolean;
  readonly top: boolean;
  readonly right: boolean;
  readonly bottom: boolean;
}
```

### JunctionCharset

```typescript
interface JunctionCharset {
  readonly teeRight: number;  // ├
  readonly teeLeft: number;   // ┤
  readonly teeDown: number;   // ┬
  readonly teeUp: number;     // ┴
  readonly cross: number;     // ┼
  readonly horizontal: number; // ─
  readonly vertical: number;   // │
}
```

### BorderStyleType

```typescript
type BorderStyleType = 'single' | 'double' | 'bold' | 'ascii' | 'unknown';
```

## Example: Multi-Panel Layout

```typescript
import {
  createBorderDockingContext,
  registerRectBorder,
  detectJunctions,
  applyJunctions,
} from 'blecsd/core';

// Create context
const ctx = createBorderDockingContext(80, 24);

// Register three adjacent panels
// Left panel
registerRectBorder(ctx, 0, 0, 30, 24, 0x2500, 0x2502, 0xffffff, 0x000000);

// Top-right panel
registerRectBorder(ctx, 29, 0, 51, 12, 0x2500, 0x2502, 0xffffff, 0x000000);

// Bottom-right panel
registerRectBorder(ctx, 29, 11, 51, 13, 0x2500, 0x2502, 0xffffff, 0x000000);

// Detect and apply junctions
const junctions = detectJunctions(ctx);

// Junctions will be detected at:
// - (29, 0)  - top edge meets (┬)
// - (29, 11) - three panels meet (┼)
// - (29, 23) - bottom edge meets (┴)

const buffer = {
  width: 80,
  height: 24,
  getCell(_x: number, _y: number) { return undefined; },
  setCell(_x: number, _y: number, _cell: { char: string; fg: number; bg: number }) {},
};
applyJunctions(buffer, junctions);
```

## Performance Considerations

1. **Clear context between frames** if borders change: `clearDockingContext(ctx)`
2. **Register borders after layout** is calculated
3. **Detect junctions once per frame** after all borders are registered
4. **Cache results** if borders don't change between frames

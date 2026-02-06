# Border Docking API

Automatic junction detection for adjacent borders.

## Overview

The border docking system detects when borders from different elements meet and automatically replaces corner characters with appropriate junction characters (T-junctions and crosses) for a cleaner appearance.

## Quick Start

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createBorderDockingContext,
  registerRectBorder,
  detectJunctions,
  applyJunctions,
  JUNCTION_SINGLE,
} from 'blecsd';

// Create docking context for the screen
const ctx = createBorderDockingContext(80, 24);

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
import { JUNCTION_SINGLE } from 'blecsd';

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
import { JUNCTION_DOUBLE } from 'blecsd';

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
import { JUNCTION_BOLD } from 'blecsd';

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
import { JUNCTION_ASCII } from 'blecsd';

// All junctions use +
// horizontal uses -
// vertical uses |
```

## Context Management

### createBorderDockingContext

Create a new docking context.

<!-- blecsd-doccheck:ignore -->
```typescript
import { createBorderDockingContext } from 'blecsd';

const ctx = createBorderDockingContext(80, 24);

// With options
const ctx2 = createBorderDockingContext(80, 24, {
  enabled: false, // Disable junction detection
});
```

### clearDockingContext

Clear all registered edges.

<!-- blecsd-doccheck:ignore -->
```typescript
import { clearDockingContext } from 'blecsd';

clearDockingContext(ctx);
```

### resizeDockingContext

Resize the context dimensions.

<!-- blecsd-doccheck:ignore -->
```typescript
import { resizeDockingContext } from 'blecsd';

const resized = resizeDockingContext(ctx, 120, 40);
```

## Edge Registration

### registerEdge

Register a single border edge.

<!-- blecsd-doccheck:ignore -->
```typescript
import { registerEdge } from 'blecsd';

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

<!-- blecsd-doccheck:ignore -->
```typescript
import { registerRectBorder } from 'blecsd';

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

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectJunctions } from 'blecsd';

const junctions = detectJunctions(ctx);

for (const junction of junctions) {
  console.log(`Junction at (${junction.x}, ${junction.y})`);
  console.log(`Character: ${String.fromCodePoint(junction.char)}`);
}
```

### detectAllJunctions

More aggressive junction detection that also checks extended connections.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectAllJunctions } from 'blecsd';

const junctions = detectAllJunctions(ctx);
```

### getConnectionFlags

Get connection flags for a position.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getConnectionFlags } from 'blecsd';

const flags = getConnectionFlags(ctx, 10, 5);
// { left: true, top: false, right: true, bottom: true }
```

### getJunctionChar

Determine the appropriate junction character.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getJunctionChar, JUNCTION_SINGLE } from 'blecsd';

const char = getJunctionChar(
  { left: true, top: true, right: true, bottom: false },
  JUNCTION_SINGLE,
);
// Returns 0x2534 (┴)
```

## Applying Junctions

### applyJunctions

Apply detected junctions to a buffer.

<!-- blecsd-doccheck:ignore -->
```typescript
import { applyJunctions } from 'blecsd';

const junctions = detectJunctions(ctx);
applyJunctions(buffer, junctions);
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

<!-- blecsd-doccheck:ignore -->
```typescript
import { getJunctionRenderData } from 'blecsd';

const renderData = getJunctionRenderData(junctions);
// Returns: Array<{ x, y, char: string, fg, bg }>
```

## Style Detection

### detectBorderStyle

Detect the border style from a character.

<!-- blecsd-doccheck:ignore -->
```typescript
import { detectBorderStyle } from 'blecsd';

detectBorderStyle(0x2500); // 'single' (─)
detectBorderStyle(0x2550); // 'double' (═)
detectBorderStyle(0x2501); // 'bold' (━)
detectBorderStyle(0x2d);   // 'ascii' (-)
detectBorderStyle(0x41);   // 'unknown' (A)
```

### getJunctionCharset

Get the junction charset for a style.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getJunctionCharset } from 'blecsd';

const charset = getJunctionCharset('single');
// Returns JUNCTION_SINGLE
```

## Utility Functions

### isBorderChar

Check if a character is a border character.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isBorderChar } from 'blecsd';

isBorderChar(0x2500); // true (─)
isBorderChar(0x41);   // false (A)
```

### isJunctionChar

Check if a character is a junction character.

<!-- blecsd-doccheck:ignore -->
```typescript
import { isJunctionChar } from 'blecsd';

isJunctionChar(0x253c); // true (┼)
isJunctionChar(0x2500); // false (─)
```

### getEdgeCount

Get the number of registered edge positions.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getEdgeCount } from 'blecsd';

const count = getEdgeCount(ctx);
```

### getEdgesAt

Get all edges at a position.

<!-- blecsd-doccheck:ignore -->
```typescript
import { getEdgesAt } from 'blecsd';

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

<!-- blecsd-doccheck:ignore -->
```typescript
import {
  createBorderDockingContext,
  registerRectBorder,
  detectJunctions,
  applyJunctions,
} from 'blecsd';

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

applyJunctions(buffer, junctions);
```

## Performance Considerations

1. **Clear context between frames** if borders change: `clearDockingContext(ctx)`
2. **Register borders after layout** is calculated
3. **Detect junctions once per frame** after all borders are registered
4. **Cache results** if borders don't change between frames

# Element Clipping API

Element clipping system for handling overflow and content visibility.

## Overview

The clipping module provides:
- Overflow modes (HIDDEN, VISIBLE, SCROLL)
- Clip rectangle calculation and intersection
- Hierarchical clipping through parent chain
- Clip stack for nested rendering contexts

## Quick Start

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  createClipRect,
  getClipRect,
  isPointVisible,
  Overflow,
  setOverflow,
} from 'blecsd/core';

const world = createWorld();
const container = addEntity(world);
const entity = addEntity(world);
const x = 5; const y = 5;
// Set overflow mode on a container
setOverflow(world, container, Overflow.HIDDEN);

// Get the effective clip rect for rendering
const clipRect = getClipRect(world, entity);

// Check if a point is visible
if (isPointVisible(clipRect, x, y)) {
  // Point is within visible bounds
}
```

## Overflow Modes

### Overflow

Constants defining overflow behavior.

```typescript
import { Overflow } from 'blecsd/core';

Overflow.HIDDEN  // 0 - Content clipped at bounds (default)
Overflow.VISIBLE // 1 - Content visible beyond bounds
Overflow.SCROLL  // 2 - Content clipped but scrollable
```

### setOverflow

Sets the overflow mode for an entity.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { setOverflow, Overflow } from 'blecsd/core';

const world = createWorld();
const container = addEntity(world);
// Set single overflow mode for both axes
setOverflow(world, container, Overflow.HIDDEN);

// Set using options object
setOverflow(world, container, { overflow: Overflow.SCROLL });

// Set independent overflow per axis
setOverflow(world, container, {
  overflowX: Overflow.SCROLL,
  overflowY: Overflow.HIDDEN,
});
```

**Parameters:**
- `world` - The ECS world
- `eid` - The entity ID
- `options` - OverflowValue or ClippingOptions object

**Returns:** The entity ID for chaining.

### getOverflow

Gets the overflow mode for an entity.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getOverflow, Overflow } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const mode = getOverflow(world, entity);
if (mode === Overflow.HIDDEN) {
  // Content is clipped
}
```

**Returns:** The overflow value, or HIDDEN if no Clipping component.

### getClipping

Gets the full clipping data for an entity.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getClipping } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const clipping = getClipping(world, entity);
if (clipping) {
  console.log(clipping.overflow);   // General overflow
  console.log(clipping.overflowX);  // Horizontal overflow
  console.log(clipping.overflowY);  // Vertical overflow
}
```

**Returns:** ClippingData or undefined if no Clipping component.

### hasClipping

Checks if an entity has the Clipping component.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { hasClipping } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
if (hasClipping(world, entity)) {
  // Entity has clipping settings
}
```

## Clip Rectangles

### ClipRect

A rectangle defining visible bounds.

```typescript
interface ClipRect {
  readonly x1: number;  // Left edge (inclusive)
  readonly y1: number;  // Top edge (inclusive)
  readonly x2: number;  // Right edge (exclusive)
  readonly y2: number;  // Bottom edge (exclusive)
}
```

### createClipRect

Creates a clip rect from position and dimensions.

```typescript
import { createClipRect } from 'blecsd/core';

const rect = createClipRect(10, 20, 30, 40);
// { x1: 10, y1: 20, x2: 40, y2: 60 }
```

### createInfiniteClipRect

Creates a clip rect with no bounds.

```typescript
import { createInfiniteClipRect } from 'blecsd/core';

const rect = createInfiniteClipRect();
// { x1: -Infinity, y1: -Infinity, x2: Infinity, y2: Infinity }
```

### getClipRect

Gets the effective clip rect for an entity, considering parent hierarchy.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getClipRect } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const clipRect = getClipRect(world, entity);
const bounds = { x: 0, y: 0, width: 10, height: 5 };

// Use when rendering content
for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
  if (y < clipRect.y1 || y >= clipRect.y2) continue;
  for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
    if (x < clipRect.x1 || x >= clipRect.x2) continue;
    // Render cell at (x, y)
  }
}
```

The clip rect is computed by intersecting:
1. The entity's own bounds (if overflow is not VISIBLE)
2. All ancestor clip rects (recursively)

### getClipRectToAncestor

Gets the clip rect up to a specific ancestor.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { getClipRectToAncestor } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
const ancestor = addEntity(world);
// Get clip rect from entity up to (but not including) ancestor
const clipRect = getClipRectToAncestor(world, entity, ancestor);
```

## Clip Rect Operations

### intersectClipRects

Computes the intersection of two clip rects.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { createClipRect, getClipRect, intersectClipRects } from 'blecsd/core';

const world = createWorld();
const parent = addEntity(world);
const parentClip = getClipRect(world, parent);
const childClip = createClipRect(0, 0, 100, 100);
const finalClip = intersectClipRects(parentClip, childClip);
```

### isClipRectEmpty

Checks if a clip rect has no visible area.

```typescript
import { createClipRect, isClipRectEmpty } from 'blecsd/core';

const clipRect = createClipRect(0, 0, 10, 10);
if (isClipRectEmpty(clipRect)) {
  // Nothing to render
  return;
}
```

### isPointVisible

Checks if a point is within a clip rect.

```typescript
import { createClipRect, isPointVisible } from 'blecsd/core';

const clipRect = createClipRect(0, 0, 50, 50);
const mouseX = 10; const mouseY = 10;
if (isPointVisible(clipRect, mouseX, mouseY)) {
  // Handle click
}
```

### isRectVisible

Checks if a rectangle overlaps with a clip rect.

```typescript
import { createClipRect, isRectVisible } from 'blecsd/core';

const clipRect = createClipRect(0, 0, 50, 50);
const x = 10; const y = 10; const width = 20; const height = 20;
if (isRectVisible(clipRect, x, y, width, height)) {
  // Entity is at least partially visible
}
```

### clampToClipRect

Clamps a point to be within a clip rect.

```typescript
import { createClipRect, clampToClipRect } from 'blecsd/core';

const clipRect = createClipRect(0, 0, 50, 50);
const cursorX = 10; const cursorY = 10;
const { x, y } = clampToClipRect(clipRect, cursorX, cursorY);
```

### getClipRectWidth / getClipRectHeight

Gets the dimensions of a clip rect.

```typescript
import { createClipRect, getClipRectWidth, getClipRectHeight } from 'blecsd/core';

const clipRect = createClipRect(0, 0, 50, 50);
const width = getClipRectWidth(clipRect);
const height = getClipRectHeight(clipRect);
```

### shouldClipContent

Checks if an entity should clip its content.

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import { shouldClipContent } from 'blecsd/core';

const world = createWorld();
const entity = addEntity(world);
if (shouldClipContent(world, entity)) {
  // Apply clipping during render
}
```

## Clip Stack

For managing nested clip contexts during rendering.

### createClipStack

Creates a new clip stack.

```typescript
import { createClipStack } from 'blecsd/core';

let clipStack = createClipStack();
```

### pushClipRect

Pushes a clip rect onto the stack.

```typescript
import { pushClipRect, createClipRect } from 'blecsd/core';

let clipStack = createClipStack();

// When entering a container
clipStack = pushClipRect(clipStack, createClipRect(0, 0, 50, 50));

// Current clip is now intersection of all pushed rects
```

### popClipRect

Pops a clip rect from the stack.

```typescript
import { createClipStack, createClipRect, pushClipRect, popClipRect } from 'blecsd/core';

let clipStack = createClipStack();
clipStack = pushClipRect(clipStack, createClipRect(0, 0, 50, 50));
// When leaving a container
clipStack = popClipRect(clipStack);
```

### getCurrentClip

Gets the current effective clip rect from the stack.

```typescript
import { createClipStack, getCurrentClip } from 'blecsd/core';

const clipStack = createClipStack();
const currentClip = getCurrentClip(clipStack);
```

## Types

### ClippingData

```typescript
interface ClippingData {
  readonly overflow: OverflowValue;
  readonly overflowX: OverflowValue;
  readonly overflowY: OverflowValue;
}
```

### ClippingOptions

```typescript
interface ClippingOptions {
  overflow?: OverflowValue;
  overflowX?: OverflowValue;
  overflowY?: OverflowValue;
}
```

### ClipStack

```typescript
interface ClipStack {
  readonly stack: ClipRect[];
  readonly current: ClipRect;
}
```

### OverflowValue

```typescript
type OverflowValue = 0 | 1 | 2;  // HIDDEN | VISIBLE | SCROLL
```

## Integration Example

Complete rendering example with clipping:

```typescript
import { createWorld, addEntity } from 'blecsd/core';
import {
  createClipStack,
  createClipRect,
  getClipRect,
  getCurrentClip,
  isRectVisible,
  popClipRect,
  pushClipRect,
  shouldClipContent,
} from 'blecsd/core';

const world = createWorld();
const rootEntity = addEntity(world);

let clipStack = createClipStack();

// Check if entity is visible before rendering
const entityClip = getClipRect(world, rootEntity);
const clip = getCurrentClip(clipStack);
const bounds = { x: 0, y: 0, width: 80, height: 24 };

if (isRectVisible(clip, bounds.x, bounds.y, bounds.width, bounds.height)) {
  // Push this entity's clip if it clips content
  if (shouldClipContent(world, rootEntity)) {
    clipStack = pushClipRect(clipStack, entityClip);
  }

  // Render content with current clip
  const currentClip = getCurrentClip(clipStack);
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    if (y < currentClip.y1 || y >= currentClip.y2) continue;
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      if (x < currentClip.x1 || x >= currentClip.x2) continue;
      // Draw cell at (x, y)
    }
  }

  // Pop clip if we pushed one
  if (shouldClipContent(world, rootEntity)) {
    clipStack = popClipRect(clipStack);
  }
}
```

## Best Practices

1. **Default to HIDDEN** - The default overflow mode is HIDDEN. Only use VISIBLE when you explicitly want content to overflow.

2. **Use clip stack for rendering** - The clip stack maintains the nested clip context automatically during hierarchical rendering.

3. **Check visibility early** - Use `isRectVisible` to skip rendering entities that are completely clipped.

4. **Prefer getClipRect over manual calculation** - `getClipRect` handles the full ancestor chain and border offsets automatically.

5. **Handle independent axes** - Use `overflowX` and `overflowY` when you need different behavior for horizontal and vertical overflow (common for scrolling).
